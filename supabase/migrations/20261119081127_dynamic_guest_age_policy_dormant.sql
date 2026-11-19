SET LOCAL lock_timeout='5s';
-- Backend-first staging: this flag is status, not a runtime pricing switch.
-- Only the reviewed activation script may change it, together with engine bodies.
create schema guest_pricing_private;
revoke all on schema guest_pricing_private from public,anon,authenticated,service_role;
create table guest_pricing_private.release_state (
 id boolean primary key default true check(id), active boolean not null default false,
 activated_at timestamptz
);
alter table guest_pricing_private.release_state enable row level security;
revoke all on guest_pricing_private.release_state from public,anon,authenticated,service_role;
insert into guest_pricing_private.release_state(id,active) values(true,false);
create table guest_pricing_private.pre_activation_functions (
 signature text primary key, definition text not null, captured_at timestamptz not null default now()
);
alter table guest_pricing_private.pre_activation_functions enable row level security;
revoke all on guest_pricing_private.pre_activation_functions from public,anon,authenticated,service_role;
-- Deliberately public boolean-only status, not an admin operation or configuration data.
create function public.guest_age_meal_pricing_active() returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce((select active from guest_pricing_private.release_state where id),false);
$$;
revoke all on function public.guest_age_meal_pricing_active() from public;
grant execute on function public.guest_age_meal_pricing_active() to anon,authenticated,service_role;

-- Repository-only release: apply in staging and verify before any production rollout.
-- New quotes use the latest policy. Existing booking and payment snapshots are never rewritten.
create function public.validate_guest_age_bands(p_bands jsonb) returns boolean
language plpgsql immutable set search_path=public,pg_temp as $$
declare b jsonb; k text; expected_min integer:=0; lo integer; hi integer;
begin
 if jsonb_typeof(p_bands) is distinct from 'array' or jsonb_array_length(p_bands)<>3 then return false; end if;
 foreach k in array array['infant','child','adult'] loop
   if (select count(*) from jsonb_array_elements(p_bands) x where x->>'key'=k)<>1 then return false; end if;
   select x into b from jsonb_array_elements(p_bands) x where x->>'key'=k;
   if jsonb_typeof(b->'min_age') is distinct from 'number' or (b->>'min_age') !~ '^[0-9]+$' then return false; end if;
   lo:=(b->>'min_age')::integer;
   if lo<>expected_min or lo>150 then return false; end if;
   if k='adult' then
     if not b ? 'max_age' or b->'max_age'<>'null'::jsonb or b->>'accommodation_rule' is distinct from 'adult' then return false; end if;
   else
     if jsonb_typeof(b->'max_age') is distinct from 'number' or (b->>'max_age') !~ '^[0-9]+$' then return false; end if;
     hi:=(b->>'max_age')::integer;
     if hi<lo or hi>=150 or coalesce(b->>'accommodation_rule','') not in ('child','free') then return false; end if;
     expected_min:=hi+1;
   end if;
   if coalesce(b->>'meal_rule','') not in ('full','free') then return false; end if;
 end loop;
 return true;
exception when others then return false;
end $$;

create table public.guest_age_policy_versions (
 revision integer primary key check(revision>0),
 bands jsonb not null check(public.validate_guest_age_bands(bands)),
 updated_at timestamptz not null default now(),
 updated_by uuid
);
alter table public.guest_age_policy_versions enable row level security;
revoke all on public.guest_age_policy_versions from public,anon,authenticated;
grant select(revision,bands,updated_at) on public.guest_age_policy_versions to anon,authenticated;
grant select on public.guest_age_policy_versions to service_role;
create policy guest_age_policy_public_read on public.guest_age_policy_versions for select to anon,authenticated using(true);
create trigger zz_activity_log after insert or update or delete on public.guest_age_policy_versions
 for each row execute function public.record_activity_log();
create trigger guest_age_policy_immutable before update or delete on public.guest_age_policy_versions
 for each row execute function public.prevent_audit_log_changes();
insert into public.guest_age_policy_versions(revision,bands) values(1,'[
 {"key":"infant","min_age":0,"max_age":3,"accommodation_rule":"free","meal_rule":"free"},
 {"key":"child","min_age":4,"max_age":9,"accommodation_rule":"child","meal_rule":"full"},
 {"key":"adult","min_age":10,"max_age":null,"accommodation_rule":"adult","meal_rule":"full"}
]'::jsonb);

create function public.get_guest_age_policy() returns jsonb
language sql stable security invoker set search_path=public,pg_temp as $$
 select jsonb_build_object('revision',revision,'bands',bands,'updated_at',updated_at,'active',public.guest_age_meal_pricing_active())
 from public.guest_age_policy_versions order by revision desc limit 1;
$$;
revoke all on function public.get_guest_age_policy() from public;
grant execute on function public.get_guest_age_policy() to anon,authenticated,service_role;

-- Definer is restricted to this admin-checked append-only operation, not general table writes.
create function public.save_guest_age_policy(p_expected_revision integer,p_bands jsonb) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare current_revision integer;
begin
 if auth.uid() is null or not coalesce(public.is_admin_new(),false) then raise exception 'Administrator required'; end if;
 -- Keep configuration writes from claiming live behavior before frontend activation.
 perform 1 from guest_pricing_private.release_state where id and active for share;
 if not found then raise exception 'GUEST_PRICING_NOT_ACTIVE: age and meal pricing are staged; publish and activate the matching booking frontend before editing'; end if;
 if not public.validate_guest_age_bands(p_bands) then raise exception 'Age bands must be complete, contiguous and non-overlapping with valid pricing rules'; end if;
 perform pg_advisory_xact_lock(hashtext('guest_age_policy_versions'));
 select max(revision) into current_revision from public.guest_age_policy_versions;
 if p_expected_revision is distinct from current_revision then raise exception 'AGE_POLICY_CHANGED: refresh and review before saving'; end if;
 insert into public.guest_age_policy_versions(revision,bands,updated_by) values(current_revision+1,p_bands,auth.uid());
 return public.get_guest_age_policy();
end $$;
revoke all on function public.save_guest_age_policy(integer,jsonb) from public,anon;
grant execute on function public.save_guest_age_policy(integer,jsonb) to authenticated;

-- Counts remain in their original bands in storage. This helper calculates only chargeable units.
create function public.guest_policy_charge_count(p_kind text,p_adults integer,p_children integer,p_infants integer)
returns integer language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare policy jsonb:=public.get_guest_age_policy(); b jsonb; n integer; result integer:=0;
begin
 if p_adults is null or p_children is null or p_infants is null or p_adults<1 or p_children<0 or p_infants<0 or p_adults+p_children+p_infants>100 then raise exception 'Invalid guest counts'; end if;
 if policy is null then raise exception 'Guest age policy is unavailable'; end if;
 if p_kind not in ('child','meal') then raise exception 'Invalid charge type'; end if;
 for b in select value from jsonb_array_elements(policy->'bands') loop
   n:=case b->>'key' when 'adult' then p_adults when 'child' then p_children when 'infant' then p_infants end;
   if (p_kind='child' and b->>'accommodation_rule'='child') or (p_kind='meal' and b->>'meal_rule'='full') then result:=result+n; end if;
 end loop;
 return result;
end $$;
revoke all on function public.guest_policy_charge_count(text,integer,integer,integer) from public;
grant execute on function public.guest_policy_charge_count(text,integer,integer,integer) to anon,authenticated,service_role;

create function public.attach_guest_age_policy(p_variants jsonb,p_adults integer,p_children integer,p_infants integer)
returns jsonb language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare result jsonb:='[]'::jsonb; v jsonb; policy jsonb:=public.get_guest_age_policy();
begin
 if policy is null then raise exception 'Guest age policy is unavailable'; end if;
 for v in select value from jsonb_array_elements(p_variants) loop
   result:=result||jsonb_build_array(v||jsonb_build_object(
    'guest_age_policy',policy,'actual_guest_count',p_adults+p_children+p_infants,
    'adults_count',p_adults,'children_count',p_children,'infants_count',p_infants,
    'chargeable_meal_guests',public.guest_policy_charge_count('meal',p_adults,p_children,p_infants),
    'chargeable_children',public.guest_policy_charge_count('child',p_adults,p_children,p_infants),
    'quote_fingerprint',md5(jsonb_build_array(v->>'quote_fingerprint',policy,p_adults,p_children,p_infants)::text)));
 end loop;
 return result;
end $$;
revoke all on function public.attach_guest_age_policy(jsonb,integer,integer,integer) from public;
grant execute on function public.attach_guest_age_policy(jsonb,integer,integer,integer) to anon,authenticated,service_role;

-- Live pricing entrypoints intentionally remain unchanged in this migration.
-- Activate only with the matching published frontend via
-- scripts/activate-guest-age-meal-pricing.sql after regression testing.

-- The old aggregate meal function remains for existing callers: its p_guests_count
-- means chargeable guests. New callers with category counts use this explicit adapter.
create function public.calculate_guest_meal_plan_cost(p_meal_plan_code text,p_adults_count integer,p_children_count integer,p_infants_count integer,p_nights integer,p_preferred_variant text default 'veg')
returns table(meal_cost numeric,included_meals jsonb,meal_breakdown jsonb)
language plpgsql stable security invoker set search_path=public,pg_temp as $$
begin
 if p_nights is null or p_nights<1 or p_nights>365 then raise exception 'Invalid stay length'; end if;
 return query select * from public.calculate_meal_plan_cost(p_meal_plan_code,public.guest_policy_charge_count('meal',p_adults_count,p_children_count,p_infants_count),p_nights,p_preferred_variant);
end $$;
revoke all on function public.calculate_guest_meal_plan_cost(text,integer,integer,integer,integer,text) from public;
grant execute on function public.calculate_guest_meal_plan_cost(text,integer,integer,integer,integer,text) to anon,authenticated,service_role;
