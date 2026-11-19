SET LOCAL lock_timeout='5s';
-- Repository-only change. Default full child rates and global free-infant rule are preserved.
-- No booking/payment snapshots, adult catalogue prices or historical versions are rewritten.
create function public.validate_meal_age_pricing_rules(p_rules jsonb) returns boolean
language plpgsql immutable set search_path=public,pg_temp as $$
declare plan text; band text; r jsonb; n numeric;
begin
 if jsonb_typeof(p_rules) is distinct from 'array' or jsonb_array_length(p_rules)<>12 then return false; end if;
 foreach plan in array array['RO','BB','HB','FB'] loop
  foreach band in array array['adult','child','infant'] loop
   if (select count(*) from jsonb_array_elements(p_rules) x where x->>'plan_code'=plan and x->>'band_key'=band)<>1 then return false; end if;
   select x into r from jsonb_array_elements(p_rules) x where x->>'plan_code'=plan and x->>'band_key'=band;
   if coalesce(r->>'mode','') not in ('full','percentage','fixed','free') then return false; end if;
   if plan='RO' and r->>'mode'<>'free' then return false; end if;
   if plan<>'RO' and band='adult' and r->>'mode'<>'full' then return false; end if;
   if r->>'mode' in ('full','free') then
    if r->'value' is not null and r->'value'<>'null'::jsonb then return false; end if;
   else
    if jsonb_typeof(r->'value') is distinct from 'number' then return false; end if;
    n:=(r->>'value')::numeric;
    if n<0 or n>99999999.99 or n<>round(n,2) or (r->>'mode'='percentage' and n>100) then return false; end if;
   end if;
  end loop;
 end loop;
 return true;
exception when others then return false;
end $$;
create table public.meal_age_pricing_versions (
 revision integer primary key check(revision>0),rules jsonb not null check(public.validate_meal_age_pricing_rules(rules)),
 updated_at timestamptz not null default now(),updated_by uuid
);
alter table public.meal_age_pricing_versions enable row level security;
revoke all on public.meal_age_pricing_versions from public,anon,authenticated;
grant select(revision,rules,updated_at) on public.meal_age_pricing_versions to anon,authenticated;
grant select on public.meal_age_pricing_versions to service_role;
create policy meal_age_pricing_read on public.meal_age_pricing_versions for select to anon,authenticated using(true);
create trigger zz_activity_log after insert or update or delete on public.meal_age_pricing_versions for each row execute function public.record_activity_log();
create trigger meal_age_pricing_immutable before update or delete on public.meal_age_pricing_versions for each row execute function public.prevent_audit_log_changes();
insert into public.meal_age_pricing_versions(revision,rules)
 select 1,jsonb_agg(jsonb_build_object('plan_code',plan,'band_key',band,'mode',case when plan='RO' then 'free' else 'full' end,'value',null) order by plan,band)
 from unnest(array['RO','BB','HB','FB']) plan cross join unnest(array['adult','child','infant']) band;
create function public.get_meal_age_pricing_policy() returns jsonb
language sql stable security invoker set search_path=public,pg_temp as $$
 select jsonb_build_object('revision',revision,'rules',rules,'updated_at',updated_at,'active',public.guest_age_meal_pricing_active()) from public.meal_age_pricing_versions order by revision desc limit 1;
$$;
revoke all on function public.get_meal_age_pricing_policy() from public;
grant execute on function public.get_meal_age_pricing_policy() to anon,authenticated,service_role;
create function public.save_meal_age_pricing_policy(p_expected_revision integer,p_rules jsonb,p_expected_guest_age_revision integer,p_expected_meal_workspace_revision bigint) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare previous integer; guest_revision integer; meal_revision bigint;
begin
 if auth.uid() is null or not coalesce(public.is_admin_new(),false) then raise exception 'Administrator required' using errcode='42501'; end if;
 -- Keep configuration writes from claiming live behavior before frontend activation.
 perform 1 from guest_pricing_private.release_state where id and active for share;
 if not found then raise exception 'GUEST_PRICING_NOT_ACTIVE: age and meal pricing are staged; publish and activate the matching booking frontend before editing'; end if;
 if not public.validate_meal_age_pricing_rules(p_rules) then raise exception 'Invalid meal age pricing: configure all plans and bands, retain linked adult prices and free RO'; end if;
 select revision into meal_revision from meal_pricing_private.state where id for share;
 if p_expected_meal_workspace_revision is distinct from meal_revision then raise exception 'MEAL_CATALOGUE_CHANGED: reload adult prices and review before saving'; end if;
 perform pg_advisory_xact_lock(hashtext('guest_age_policy_versions'));
 select max(revision) into guest_revision from public.guest_age_policy_versions;
 if p_expected_guest_age_revision is distinct from guest_revision then raise exception 'GUEST_AGE_POLICY_CHANGED: reload age bands and review before saving'; end if;
 perform pg_advisory_xact_lock(hashtext('meal_age_pricing_versions'));
 select max(revision) into previous from public.meal_age_pricing_versions;
 if p_expected_revision is distinct from previous then raise exception 'MEAL_AGE_POLICY_CHANGED: refresh before saving'; end if;
 insert into public.meal_age_pricing_versions(revision,rules,updated_by) values(previous+1,p_rules,auth.uid());
 return public.get_meal_age_pricing_policy();
end $$;
revoke all on function public.save_meal_age_pricing_policy(integer,jsonb,integer,bigint) from public,anon;
grant execute on function public.save_meal_age_pricing_policy(integer,jsonb,integer,bigint) to authenticated;

-- Fixed rates are INR/person/occupied night for the selected plan, not per meal item.
-- Percentage uses that night's current effective adult plan amount. Round derived
-- percentage/fixed unit prices once to paise, then multiply persons. Full preserves
-- the existing adult amount exactly (including legacy numerical representation).
create function public.calculate_meal_age_charge(p_plan_code text,p_adult_rate numeric,p_adults integer,p_children integer,p_infants integer)
returns jsonb language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare policy jsonb:=public.get_meal_age_pricing_policy(); age_policy jsonb:=public.get_guest_age_policy();
 band jsonb; rule jsonb; n integer; unit numeric; total numeric:=0; charged integer:=0; rows jsonb:='[]'; forced_free boolean;
begin
 perform public.guest_policy_charge_count('meal',p_adults,p_children,p_infants);
 if policy is null or age_policy is null then raise exception 'Meal age policy unavailable'; end if;
 if p_plan_code is null or p_plan_code not in ('RO','BB','HB','FB') or p_adult_rate is null or p_adult_rate<0 or p_adult_rate::text in ('NaN','Infinity','-Infinity') then raise exception 'Invalid adult meal rate'; end if;
 for band in select value from jsonb_array_elements(age_policy->'bands') loop
  n:=case band->>'key' when 'adult' then p_adults when 'child' then p_children when 'infant' then p_infants end;
  select x into rule from jsonb_array_elements(policy->'rules') x where x->>'plan_code'=p_plan_code and x->>'band_key'=band->>'key';
  if rule is null then raise exception 'Missing meal age rule'; end if;
  forced_free:=band->>'meal_rule'='free' or p_plan_code='RO';
  unit:=case when forced_free or rule->>'mode'='free' then 0
    when rule->>'mode'='full' then p_adult_rate
    when rule->>'mode'='percentage' then round(p_adult_rate*(rule->>'value')::numeric/100,2)
    when rule->>'mode'='fixed' then round((rule->>'value')::numeric,2) end;
  if unit is null then raise exception 'Invalid meal age rule'; end if;
  total:=total+unit*n;
  if unit>0 then charged:=charged+n; end if;
  rows:=rows||jsonb_build_array(jsonb_build_object('band_key',band->>'key','count',n,'min_age',band->'min_age','max_age',band->'max_age',
   'mode',rule->>'mode','value',rule->'value','global_free_override',forced_free,'unit_price',unit,'total',unit*n));
 end loop;
 return jsonb_build_object('plan_code',p_plan_code,'adult_plan_rate',p_adult_rate,'meal_age_policy_revision',policy->'revision',
 'guest_age_policy_revision',age_policy->'revision','bands',rows,'total',total,'chargeable_guest_count',charged,'currency','INR','basis','person_per_occupied_night');
end $$;
revoke all on function public.calculate_meal_age_charge(text,numeric,integer,integer,integer) from public;
grant execute on function public.calculate_meal_age_charge(text,numeric,integer,integer,integer) to anon,authenticated,service_role;

-- Opaque legacy inclusive room prices cannot safely have a meal percentage/fixed
-- deduction inferred. Refuse a non-default applicable rule instead of inventing a split.
create function public.assert_legacy_meal_age_supported(p_plan_code text,p_adults integer,p_children integer,p_infants integer)
returns void language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare policy jsonb:=public.get_meal_age_pricing_policy(); age_policy jsonb:=public.get_guest_age_policy(); band jsonb; rule jsonb; n integer;
begin
 if policy is null or age_policy is null then raise exception 'Meal age policy unavailable'; end if;
 if p_plan_code='RO' then return; end if;
 for band in select value from jsonb_array_elements(age_policy->'bands') loop
  n:=case band->>'key' when 'adult' then p_adults when 'child' then p_children when 'infant' then p_infants end;
  if n=0 then continue; end if;
  if band->>'meal_rule'='free' then
   if band->>'key'='infant' and band->>'accommodation_rule'='free' then continue; end if;
   raise exception 'MEAL_AGE_BASIS_UNVERIFIED: free meals cannot be separated from this legacy inclusive rate';
  end if;
  select x into rule from jsonb_array_elements(policy->'rules') x where x->>'plan_code'=p_plan_code and x->>'band_key'=band->>'key';
  if rule is null or (rule->>'mode'<>'full' and not(rule->>'mode'='percentage' and (rule->>'value')::numeric=100)) then
   raise exception 'MEAL_AGE_BASIS_UNVERIFIED: this legacy rate has no verified adult meal split';
  end if;
 end loop;
end $$;
revoke all on function public.assert_legacy_meal_age_supported(text,integer,integer,integer) from public;
grant execute on function public.assert_legacy_meal_age_supported(text,integer,integer,integer) to anon,authenticated,service_role;

-- Used only by plan enumeration: hide an unsafe plan but keep safe RO/other plans.
create function public.legacy_meal_age_supported(p_plan_code text,p_adults integer,p_children integer,p_infants integer)
returns boolean language plpgsql stable security invoker set search_path=public,pg_temp as $$
begin
 perform public.assert_legacy_meal_age_supported(p_plan_code,p_adults,p_children,p_infants);
 return true;
exception when raise_exception then
 if SQLERRM like 'MEAL_AGE_BASIS_UNVERIFIED:%' then return false; end if;
 raise;
end $$;
revoke all on function public.legacy_meal_age_supported(text,integer,integer,integer) from public;
grant execute on function public.legacy_meal_age_supported(text,integer,integer,integer) to anon,authenticated,service_role;

-- Engine patches and snapshot wrapper are intentionally deferred to
-- scripts/activate-guest-age-meal-pricing.sql. Helpers below are not live pricing.

create or replace function public.calculate_guest_meal_plan_cost(p_meal_plan_code text,p_adults_count integer,p_children_count integer,p_infants_count integer,p_nights integer,p_preferred_variant text default 'veg')
returns table(meal_cost numeric,included_meals jsonb,meal_breakdown jsonb)
language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare adult record; charged jsonb;
begin
 if p_nights is null or p_nights<1 or p_nights>365 then raise exception 'Invalid stay length'; end if;
 select * into adult from public.calculate_meal_plan_cost(p_meal_plan_code,1,1,p_preferred_variant);
 charged:=public.calculate_meal_age_charge(p_meal_plan_code,adult.meal_cost,p_adults_count,p_children_count,p_infants_count);
 return query select (charged->>'total')::numeric*p_nights,adult.included_meals,
 jsonb_build_array(jsonb_build_object('adult_catalogue_breakdown',adult.meal_breakdown,'age_pricing',charged,'nights',p_nights,'total',(charged->>'total')::numeric*p_nights));
end $$;
