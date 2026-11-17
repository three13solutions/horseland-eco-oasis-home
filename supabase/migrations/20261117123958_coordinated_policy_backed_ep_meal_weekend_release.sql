-- Atomic policy-backed shared meal, EP and weekend release.
-- INERT STAGING ONLY: no public catalogue, plan or quote changes on install or save.
-- Publication requires a separately reviewed activation migration; none is provided here.
-- Guest-specific unequal alternatives are deliberately not activated until checkout supports them.
create schema if not exists meal_pricing_private;
revoke all on schema meal_pricing_private from public, anon, authenticated;
create table meal_pricing_private.state(id boolean primary key default true check(id), revision bigint not null default 1);
insert into meal_pricing_private.state values(true,1);
create table meal_pricing_private.audit(id bigint generated always as identity primary key, actor uuid, changed_at timestamptz not null default now(), reason text not null, details jsonb not null);
revoke all on all tables in schema meal_pricing_private from public,anon,authenticated;
-- Keep all seed/source snapshots consistent within the migration transaction.
lock table public.meals, public.meal_plan_rules in share mode;
create table meal_pricing_private.staged_meals as select id,title,meal_type,variant,price,is_active,updated_at from public.meals;
alter table meal_pricing_private.staged_meals add primary key(id);
create table meal_pricing_private.staged_plans as select id,plan_code,plan_name,included_meal_types,preferred_variant,supplement_per_person_inr,supplement_effective_from,supplement_period,supplement_guest_basis,supplement_pricing_enabled,display_order,is_active,updated_at from public.meal_plan_rules where plan_code in ('RO','BB','HB','FB');
alter table meal_pricing_private.staged_plans add primary key(id);
alter table meal_pricing_private.staged_plans add column meal_choice_groups jsonb not null default '[]';
-- Exact original snapshots retained for future conflict-aware activation, not applied automatically.
create table meal_pricing_private.source_snapshot as select now() captured_at, jsonb_build_object('meals',(select jsonb_agg(to_jsonb(m)) from public.meals m),'plans',(select jsonb_agg(to_jsonb(p)) from public.meal_plan_rules p)) data;
revoke all on all tables in schema meal_pricing_private from public,anon,authenticated;

-- ECMAScript String.trim whitespace set, matching the admin parser exactly.
create function meal_pricing_private.has_text(p_text text) returns boolean language sql immutable set search_path='' as $$
 select coalesce(length(btrim(p_text,U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'))>0,false);
$$;

create function meal_pricing_private.validate_catalogue() returns void language plpgsql set search_path='' as $$
begin
 if exists(select 1 from meal_pricing_private.staged_meals where price is null or price::text in ('NaN','Infinity','-Infinity') or price<0 or price>1000000 or price<>round(price,2) or title is null or not meal_pricing_private.has_text(title) or length(title)>500 or meal_type not in ('breakfast','lunch','dinner','high_tea') or meal_type is null or variant not in ('veg','non_veg','jain') or variant is null or is_active is null or updated_at is null) then
  raise exception 'Invalid meal catalogue: every meal needs a title, supported type/variant, finite nonnegative two-decimal price, status and timestamp';
 end if;
 if exists(select 1 from meal_pricing_private.staged_plans where not meal_pricing_private.has_text(plan_name) or length(plan_name)>500) then raise exception 'Invalid meal plan name: provide nonblank text of at most 500 characters';end if;
end $$;
select meal_pricing_private.validate_catalogue();

create function meal_pricing_private.assert_admin() returns void language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not coalesce(public.is_admin_new(),false) then raise exception 'Administrator access required' using errcode='42501'; end if;
end $$;

create function meal_pricing_private.group_total(p_groups jsonb) returns numeric language plpgsql stable set search_path='' as $$
declare g jsonb; mid text; seen uuid[]:='{}'; group_ids text[]:='{}'; amount numeric; first_amount numeric; total numeric:=0; m meal_pricing_private.staged_meals%rowtype;
begin
 if jsonb_typeof(p_groups) is distinct from 'array' or jsonb_array_length(p_groups)>16 then raise exception 'Meal groups must be an array of at most 16 groups';end if;
 for g in select value from jsonb_array_elements(p_groups) loop
  if jsonb_typeof(g) is distinct from 'object' or jsonb_typeof(g->'id') is distinct from 'string' or jsonb_typeof(g->'label') is distinct from 'string' or not meal_pricing_private.has_text(g->>'id') or length(g->>'id')>100 or not meal_pricing_private.has_text(g->>'label') or length(g->>'label')>200 or (g->>'id')=any(group_ids) then raise exception 'Each group needs a unique ID and label';end if;
  group_ids:=array_append(group_ids,g->>'id');
  if jsonb_typeof(g->'meal_ids') is distinct from 'array' or jsonb_array_length(g->'meal_ids') not between 1 and 50 then raise exception 'Each AND group needs 1 to 50 OR alternatives';end if;
  first_amount:=null;
  for mid in select jsonb_array_elements_text(g->'meal_ids') loop
   if mid::uuid=any(seen) then raise exception 'A meal cannot be duplicated across a plan';end if;
   seen:=array_append(seen,mid::uuid);
   select * into m from meal_pricing_private.staged_meals where id=mid::uuid and is_active;
   if not found then raise exception 'Linked meal is missing or inactive';end if;
   amount:=m.price;
   if amount is null or amount<0 or amount>1000000 or amount::text in ('NaN','Infinity','-Infinity') or amount<>round(amount,2) then raise exception 'Invalid meal price';end if;
   if first_amount is null then first_amount:=amount; elsif first_amount<>amount then raise exception 'OR alternatives must have equal prices until individual guest selection is available. Update the alternatives together or revise the group.';end if;
  end loop;
  total:=total+first_amount;
 end loop;
 return total;
end $$;

create function meal_pricing_private.workspace() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('mode','staged','revision',(select revision from meal_pricing_private.state where id),
 'meals',coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',title,'meal_type',meal_type,'variant',variant,'price',price,'is_active',is_active,'updated_at',updated_at) order by meal_type,variant,title,id) from meal_pricing_private.staged_meals),'[]'::jsonb),
 'plans',coalesce((select jsonb_agg(jsonb_build_object('id',id,'plan_code',plan_code,'plan_name',plan_name,'groups',meal_choice_groups,'supplement_per_person_inr',supplement_per_person_inr,'is_active',is_active) order by display_order,id) from meal_pricing_private.staged_plans where plan_code in ('RO','BB','HB','FB')),'[]'::jsonb));
$$;

create function public.get_meal_pricing_workspace() returns jsonb language plpgsql security definer set search_path='' as $$
begin perform meal_pricing_private.assert_admin(); return meal_pricing_private.workspace();end $$;

create function meal_pricing_private.refresh_plan(p_id uuid) returns void language plpgsql set search_path='' as $$
declare p meal_pricing_private.staged_plans%rowtype; total numeric; kinds jsonb;
begin
 select * into strict p from meal_pricing_private.staged_plans where id=p_id;
 total:=meal_pricing_private.group_total(p.meal_choice_groups);
 if p.plan_code='RO' and jsonb_array_length(p.meal_choice_groups)<>0 then raise exception 'Room Only must not contain meals';end if;
 if p.plan_code<>'RO' and p.is_active and jsonb_array_length(p.meal_choice_groups)=0 then raise exception 'Active meal plan must contain meals';end if;
 select coalesce(jsonb_agg(kind order by kind),'[]'::jsonb) into kinds from (select distinct m.meal_type kind from jsonb_array_elements(p.meal_choice_groups) g cross join lateral jsonb_array_elements_text(g->'meal_ids') x join meal_pricing_private.staged_meals m on m.id=x.value::uuid) q;
 update meal_pricing_private.staged_plans set supplement_per_person_inr=total, supplement_effective_from=(now() at time zone 'Asia/Kolkata')::date,
 supplement_period='per_night',supplement_guest_basis='all_guests',supplement_pricing_enabled=true,included_meal_types=kinds,updated_at=clock_timestamp() where id=p_id;
end $$;

-- Seed only unique active catalogue matches. Abort rather than choose an arbitrary meal.
do $$
declare p record; kind text; kinds jsonb; ids jsonb; groups jsonb;
begin
 for p in select * from meal_pricing_private.staged_plans loop
  groups:='[]'; kinds:=p.included_meal_types;
  if p.plan_code='FB' and not kinds @> '["high_tea"]'::jsonb then kinds:=kinds||'"high_tea"'::jsonb;end if;
  for kind in select jsonb_array_elements_text(kinds) loop
   if exists(select variant from meal_pricing_private.staged_meals where is_active and meal_type=kind group by variant having count(*)>1) then raise exception 'Ambiguous active meal catalogue for %',kind;end if;
   select jsonb_agg(id order by variant,id) into ids from meal_pricing_private.staged_meals where is_active and meal_type=kind;
   if ids is null then raise exception 'No active meal for %',kind;end if;
   groups:=groups||jsonb_build_array(jsonb_build_object('id',kind,'label',initcap(replace(kind,'_',' ')),'meal_ids',ids));
  end loop;
  perform meal_pricing_private.group_total(groups);
  update meal_pricing_private.staged_plans set meal_choice_groups=groups where id=p.id;
  perform meal_pricing_private.refresh_plan(p.id);
 end loop;
end $$;

create function public.save_shared_meal_prices(p_prices jsonb,p_expected_revision bigint,p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare rev bigint; e jsonb; ids uuid[]:='{}'; mid uuid; v_price numeric; pid uuid; before_state jsonb;
begin
 perform meal_pricing_private.assert_admin();
 select revision into rev from meal_pricing_private.state where id for update;
 if p_expected_revision is null or rev<>p_expected_revision then raise exception 'Meal prices changed since you opened this screen. Reload and review again.' using errcode='40001';end if;
 if not meal_pricing_private.has_text(p_reason) or length(p_reason)>2000 then raise exception 'A reason is required';end if;
 if jsonb_typeof(p_prices) is distinct from 'array' or jsonb_array_length(p_prices) not between 1 and 100 then raise exception 'Provide 1 to 100 price changes';end if;
 before_state:=meal_pricing_private.workspace();
 for e in select value from jsonb_array_elements(p_prices) loop
  mid:=(e->>'meal_id')::uuid; v_price:=(e->>'price')::numeric;
  if mid is null or mid=any(ids) or v_price is null or v_price<0 or v_price>1000000 or v_price::text in ('NaN','Infinity','-Infinity') or v_price<>round(v_price,2) then raise exception 'Invalid or duplicate meal price change';end if;
  ids:=array_append(ids,mid);
  update meal_pricing_private.staged_meals set price=v_price,updated_at=clock_timestamp() where id=mid;
  if not found then raise exception 'Meal not found';end if;
 end loop;
 for pid in select p.id from meal_pricing_private.staged_plans p where exists(select 1 from jsonb_array_elements(p.meal_choice_groups) g cross join lateral jsonb_array_elements_text(g->'meal_ids') x where x.value::uuid=any(ids)) order by p.id loop perform meal_pricing_private.refresh_plan(pid);end loop;
 update meal_pricing_private.state set revision=revision+1 where id;
 insert into meal_pricing_private.audit(actor,reason,details) values(auth.uid(),p_reason,jsonb_build_object('action','prices','before',before_state,'changes',p_prices,'after',meal_pricing_private.workspace()));
 return meal_pricing_private.workspace();
end $$;

create function public.save_shared_meal_price(p_meal_id uuid,p_price numeric,p_expected_revision bigint,p_reason text) returns jsonb language sql security invoker set search_path='' as $$
 select public.save_shared_meal_prices(jsonb_build_array(jsonb_build_object('meal_id',p_meal_id,'price',p_price)),p_expected_revision,p_reason);
$$;
create function public.save_meal_plan_groups(p_plan_id uuid,p_groups jsonb,p_expected_revision bigint,p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare rev bigint; before_state jsonb;
begin
 perform meal_pricing_private.assert_admin();
 select revision into rev from meal_pricing_private.state where id for update;
 if p_expected_revision is null or rev<>p_expected_revision then raise exception 'Meal prices changed since you opened this screen. Reload and review again.' using errcode='40001';end if;
 if not meal_pricing_private.has_text(p_reason) or length(p_reason)>2000 then raise exception 'A reason is required';end if;
 perform meal_pricing_private.group_total(p_groups);
 before_state:=meal_pricing_private.workspace();
 update meal_pricing_private.staged_plans set meal_choice_groups=p_groups where id=p_plan_id;
 if not found then raise exception 'Meal plan not found';end if;
 perform meal_pricing_private.refresh_plan(p_plan_id);
 update meal_pricing_private.state set revision=revision+1 where id;
 insert into meal_pricing_private.audit(actor,reason,details) values(auth.uid(),p_reason,jsonb_build_object('action','groups','before',before_state,'plan_id',p_plan_id,'after',meal_pricing_private.workspace()));
 return meal_pricing_private.workspace();
end $$;
revoke all on all functions in schema meal_pricing_private from public,anon,authenticated;
revoke all on function public.get_meal_pricing_workspace(), public.save_shared_meal_prices(jsonb,bigint,text), public.save_shared_meal_price(uuid,numeric,bigint,text), public.save_meal_plan_groups(uuid,jsonb,bigint,text) from public,anon;
grant execute on function public.get_meal_pricing_workspace(), public.save_shared_meal_prices(jsonb,bigint,text), public.save_shared_meal_price(uuid,numeric,bigint,text), public.save_meal_plan_groups(uuid,jsonb,bigint,text) to authenticated;

-- Availability changes use the same reviewed CAS workflow as composition changes.
create function public.set_meal_plan_active(p_plan_id uuid,p_is_active boolean,p_expected_revision bigint,p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare rev bigint; before_state jsonb; groups jsonb;
begin
 perform meal_pricing_private.assert_admin();
 select revision into rev from meal_pricing_private.state where id for update;
 if p_expected_revision is null or rev<>p_expected_revision then raise exception 'Meal prices changed since you opened this screen. Reload and review again.' using errcode='40001';end if;
 if p_is_active is null then raise exception 'Active status is required';end if;
 if not meal_pricing_private.has_text(p_reason) or length(p_reason)>2000 then raise exception 'A reason is required';end if;
 select meal_choice_groups into groups from meal_pricing_private.staged_plans where id=p_plan_id and plan_code in ('RO','BB','HB','FB');
 if not found then raise exception 'Canonical meal plan not found';end if;
 if p_is_active then perform meal_pricing_private.group_total(groups);end if;
 before_state:=meal_pricing_private.workspace();
 update meal_pricing_private.staged_plans set is_active=p_is_active,updated_at=clock_timestamp() where id=p_plan_id;
 if p_is_active then perform meal_pricing_private.refresh_plan(p_plan_id);end if;
 update meal_pricing_private.state set revision=revision+1 where id;
 insert into meal_pricing_private.audit(actor,reason,details) values(auth.uid(),p_reason,jsonb_build_object('action','status','before',before_state,'plan_id',p_plan_id,'after',meal_pricing_private.workspace()));
 return meal_pricing_private.workspace();
end $$;
revoke all on function public.set_meal_plan_active(uuid,boolean,bigint,text) from public,anon;
grant execute on function public.set_meal_plan_active(uuid,boolean,bigint,text) to authenticated;

-- Installs live-link capability. Does NOT activate it; orchestrator must call activate_live()
-- only after coordinated rates/weekend migration and explicit user approval.
alter table meal_pricing_private.state add column mode text not null default 'staged' check(mode in ('staged','live'));
alter table public.meal_plan_rules add column meal_choice_groups jsonb not null default '[]';

create or replace function meal_pricing_private.workspace() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('mode',(select mode from meal_pricing_private.state where id),'revision',(select revision from meal_pricing_private.state where id),
 'meals',coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',title,'meal_type',meal_type,'variant',variant,'price',price,'is_active',is_active,'updated_at',updated_at) order by meal_type,variant,title,id) from meal_pricing_private.staged_meals),'[]'::jsonb),
 'plans',coalesce((select jsonb_agg(jsonb_build_object('id',id,'plan_code',plan_code,'plan_name',plan_name,'groups',meal_choice_groups,'supplement_per_person_inr',supplement_per_person_inr,'is_active',is_active) order by display_order,id) from meal_pricing_private.staged_plans where plan_code in ('RO','BB','HB','FB')),'[]'::jsonb));
$$;

create function meal_pricing_private.sync_live() returns void language plpgsql set search_path='' as $$
begin
 if (select mode from meal_pricing_private.state where id)<>'live' then return;end if;
 -- One statement updates all variants. Legacy sync trigger detects identical staging and does nothing.
 update public.meals m set price=s.price,updated_at=clock_timestamp() from meal_pricing_private.staged_meals s where m.id=s.id and m.price is distinct from s.price;
 update public.meal_plan_rules p set meal_choice_groups=s.meal_choice_groups,included_meal_types=s.included_meal_types,
  supplement_per_person_inr=s.supplement_per_person_inr,supplement_effective_from=s.supplement_effective_from,
  supplement_period=s.supplement_period,supplement_guest_basis=s.supplement_guest_basis,supplement_pricing_enabled=s.supplement_pricing_enabled,
  is_active=s.is_active,updated_at=clock_timestamp()
 from meal_pricing_private.staged_plans s where p.id=s.id and
 (p.meal_choice_groups,p.included_meal_types,p.supplement_per_person_inr,p.supplement_effective_from,p.supplement_period,p.supplement_guest_basis,p.supplement_pricing_enabled,p.is_active)
 is distinct from (s.meal_choice_groups,s.included_meal_types,s.supplement_per_person_inr,s.supplement_effective_from,s.supplement_period,s.supplement_guest_basis,s.supplement_pricing_enabled,s.is_active);
end $$;

-- Patch only the three staged write RPCs to synchronize after complete validation and before audit.
do $$
declare f regprocedure; definition text;
begin
 foreach f in array array['public.save_shared_meal_prices(jsonb,bigint,text)'::regprocedure,'public.save_meal_plan_groups(uuid,jsonb,bigint,text)'::regprocedure,'public.set_meal_plan_active(uuid,boolean,bigint,text)'::regprocedure] loop
  definition:=pg_get_functiondef(f);
  if strpos(definition,' insert into meal_pricing_private.audit(actor,reason,details)')=0 then raise exception 'Unexpected shared meal RPC definition: %',f;end if;
  definition:=replace(definition,' insert into meal_pricing_private.audit(actor,reason,details)',' perform meal_pricing_private.sync_live();'||chr(10)||' insert into meal_pricing_private.audit(actor,reason,details)');
  execute definition;
 end loop;
end $$;

create function meal_pricing_private.lock_live_workspace() returns trigger language plpgsql security definer set search_path='' as $$
begin perform 1 from meal_pricing_private.state where id for update;return null;end $$;
create trigger shared_meal_live_lock before insert or update or delete on public.meals for each statement execute function meal_pricing_private.lock_live_workspace();
create trigger shared_plan_live_lock before insert or update or delete on public.meal_plan_rules for each statement execute function meal_pricing_private.lock_live_workspace();

-- Prevent a legacy form from changing derived composition/supplements independently of shared meals.
-- These are invoker triggers: an RPC's owner role may write, client role may not bypass the guard.
create function meal_pricing_private.guard_live_plan() returns trigger language plpgsql set search_path='' as $$
begin
 if current_user='postgres' then return coalesce(new,old);end if;
 -- A guarded security-definer helper reads mode without granting clients private-table access.
 if not public.shared_meal_pricing_is_live() then return coalesce(new,old);end if;
 if TG_OP in ('INSERT','DELETE') then raise exception 'Use the shared meal pricing workspace for canonical plan changes';end if;
 if (new.meal_choice_groups,new.included_meal_types,new.preferred_variant,new.supplement_per_person_inr,new.supplement_effective_from,new.supplement_guest_basis,new.supplement_period,new.supplement_pricing_enabled,new.plan_code)
 is distinct from (old.meal_choice_groups,old.included_meal_types,old.preferred_variant,old.supplement_per_person_inr,old.supplement_effective_from,old.supplement_guest_basis,old.supplement_period,old.supplement_pricing_enabled,old.plan_code) then
 raise exception 'Meal plan prices are derived from shared meals. Use the shared meal pricing workspace.';end if;
 return new;
end $$;
create function public.shared_meal_pricing_is_live() returns boolean language sql stable security definer set search_path='' as $$select mode='live' from meal_pricing_private.state where id$$;
revoke all on function public.shared_meal_pricing_is_live() from public,anon;
grant execute on function public.shared_meal_pricing_is_live() to authenticated;
create trigger guard_shared_live_plan before insert or update or delete on public.meal_plan_rules for each row execute function meal_pricing_private.guard_live_plan();

create function meal_pricing_private.sync_legacy_meals() returns trigger language plpgsql security definer set search_path='' as $$
declare rec record; changed boolean;
begin
 if (select mode from meal_pricing_private.state where id)<>'live' then return null;end if;
 select exists(select 1 from public.meals m full join meal_pricing_private.staged_meals s using(id) where m.id is null or s.id is null or (m.title,m.meal_type,m.variant,m.price,m.is_active) is distinct from (s.title,s.meal_type,s.variant,s.price,s.is_active)) into changed;
 if not changed then return null;end if;
 perform meal_pricing_private.assert_admin();
 -- Do not permit a referenced meal to disappear or change identity silently.
 if exists(select 1 from meal_pricing_private.staged_plans p cross join lateral jsonb_array_elements(p.meal_choice_groups) g cross join lateral jsonb_array_elements_text(g->'meal_ids') x left join public.meals m on m.id=x.value::uuid join meal_pricing_private.staged_meals s on s.id=x.value::uuid where m.id is null or not m.is_active or m.meal_type is distinct from s.meal_type or m.variant is distinct from s.variant) then raise exception 'A linked meal cannot be removed, deactivated or changed to another type/variant';end if;
 delete from meal_pricing_private.staged_meals s where not exists(select 1 from public.meals m where m.id=s.id);
 insert into meal_pricing_private.staged_meals(id,title,meal_type,variant,price,is_active,updated_at) select id,title,meal_type,variant,price,is_active,updated_at from public.meals
 on conflict(id) do update set title=excluded.title,meal_type=excluded.meal_type,variant=excluded.variant,price=excluded.price,is_active=excluded.is_active,updated_at=excluded.updated_at;
 perform meal_pricing_private.validate_catalogue();
 for rec in select id from meal_pricing_private.staged_plans order by id loop perform meal_pricing_private.refresh_plan(rec.id);end loop;
 perform meal_pricing_private.sync_live();
 update meal_pricing_private.state set revision=revision+1 where id;
 insert into meal_pricing_private.audit(actor,reason,details) values(auth.uid(),'Legacy Meal Management update',jsonb_build_object('action','legacy_meals','after',meal_pricing_private.workspace()));
 return null;
end $$;
create trigger sync_shared_legacy_meals after insert or update or delete on public.meals for each statement execute function meal_pricing_private.sync_legacy_meals();

create function meal_pricing_private.sync_legacy_plans() returns trigger language plpgsql security definer set search_path='' as $$
declare rec record;
begin
 if (select mode from meal_pricing_private.state where id)<>'live' then return null;end if;
 if not exists(select 1 from public.meal_plan_rules p join meal_pricing_private.staged_plans s using(id) where (p.plan_name,p.is_active,p.display_order) is distinct from (s.plan_name,s.is_active,s.display_order)) then return null;end if;
 perform meal_pricing_private.assert_admin();
 update meal_pricing_private.staged_plans s set plan_name=p.plan_name,is_active=p.is_active,display_order=p.display_order,updated_at=p.updated_at from public.meal_plan_rules p where p.id=s.id;
 perform meal_pricing_private.validate_catalogue();
 for rec in select id from meal_pricing_private.staged_plans where is_active order by id loop perform meal_pricing_private.refresh_plan(rec.id);end loop;
 perform meal_pricing_private.sync_live();
 update meal_pricing_private.state set revision=revision+1 where id;
 insert into meal_pricing_private.audit(actor,reason,details) values(auth.uid(),'Legacy Meal Plan metadata update',jsonb_build_object('action','legacy_plans','after',meal_pricing_private.workspace()));
 return null;
end $$;
create trigger sync_shared_legacy_plans after update on public.meal_plan_rules for each statement execute function meal_pricing_private.sync_legacy_plans();

-- No client grant. Coordinated deployment only; fails if live source changed since staging.
create function meal_pricing_private.activate_live() returns void language plpgsql set search_path='' as $$
declare source jsonb; expected_meals jsonb; expected_plans jsonb; actual_meals jsonb; actual_plans jsonb;
begin
 perform 1 from meal_pricing_private.state where id for update;
 if (select mode from meal_pricing_private.state where id)='live' then raise exception 'Shared meal pricing is already live';end if;
 lock table public.meals,public.meal_plan_rules in share row exclusive mode;
 select data into strict source from meal_pricing_private.source_snapshot;
 select jsonb_agg(value order by value->>'id') into expected_meals from jsonb_array_elements(source->'meals');
 select jsonb_agg(value order by value->>'id') into expected_plans from jsonb_array_elements(source->'plans');
 select jsonb_agg(to_jsonb(m) order by id) into actual_meals from public.meals m;
 select jsonb_agg(to_jsonb(p)-'meal_choice_groups' order by id) into actual_plans from public.meal_plan_rules p;
 if actual_meals is distinct from expected_meals or actual_plans is distinct from expected_plans then raise exception 'Live meal data changed since staging. Reconcile before activation.';end if;
 perform meal_pricing_private.validate_catalogue();
 if exists(select 1 from public.meal_supplement_versions v join meal_pricing_private.staged_plans p on p.id=v.meal_plan_id where v.effective_from>(now() at time zone 'Asia/Kolkata')::date and v.amount is distinct from p.supplement_per_person_inr) then raise exception 'A future-dated meal supplement conflicts with linked prices. Reconcile its schedule before activation.';end if;
 update meal_pricing_private.state set mode='live',revision=revision+1 where id;
 perform meal_pricing_private.sync_live();
 insert into meal_pricing_private.audit(actor,reason,details) values(auth.uid(),'Explicit coordinated live activation',jsonb_build_object('action','activate','after',meal_pricing_private.workspace()));
end $$;
revoke all on all functions in schema meal_pricing_private from public,anon,authenticated;

-- Append-only, stay-date effective day definitions. Later revisions win only
-- within their date range; after a bounded rule ends the prior rule resumes.
create table public.pricing_day_rules (
 revision bigint generated always as identity primary key,
 effective_from date not null,
 effective_to date,
 weekend_days integer[] not null,
 based_on_revision bigint not null,
 created_at timestamptz not null default now(),
 created_by uuid default auth.uid(),
 check (effective_to is null or effective_to >= effective_from),
 check (cardinality(weekend_days) between 0 and 7 and weekend_days <@ array[0,1,2,3,4,5,6])
);
alter table public.pricing_day_rules enable row level security;
create trigger zz_activity_log after insert or update or delete on public.pricing_day_rules for each row execute function public.record_activity_log();
create policy pricing_day_rules_read on public.pricing_day_rules for select to anon,authenticated using (true);
create policy pricing_day_rules_add on public.pricing_day_rules for insert to authenticated with check (auth.uid() is not null and public.is_admin_new());
revoke all on public.pricing_day_rules from anon,authenticated;
grant select(revision,effective_from,effective_to,weekend_days) on public.pricing_day_rules to anon,authenticated;
grant insert(effective_from,effective_to,weekend_days,based_on_revision) on public.pricing_day_rules to authenticated;
grant usage on sequence public.pricing_day_rules_revision_seq to authenticated;

create function public.guard_pricing_day_rule() returns trigger
language plpgsql security invoker set search_path=public as $$
declare v_revision bigint;
begin
 if tg_op <> 'INSERT' then raise exception 'Day rules are append-only; add a new effective rule'; end if;
 if current_user not in ('postgres','service_role') and (auth.uid() is null or not public.is_admin_new()) then raise exception 'Administrator required'; end if;
 perform pg_advisory_xact_lock(717171135);
 select coalesce(max(revision),0) into v_revision from public.pricing_day_rules;
 if new.based_on_revision is distinct from v_revision then raise exception 'Day rules changed. Reload before saving'; end if;
 if new.effective_from < (now() at time zone 'Asia/Kolkata')::date then raise exception 'Historical day definitions cannot be changed'; end if;
 if new.weekend_days is null or exists(select 1 from unnest(new.weekend_days) d where d is null) then raise exception 'Invalid weekend days'; end if;
 new.weekend_days := array(select distinct d from unnest(new.weekend_days) d order by d);
 new.created_at:=now(); new.created_by:=auth.uid();
 return new;
end $$;
create trigger pricing_day_rules_guard before insert or update or delete on public.pricing_day_rules for each row execute function public.guard_pricing_day_rule();

create function public.save_pricing_day_rule(p_effective_from date,p_effective_to date,p_weekend_days integer[],p_expected_revision bigint)
returns bigint language plpgsql security invoker set search_path=public as $$
declare v_revision bigint;
begin
 insert into public.pricing_day_rules(effective_from,effective_to,weekend_days,based_on_revision)
 values(p_effective_from,p_effective_to,p_weekend_days,p_expected_revision) returning revision into v_revision;
 return v_revision;
end $$;
revoke all on function public.save_pricing_day_rule(date,date,integer[],bigint) from public,anon;
grant execute on function public.save_pricing_day_rule(date,date,integer[],bigint) to authenticated;

create function public.is_pricing_weekend(p_date date,p_legacy_days integer[] default array[0,5,6])
returns boolean language sql stable security invoker set search_path=public as $$
 select extract(dow from p_date)::integer = any(coalesce(
 (select weekend_days from public.pricing_day_rules where effective_from <= p_date
 and (effective_to is null or effective_to >= p_date) order by revision desc limit 1),p_legacy_days));
$$;
grant execute on function public.is_pricing_weekend(date,integer[]) to anon,authenticated;

-- Patch only known expressions in currently deployed definitions, preserving
-- existing guards/modifiers instead of overwriting them with stale migration SQL.
do $$
declare r record; d text; old_expr text; patched integer:=0;
begin
 for r in select oid,proname from pg_proc where pronamespace='public'::regnamespace and proname in
 ('calculate_rate_variants','calculate_rate_variants_legacy_20261025','calculate_rate_variants_v2','get_base_price_for_date') loop
  d:=pg_get_functiondef(r.oid);
  if r.proname='calculate_rate_variants_v2' then
   old_expr:='extract(dow from v_date) in (0,5,6)';
   if position(old_expr in d)=0 then raise exception 'Unrecognized weekend expression in %',r.proname; end if;
   d:=replace(d,old_expr,'public.is_pricing_weekend(v_date, array[0,5,6])');
  elsif r.proname='get_base_price_for_date' then
   old_expr:='EXTRACT(DOW FROM p_date) IN (0, 6)';
   if position(old_expr in d)=0 then raise exception 'Unrecognized weekend expression in %',r.proname; end if;
   d:=replace(d,old_expr,'public.is_pricing_weekend(p_date, array[0,6])');
  else
   old_expr:='v_day_of_week IN (0, 5, 6)';
   if position(old_expr in d)=0 then raise exception 'Unrecognized weekend expression in %',r.proname; end if;
   d:=replace(d,old_expr,'public.is_pricing_weekend(v_date, array[0,5,6])');
  end if;
  execute d; patched:=patched+1;
 end loop;
 if patched<>4 then raise exception 'Expected four pricing entry points, found %',patched; end if;
end $$;
-- No activation seed here: apply Saturday-only rule after coordinated rollout.

-- Date-specific policy, not a hard-coded festive condition. Activation data is
-- separate and must include an auditable snapshot of the preserved source.
create table public.pricing_preservation_periods (
 id uuid primary key default gen_random_uuid(), name text not null,
 room_type_id uuid not null references public.room_types(id),
 start_date date not null,end_date date not null,
 source_meal_rate numeric not null check(source_meal_rate>=0),
 source_meal_version uuid,
 fb_constraint_rate numeric not null check(fb_constraint_rate>=0),
 preserve_legacy_days boolean not null default true,
 preserve_legacy_ep boolean not null default true,
 source_snapshot jsonb not null,
 is_active boolean not null default false,
 check(end_date>=start_date)
);
alter table public.pricing_preservation_periods enable row level security;
create policy preservation_read on public.pricing_preservation_periods for select to anon,authenticated using(is_active or public.is_admin_new());
revoke all on public.pricing_preservation_periods from anon,authenticated;
grant select on public.pricing_preservation_periods to anon,authenticated;
create trigger zz_activity_log after insert or update or delete on public.pricing_preservation_periods for each row execute function public.record_activity_log();
create function public.get_pricing_preservation_policy(p_room_type_id uuid,p_date date)
returns jsonb language sql stable security invoker set search_path=public as $$
 select to_jsonb(p) from pricing_preservation_periods p where p.is_active and p.room_type_id=p_room_type_id
 and p_date between p.start_date and p.end_date order by p.start_date desc,p.id limit 1;
$$;
-- The protected period retains existing day-definition semantics in each legacy
-- resolver, even though other dates adopt the newly published Saturday rule.
create or replace function public.is_pricing_weekend(p_date date,p_legacy_days integer[] default array[0,5,6])
returns boolean language sql stable security invoker set search_path=public as $$
 select extract(dow from p_date)::integer = any(case when exists(select 1 from pricing_preservation_periods
 where is_active and preserve_legacy_days and p_date between start_date and end_date) then p_legacy_days else coalesce(
 (select weekend_days from public.pricing_day_rules where effective_from<=p_date
 and (effective_to is null or effective_to>=p_date) order by revision desc limit 1),p_legacy_days) end);
$$;

-- Unapplied until coordinated release. The legacy-night helper retains the
-- ORIGINAL stay length for tactical eligibility; it never recasts a night as a
-- one-night booking. Legacy inclusive amounts are not presented as EP rates.
create function public.calculate_legacy_rate_night_context(
 p_room_type_id uuid,p_check_in date,p_check_out date,p_room_unit_id uuid,
 p_adults_count integer,p_children_count integer,p_infants_count integer,p_booking_channel text,p_pricing_date date
) returns numeric language plpgsql security invoker set search_path=public as $$
declare
 v_nights integer:=p_check_out-p_check_in;
 v_date date:=p_pricing_date;
 v_room_category_id uuid;
 v_day_of_week integer;
 v_day_type text;
 v_override record;
 v_daily_room_rate numeric;
 v_extra_adult_charge numeric;
 v_extra_child_charge numeric;
 v_extra_adults integer:=greatest(0,p_adults_count-2);
 v_extra_children integer:=p_children_count;
begin
 if p_pricing_date is null or p_check_in is null or p_check_out is null or v_nights<1 or v_nights>365
 or p_pricing_date<p_check_in or p_pricing_date>=p_check_out or p_adults_count is null or p_adults_count<1
 or p_children_count is null or p_children_count<0 or p_infants_count is null or p_infants_count<0 then raise exception 'Invalid nightly fallback context'; end if;
 if not exists(select 1 from room_types r where r.id=p_room_type_id and r.pricing_status<>'configuration_required'
 and exists(select 1 from room_units u where u.room_type_id=r.id)) then raise exception 'Room pricing unavailable'; end if;
 select category_id into v_room_category_id from room_types where id=p_room_type_id;
        v_day_of_week := EXTRACT(DOW FROM v_date);
        IF public.is_pricing_weekend(v_date, array[0,5,6]) THEN
          v_day_type := 'weekend';
        ELSE
          v_day_type := 'weekday';
        END IF;

        -- Get tactical override matching the room category
        SELECT * INTO v_override 
        FROM tactical_overrides
        WHERE not public.rate_override_disabled(id) AND is_active = true 
          AND start_date <= v_date 
          AND end_date >= v_date
          AND override_price IS NOT NULL
          AND (occupancy_type IS NULL OR occupancy_type = 'double')
          AND (day_type IS NULL OR day_type = v_day_type)
          AND (min_nights IS NULL OR v_nights >= min_nights)
          AND (max_nights IS NULL OR v_nights <= max_nights)
          AND (min_adults IS NULL OR p_adults_count >= min_adults)
          AND (max_adults IS NULL OR p_adults_count <= max_adults)
          AND (
            (room_unit_id IS NOT NULL AND room_unit_id = p_room_unit_id)
            OR (room_type_id IS NOT NULL AND room_type_id = p_room_type_id AND room_unit_id IS NULL)
            OR (room_category_id IS NOT NULL AND room_category_id = v_room_category_id AND room_type_id IS NULL AND room_unit_id IS NULL)
          )
        ORDER BY 
          CASE WHEN room_unit_id IS NOT NULL THEN 1 WHEN room_type_id IS NOT NULL THEN 2 ELSE 3 END,
          min_nights DESC NULLS LAST, 
          created_at DESC
        LIMIT 1;

        IF v_override.override_price IS NOT NULL THEN
          v_daily_room_rate := v_override.override_price;
          
          -- Extra adult charges
          IF v_extra_adults > 0 THEN
            SELECT adjustment_value INTO v_extra_adult_charge 
            FROM tactical_overrides
            WHERE not public.rate_override_disabled(id) AND is_active = true 
              AND start_date <= v_date 
              AND end_date >= v_date
              AND occupancy_type = 'extra_adult' 
              AND adjustment_value IS NOT NULL
              AND (day_type IS NULL OR day_type = v_day_type)
              AND (min_nights IS NULL OR v_nights >= min_nights)
              AND (
                (room_unit_id IS NOT NULL AND room_unit_id = p_room_unit_id)
                OR (room_type_id IS NOT NULL AND room_type_id = p_room_type_id AND room_unit_id IS NULL)
                OR (room_category_id IS NOT NULL AND room_category_id = v_room_category_id AND room_type_id IS NULL AND room_unit_id IS NULL)
              )
            ORDER BY CASE WHEN room_unit_id IS NOT NULL THEN 1 WHEN room_type_id IS NOT NULL THEN 2 ELSE 3 END,
              min_nights DESC NULLS LAST, created_at DESC 
            LIMIT 1;
            v_daily_room_rate := v_daily_room_rate + COALESCE(v_extra_adult_charge, 0) * v_extra_adults;
          END IF;
          
          -- Extra child charges
          IF v_extra_children > 0 THEN
            SELECT adjustment_value INTO v_extra_child_charge 
            FROM tactical_overrides
            WHERE not public.rate_override_disabled(id) AND is_active = true 
              AND start_date <= v_date 
              AND end_date >= v_date
              AND occupancy_type = 'extra_child' 
              AND adjustment_value IS NOT NULL
              AND (day_type IS NULL OR day_type = v_day_type)
              AND (min_nights IS NULL OR v_nights >= min_nights)
              AND (
                (room_unit_id IS NOT NULL AND room_unit_id = p_room_unit_id)
                OR (room_type_id IS NOT NULL AND room_type_id = p_room_type_id AND room_unit_id IS NULL)
                OR (room_category_id IS NOT NULL AND room_category_id = v_room_category_id AND room_type_id IS NULL AND room_unit_id IS NULL)
              )
            ORDER BY CASE WHEN room_unit_id IS NOT NULL THEN 1 WHEN room_type_id IS NOT NULL THEN 2 ELSE 3 END,
              min_nights DESC NULLS LAST, created_at DESC 
            LIMIT 1;
            v_daily_room_rate := v_daily_room_rate + COALESCE(v_extra_child_charge, 0) * v_extra_children;
          END IF;
        ELSE
          -- Fallback to dynamic pricing if no override found
          SELECT final_price INTO v_daily_room_rate 
          FROM calculate_dynamic_price_legacy_20261025(
            p_room_type_id, p_room_unit_id, v_date, p_adults_count, p_children_count, p_infants_count, p_booking_channel
          );
        END IF;
        

 if v_daily_room_rate is null or v_daily_room_rate<0 then raise exception 'Legacy nightly rate unavailable'; end if;
 return v_daily_room_rate;
end $$;
grant execute on function public.calculate_legacy_rate_night_context(uuid,date,date,uuid,integer,integer,integer,text,date) to anon,authenticated;

-- Rewrite guarded expressions only; preserve live modifiers and other guards.
do $patch$
declare d text;
begin
 d:=pg_get_functiondef('public.calculate_rate_variants_v2(uuid,date,date,uuid,integer,integer,integer,text)'::regprocedure);
 if position($old0$v_los_discount numeric;$old0$ in d)=0 then raise exception 'Mixed-night patch precondition 0 failed'; end if;
 d:=replace(d,$old0$v_los_discount numeric;$old0$,$new0$v_preservation jsonb; v_legacy_night numeric; v_has_verified boolean:=false; v_los_discount numeric;$new0$);
 if position($old1$if not found then v_covered:=false; exit; end if;$old1$ in d)=0 then raise exception 'Mixed-night patch precondition 1 failed'; end if;
 d:=replace(d,$old1$if not found then v_covered:=false; exit; end if;$old1$,$new1$if not found then
     v_preservation:=public.get_pricing_preservation_policy(p_room_type_id,v_date);
     if v_preservation is null then v_covered:=false; else v_has_verified:=true; end if;
     v_coverage:=v_coverage||jsonb_build_object('date',v_date,'legacy',true); continue; end if;
   v_has_verified:=true;$new1$);
 if position($old2$if not v_covered then$old2$ in d)=0 then raise exception 'Mixed-night patch precondition 2 failed'; end if;
 d:=replace(d,$old2$if not v_covered then$old2$,$new2$if not v_covered and not v_has_verified then$new2$);
 if position($old3$     select * into v_anchor from jsonb_populate_record(null::public.rate_plan_anchors,v_entry->'anchor');$old3$ in d)=0 then raise exception 'Mixed-night patch precondition 3 failed'; end if;
 d:=replace(d,$old3$     select * into v_anchor from jsonb_populate_record(null::public.rate_plan_anchors,v_entry->'anchor');$old3$,$new3$     v_preservation:=public.get_pricing_preservation_policy(p_room_type_id,v_date);
     if coalesce((v_entry->>'legacy')::boolean,false) then
       v_legacy_night:=public.calculate_legacy_rate_night_context(p_room_type_id,p_check_in,p_check_out,p_room_unit_id,p_adults_count,p_children_count,p_infants_count,p_booking_channel,v_date);
       v_total_room:=v_total_room+v_legacy_night;
       if v_preservation is not null and (v_preservation->>'preserve_legacy_ep')::boolean then
         select amount,id into v_target_rate,v_target_version from public.meal_supplement_versions where meal_plan_id=v_plan.id and effective_from<=v_date order by effective_from desc,recorded_at desc,id limit 1;
         if v_target_rate is null then raise exception 'No meal rate for preserved EP policy'; end if;
         v_total_meal:=v_total_meal+v_target_rate*v_all_guests;
         v_breakdown:=v_breakdown||jsonb_build_object('date',v_date,'pricing_status','preserved_policy_ep',
           'preservation_policy_id',v_preservation->>'id','accommodation_after_modifiers',v_legacy_night,
           'promo_eligible_ep',false,'selected_meal_rate',v_target_rate,'selected_meal_version',v_target_version,
           'meal_guests',v_all_guests,'meal_cost',v_target_rate*v_all_guests,
           'pricing_message','Date-specific policy retains existing EP calculation; current selected meals are added.');
         continue;
       end if;
       v_breakdown:=v_breakdown||jsonb_build_object('date',v_date,'pricing_status','legacy_basis_unverified',
         'legacy_inclusive_amount',v_legacy_night,'promo_eligible_ep',false,
         'pricing_message','Existing fallback policy for this night; no EP or meal split inferred. Original full-stay eligibility retained.');
       continue;
     end if;
     select * into v_anchor from jsonb_populate_record(null::public.rate_plan_anchors,v_entry->'anchor');$new3$);
 if position($old4$'room_only',v_room,$old4$ in d)=0 then raise exception 'Mixed-night patch precondition 4 failed'; end if;
 d:=replace(d,$old4$'room_only',v_room,$old4$,$new4$'room_only',v_room,'promo_eligible_ep',v_anchor.source_meal_plan_code='RO',$new4$);
 if position($old5$'pricing_status','verified',$old5$ in d)=0 then raise exception 'Mixed-night patch precondition 5 failed'; end if;
 d:=replace(d,$old5$'pricing_status','verified',$old5$,$new5$'pricing_status',case when v_covered then 'verified' else 'legacy_basis_unverified' end,
      'pricing_mode',case when v_covered then 'verified' else 'mixed_verified_and_legacy' end,
      'pricing_message',case when v_covered then null else 'Some nights use existing fallback pricing without an EP or meal split.' end,$new5$);
 if position($old6$     if v_source_rate is null then$old6$ in d)=0 then raise exception 'Mixed-night patch precondition 6 failed'; end if;
 d:=replace(d,$old6$     if v_source_rate is null then$old6$,$new6$     if v_preservation is not null and v_anchor.source_meal_plan_code='FB' then v_source_rate:=(v_preservation->>'source_meal_rate')::numeric; v_source_version:=(v_preservation->>'source_meal_version')::uuid; end if;
     if v_source_rate is null then$new6$);
 if position($old7$       if v_fb_rate is null then$old7$ in d)=0 then raise exception 'Mixed-night patch precondition 7 failed'; end if;
 d:=replace(d,$old7$       if v_fb_rate is null then$old7$,$new7$       if v_preservation is not null then v_fb_rate:=(v_preservation->>'fb_constraint_rate')::numeric; end if;
       if v_fb_rate is null then$new7$);
 if position($old8$'source_meal_rate',v_source_rate,$old8$ in d)=0 then raise exception 'Mixed-night patch precondition 8 failed'; end if;
 d:=replace(d,$old8$'source_meal_rate',v_source_rate,$old8$,$new8$'preservation_policy_id',v_preservation->>'id','source_meal_rate',v_source_rate,$new8$);
 execute d;
end $patch$;

-- Policy-backed preservation for rooms/dates outside the approved EP sheet.
alter table public.pricing_preservation_periods add column preservation_mode text not null default 'ep_only' check(preservation_mode in ('ep_only','full_pricing'));
alter table public.pricing_preservation_periods add column meal_version_snapshot jsonb not null default '[]'::jsonb check(jsonb_typeof(meal_version_snapshot)='array');

-- Scope day-definition preservation to the room; unmapped rooms must not change
-- the selected weekday for mapped rooms on the same date.
create or replace function public.is_pricing_weekend(p_date date,p_legacy_days integer[] default array[0,5,6])
returns boolean language sql stable security invoker set search_path=public as $$
 select extract(dow from p_date)::integer=any(coalesce((select weekend_days from pricing_day_rules where effective_from<=p_date and(effective_to is null or effective_to>=p_date) order by revision desc limit 1),p_legacy_days));
$$;
create function public.is_pricing_weekend(p_date date,p_legacy_days integer[],p_room_type_id uuid)
returns boolean language sql stable security invoker set search_path=public as $$
 select case when coalesce((get_pricing_preservation_policy(p_room_type_id,p_date)->>'preserve_legacy_days')::boolean,false)
 then extract(dow from p_date)::integer=any(p_legacy_days) else is_pricing_weekend(p_date,p_legacy_days) end;
$$;
create function public.preserved_meal_version(p_policy jsonb,p_plan_code text,p_date date)
returns jsonb language sql stable security invoker set search_path=public as $$
 select v from jsonb_array_elements(p_policy->'meal_version_snapshot') v where v->>'plan_code'=p_plan_code and (v->>'effective_from')::date<=p_date
 order by (v->>'effective_from')::date desc,(v->>'recorded_at')::timestamptz desc,(v->>'id')::uuid limit 1;
$$;

do $patch$
declare d text; f record; before_d text;
begin
 -- All current pricing call paths now pass the room ID into the day resolver.
 for f in select oid from pg_proc where pronamespace='public'::regnamespace and proname in ('calculate_rate_variants_v2','calculate_rate_variants','calculate_rate_variants_legacy_20261025','calculate_legacy_rate_night_context','get_base_price_for_date') loop
  d:=pg_get_functiondef(f.oid);before_d:=d;
  d:=replace(d,'public.is_pricing_weekend(v_date, array[0,5,6])','public.is_pricing_weekend(v_date, array[0,5,6],p_room_type_id)');
  d:=replace(d,'public.is_pricing_weekend(p_date, array[0,6])','public.is_pricing_weekend(p_date, array[0,6],p_room_type_id)');
  if d=before_d then raise exception 'Scoped weekend patch precondition failed for %',f.oid::regprocedure;end if;
  execute d;
 end loop;
 d:=pg_get_functiondef('public.calculate_rate_variants_v2(uuid,date,date,uuid,integer,integer,integer,text)'::regprocedure);
 d:=replace(d,'v_preservation jsonb;','v_preservation jsonb; v_preserved_version jsonb; v_all_full_preservation boolean;');
 d:=replace(d,' -- Resolve all nights before pricing.',E' select bool_and(coalesce(get_pricing_preservation_policy(p_room_type_id,ds::date)->>\'preservation_mode\',\'\')=\'full_pricing\') into v_all_full_preservation from generate_series(p_check_in,p_check_out-1,\'1 day\') ds;\n -- Resolve all nights before pricing.');
 d:=replace(d,'if v_preservation is null then v_covered:=false; else v_has_verified:=true; end if;','if v_preservation is null or v_preservation->>''preservation_mode''=''full_pricing'' then v_covered:=false; else v_has_verified:=true; end if;');
 d:=replace(d,'if not v_covered and not v_has_verified then','if not v_covered and (not v_has_verified or v_all_full_preservation) then');
 d:=replace(d,$a$if v_preservation is not null and (v_preservation->>'preserve_legacy_ep')::boolean then$a$,$b$if v_preservation is not null and v_preservation->>'preservation_mode'='ep_only' and (v_preservation->>'preserve_legacy_ep')::boolean then$b$);
 d:=replace(d,'     if v_source_rate is null then',$s$     if v_preservation->>'preservation_mode'='full_pricing' then
       v_preserved_version:=public.preserved_meal_version(v_preservation,v_anchor.source_meal_plan_code,v_date);
       v_source_rate:=(v_preserved_version->>'amount')::numeric;v_source_version:=(v_preserved_version->>'id')::uuid;
     end if;
     if v_source_rate is null then$s$);
 d:=replace(d,'     if v_target_rate is null then',$s$     if v_preservation->>'preservation_mode'='full_pricing' then
       v_preserved_version:=public.preserved_meal_version(v_preservation,v_plan.plan_code,v_date);
       v_target_rate:=(v_preserved_version->>'amount')::numeric;v_target_version:=(v_preserved_version->>'id')::uuid;
     end if;
     if v_target_rate is null then$s$);
 d:=replace(d,'       if v_fb_rate is null then',$s$       if v_preservation->>'preservation_mode'='full_pricing' then
       v_preserved_version:=public.preserved_meal_version(v_preservation,'FB',v_date);v_fb_rate:=(v_preserved_version->>'amount')::numeric;
       end if;
       if v_fb_rate is null then$s$);
 d:=replace(d,$a$'promo_eligible_ep',v_anchor.source_meal_plan_code='RO'$a$,$b$'promo_eligible_ep',v_anchor.source_meal_plan_code='RO' and coalesce(v_preservation->>'preservation_mode','')<>'full_pricing'$b$);
 -- Legacy quotes historically retain fractional paise in policy percentages.
 -- Preserve that representation when every occupied night uses legacy EP policy;
 -- anchor-based/mixed canonical quotes retain their existing rounding contract.
 d:=replace(d,'v_all_full_preservation boolean;','v_all_full_preservation boolean; v_has_anchor boolean:=false;');
 d:=replace(d,E'   v_has_verified:=true;\n   v_coverage',E'   v_has_verified:=true;v_has_anchor:=true;\n   v_coverage');
 d:=replace(d,'v_policy:=round(v_policy,2);v_total:=round(v_total_room+v_total_meal+v_policy,2);',
   'if v_has_anchor then v_policy:=round(v_policy,2);v_total:=round(v_total_room+v_total_meal+v_policy,2);else v_total:=v_total_room+v_total_meal+v_policy;end if;');
 d:=replace(d,'round(v_total/v_nights,2)','case when v_has_anchor then round(v_total/v_nights,2) else v_total/v_nights end');
 execute d;
end $patch$;

-- TRANSACTION FRAGMENT ONLY. Execute within the coordinated meal/day-rule/EP
-- activation transaction after all migrations pass. Never execute independently.
-- The start is 17 November 2026 (user's current request); do not backdate a later
-- rollout silently. No booking, payment or inventory records are changed.
do $activate$
declare r record; period record; day text; source_version uuid; source_amount numeric;
 revision_now bigint; new_count integer:=0; resolved_room_id uuid; matched_count integer;
begin
 if (now() at time zone 'Asia/Kolkata')::date <> date '2026-11-17' then
   raise exception 'Review effective start date for a later rollout';
 end if;
 if exists(select 1 from rate_plan_anchors where name like 'Approved EP Nov2026%') then raise exception 'EP rollout already present; inspect rather than duplicate'; end if;
 if exists(select 1 from rate_plan_anchors where is_active and priority>=200) then raise exception 'New competing high-priority rates require review'; end if;
 -- Capture old conversion BEFORE shared meal activation appends the new version.
 select amount,id into source_amount,source_version from meal_supplement_versions
 where plan_code='FB' and effective_from<='2026-12-24' order by effective_from desc,recorded_at desc,id limit 1;
 if source_amount is distinct from 1000::numeric then raise exception 'Expected current FB1000 source; capture/review again';end if;
 if exists(select 1 from meal_supplement_versions where plan_code='FB' and effective_from>'2026-12-24' and effective_from<='2027-01-01' and amount<>1000) then raise exception 'Festive source changes need split policy periods';end if;
 if (select count(*) from room_types where name in ('Basement Hideouts','Standard','Deluxe','Superior'))<>4 then
   raise exception 'Approved four room types missing or ambiguous; resolve exact names before rollout';
 end if;
 for r in select * from (values
 ('Basement Hideouts',2000,3500,900,600,1200,900),
 ('Standard',2500,4500,900,600,1200,900),
 ('Deluxe',3500,6000,1000,600,1200,900),
 ('Superior',5500,8000,1000,600,1200,900)
 ) x(name,weekday,weekend,weekday_adult,weekday_child,weekend_adult,weekend_child) loop
   select count(*) into matched_count from room_types where name=r.name;
   if matched_count<>1 then raise exception 'Expected exactly one room type named %, found %',r.name,matched_count;end if;
   select id into strict resolved_room_id from room_types where name=r.name;
   insert into pricing_preservation_periods(name,room_type_id,start_date,end_date,source_meal_rate,source_meal_version,fb_constraint_rate,preserve_legacy_days,preserve_legacy_ep,source_snapshot,is_active)
   values('Festive existing EP policy · '||r.name,resolved_room_id,'2026-12-24','2027-01-01',source_amount,source_version,source_amount,true,true,
     jsonb_build_object('captured_at',now(),'reason','User requested preservation of current EP policy for excluded festive period; dynamic policy retained, new target meals added',
       'source_meal_version',source_version,'source_meal_rate',source_amount,
       'existing_anchors',(select coalesce(jsonb_agg(to_jsonb(a)),'[]'::jsonb) from rate_plan_anchors a where a.room_type_id=resolved_room_id)),true);
   for period in select * from(values(date '2026-11-17',date '2026-12-23'),(date '2027-01-02',date '2027-03-31')) p(start_date,end_date) loop
     foreach day in array array['weekday','weekend'] loop
       insert into rate_plan_anchors(name,room_type_id,amount,source_meal_plan_code,quoted_nights,included_adults,start_date,end_date,min_nights,max_nights,day_type,
        extra_adult_per_night,extra_child_per_night,extra_infant_per_night,priority,is_active,verified_basis,modifier_policy)
       values('Approved EP Nov2026 · '||r.name||' · '||day||' · '||period.start_date,resolved_room_id,
        case day when 'weekday' then r.weekday else r.weekend end,'RO',1,2,period.start_date,period.end_date,1,null,day,
        case day when 'weekday' then r.weekday_adult else r.weekend_adult end,
        case day when 'weekday' then r.weekday_child else r.weekend_child end,0,200,true,true,'none');
       new_count:=new_count+1;
     end loop;
   end loop;
 end loop;
 if new_count<>16 then raise exception 'Expected16 EP anchors';end if;
 select coalesce(max(revision),0) into revision_now from pricing_day_rules;
 perform save_pricing_day_rule('2026-11-17',null,array[6],revision_now);
end $activate$;

-- Execute after approved EP records, before activate_live(), in the SAME transaction.
do $preserve$
declare r record; p record; captured_versions jsonb; source_amount numeric; source_version uuid;
begin
 if exists(select 1 from pricing_preservation_periods where preservation_mode='full_pricing' and is_active) then raise exception 'Full preservation already configured; inspect before retry';end if;
 select jsonb_agg(to_jsonb(v) order by v.effective_from,v.recorded_at,v.id) into captured_versions from meal_supplement_versions v;
 select amount,id into source_amount,source_version from meal_supplement_versions where plan_code='FB' and effective_from<=current_date order by effective_from desc,recorded_at desc,id limit 1;
 if source_amount is distinct from 1000::numeric then raise exception 'Capture original meal schedule before activation';end if;
 for r in select rt.id,rt.name,min(a.start_date) first_date,max(a.end_date) last_date
 from room_types rt left join rate_plan_anchors a on a.room_type_id=rt.id and a.name like 'Approved EP Nov2026%' and a.is_active and a.source_meal_plan_code='RO'
 group by rt.id,rt.name loop
  for p in select '-infinity'::date start_date,coalesce(r.first_date-1,'infinity'::date) end_date
    union all select r.last_date+1,'infinity'::date where r.last_date is not null loop
   insert into pricing_preservation_periods(name,room_type_id,start_date,end_date,source_meal_rate,source_meal_version,fb_constraint_rate,preserve_legacy_days,preserve_legacy_ep,source_snapshot,is_active,preservation_mode,meal_version_snapshot)
   values('Existing full pricing · '||r.name,r.id,p.start_date,p.end_date,source_amount,source_version,source_amount,true,false,
    jsonb_build_object('captured_at',now(),'reason','User requested current pricing retained for other categories and dates outside approved sheet; existing dynamic rules remain active','scope','complement_of_approved_ep_coverage'),true,'full_pricing',captured_versions);
  end loop;
 end loop;
 if (select count(*) from pricing_preservation_periods where is_active and preservation_mode='full_pricing')<>(select count(*)+4 from room_types) then
  raise exception 'Unexpected full preservation coverage count';end if;
 if exists(select 1 from pricing_preservation_periods pp join rate_plan_anchors a on a.room_type_id=pp.room_type_id
  where pp.is_active and pp.preservation_mode='full_pricing' and a.is_active and a.name like 'Approved EP Nov2026%'
  and daterange(pp.start_date,pp.end_date,'[]') && daterange(a.start_date,a.end_date,'[]')) then
  raise exception 'Preservation overlaps approved EP coverage';end if;
 if exists(select 1 from pricing_preservation_periods pp join pricing_preservation_periods q on pp.room_type_id=q.room_type_id and pp.id<q.id
  where pp.is_active and q.is_active and daterange(pp.start_date,pp.end_date,'[]') && daterange(q.start_date,q.end_date,'[]')) then
  raise exception 'Overlapping preservation policies require review';end if;
end $preserve$;

SELECT meal_pricing_private.activate_live();
DO $verify$ DECLARE j jsonb; actual numeric; actual_quotes jsonb; BEGIN
IF (SELECT mode FROM meal_pricing_private.state WHERE id)<>'live' THEN RAISE EXCEPTION 'Meal activation failed';END IF;
IF (SELECT count(*) FROM rate_plan_anchors WHERE name LIKE 'Approved EP Nov2026%')<>16 THEN RAISE EXCEPTION 'EP coverage missing';END IF;
IF EXISTS(SELECT 1 FROM meal_plan_rules WHERE plan_code IN ('RO','BB','HB','FB') AND supplement_per_person_inr <> CASE plan_code WHEN 'RO' THEN 0 WHEN 'BB' THEN 270 WHEN 'HB' THEN 920 WHEN 'FB' THEN 1510 END) THEN RAISE EXCEPTION 'Meal totals mismatch';END IF;
FOR j IN SELECT value FROM jsonb_array_elements('[{"name":"Basement Hideouts","from":"2026-12-24","to":"2026-12-25","a":2,"c":0,"i":0,"policy":"non_refundable","total":3249},{"name":"Basement Hideouts","from":"2026-12-24","to":"2026-12-25","a":2,"c":0,"i":0,"policy":"refundable_credit","total":3420},{"name":"Basement Hideouts","from":"2026-12-25","to":"2026-12-28","a":2,"c":0,"i":0,"policy":"non_refundable","total":9747},{"name":"Basement Hideouts","from":"2026-12-25","to":"2026-12-28","a":2,"c":0,"i":0,"policy":"refundable_credit","total":10260},{"name":"Basement Hideouts","from":"2026-12-31","to":"2027-01-01","a":2,"c":0,"i":0,"policy":"non_refundable","total":3249},{"name":"Basement Hideouts","from":"2026-12-31","to":"2027-01-01","a":2,"c":0,"i":0,"policy":"refundable_credit","total":3420},{"name":"Basement Hideouts","from":"2027-01-01","to":"2027-01-02","a":2,"c":0,"i":0,"policy":"non_refundable","total":3249},{"name":"Basement Hideouts","from":"2027-01-01","to":"2027-01-02","a":2,"c":0,"i":0,"policy":"refundable_credit","total":3420},{"name":"Basement Hideouts","from":"2026-12-24","to":"2026-12-25","a":3,"c":1,"i":1,"policy":"non_refundable","total":5415},{"name":"Basement Hideouts","from":"2026-12-24","to":"2026-12-25","a":3,"c":1,"i":1,"policy":"refundable_credit","total":5700},{"name":"Basement Hideouts","from":"2026-12-25","to":"2026-12-28","a":3,"c":1,"i":1,"policy":"non_refundable","total":16245},{"name":"Basement Hideouts","from":"2026-12-25","to":"2026-12-28","a":3,"c":1,"i":1,"policy":"refundable_credit","total":17100},{"name":"Basement Hideouts","from":"2026-12-31","to":"2027-01-01","a":3,"c":1,"i":1,"policy":"non_refundable","total":5415},{"name":"Basement Hideouts","from":"2026-12-31","to":"2027-01-01","a":3,"c":1,"i":1,"policy":"refundable_credit","total":5700},{"name":"Basement Hideouts","from":"2027-01-01","to":"2027-01-02","a":3,"c":1,"i":1,"policy":"non_refundable","total":5415},{"name":"Basement Hideouts","from":"2027-01-01","to":"2027-01-02","a":3,"c":1,"i":1,"policy":"refundable_credit","total":5700},{"name":"Deluxe","from":"2026-12-24","to":"2026-12-25","a":2,"c":0,"i":0,"policy":"non_refundable","total":3249},{"name":"Deluxe","from":"2026-12-24","to":"2026-12-25","a":2,"c":0,"i":0,"policy":"refundable_credit","total":3420},{"name":"Deluxe","from":"2026-12-25","to":"2026-12-28","a":2,"c":0,"i":0,"policy":"non_refundable","total":9747},{"name":"Deluxe","from":"2026-12-25","to":"2026-12-28","a":2,"c":0,"i":0,"policy":"refundable_credit","total":10260},{"name":"Deluxe","from":"2026-12-31","to":"2027-01-01","a":2,"c":0,"i":0,"policy":"non_refundable","total":3249},{"name":"Deluxe","from":"2026-12-31","to":"2027-01-01","a":2,"c":0,"i":0,"policy":"refundable_credit","total":3420},{"name":"Deluxe","from":"2027-01-01","to":"2027-01-02","a":2,"c":0,"i":0,"policy":"non_refundable","total":3249},{"name":"Deluxe","from":"2027-01-01","to":"2027-01-02","a":2,"c":0,"i":0,"policy":"refundable_credit","total":3420},{"name":"Deluxe","from":"2026-12-24","to":"2026-12-25","a":3,"c":1,"i":1,"policy":"non_refundable","total":5324.75},{"name":"Deluxe","from":"2026-12-24","to":"2026-12-25","a":3,"c":1,"i":1,"policy":"refundable_credit","total":5605},{"name":"Deluxe","from":"2026-12-25","to":"2026-12-28","a":3,"c":1,"i":1,"policy":"non_refundable","total":15974.25},{"name":"Deluxe","from":"2026-12-25","to":"2026-12-28","a":3,"c":1,"i":1,"policy":"refundable_credit","total":16815},{"name":"Deluxe","from":"2026-12-31","to":"2027-01-01","a":3,"c":1,"i":1,"policy":"non_refundable","total":5324.75},{"name":"Deluxe","from":"2026-12-31","to":"2027-01-01","a":3,"c":1,"i":1,"policy":"refundable_credit","total":5605},{"name":"Deluxe","from":"2027-01-01","to":"2027-01-02","a":3,"c":1,"i":1,"policy":"non_refundable","total":5324.75},{"name":"Deluxe","from":"2027-01-01","to":"2027-01-02","a":3,"c":1,"i":1,"policy":"refundable_credit","total":5605},{"name":"Standard","from":"2026-12-24","to":"2026-12-25","a":2,"c":0,"i":0,"policy":"non_refundable","total":4061.25},{"name":"Standard","from":"2026-12-24","to":"2026-12-25","a":2,"c":0,"i":0,"policy":"refundable_credit","total":4275},{"name":"Standard","from":"2026-12-25","to":"2026-12-28","a":2,"c":0,"i":0,"policy":"non_refundable","total":12183.75},{"name":"Standard","from":"2026-12-25","to":"2026-12-28","a":2,"c":0,"i":0,"policy":"refundable_credit","total":12825},{"name":"Standard","from":"2026-12-31","to":"2027-01-01","a":2,"c":0,"i":0,"policy":"non_refundable","total":4061.25},{"name":"Standard","from":"2026-12-31","to":"2027-01-01","a":2,"c":0,"i":0,"policy":"refundable_credit","total":4275},{"name":"Standard","from":"2027-01-01","to":"2027-01-02","a":2,"c":0,"i":0,"policy":"non_refundable","total":4061.25},{"name":"Standard","from":"2027-01-01","to":"2027-01-02","a":2,"c":0,"i":0,"policy":"refundable_credit","total":4275},{"name":"Standard","from":"2026-12-24","to":"2026-12-25","a":3,"c":1,"i":1,"policy":"non_refundable","total":7107.1875},{"name":"Standard","from":"2026-12-24","to":"2026-12-25","a":3,"c":1,"i":1,"policy":"refundable_credit","total":7481.25},{"name":"Standard","from":"2026-12-25","to":"2026-12-28","a":3,"c":1,"i":1,"policy":"non_refundable","total":21321.5625},{"name":"Standard","from":"2026-12-25","to":"2026-12-28","a":3,"c":1,"i":1,"policy":"refundable_credit","total":22443.75},{"name":"Standard","from":"2026-12-31","to":"2027-01-01","a":3,"c":1,"i":1,"policy":"non_refundable","total":7107.1875},{"name":"Standard","from":"2026-12-31","to":"2027-01-01","a":3,"c":1,"i":1,"policy":"refundable_credit","total":7481.25},{"name":"Standard","from":"2027-01-01","to":"2027-01-02","a":3,"c":1,"i":1,"policy":"non_refundable","total":7107.1875},{"name":"Standard","from":"2027-01-01","to":"2027-01-02","a":3,"c":1,"i":1,"policy":"refundable_credit","total":7481.25},{"name":"Superior","from":"2026-12-24","to":"2026-12-25","a":2,"c":0,"i":0,"policy":"non_refundable","total":4061.25},{"name":"Superior","from":"2026-12-24","to":"2026-12-25","a":2,"c":0,"i":0,"policy":"refundable_credit","total":4275},{"name":"Superior","from":"2026-12-25","to":"2026-12-28","a":2,"c":0,"i":0,"policy":"non_refundable","total":12183.75},{"name":"Superior","from":"2026-12-25","to":"2026-12-28","a":2,"c":0,"i":0,"policy":"refundable_credit","total":12825},{"name":"Superior","from":"2026-12-31","to":"2027-01-01","a":2,"c":0,"i":0,"policy":"non_refundable","total":4061.25},{"name":"Superior","from":"2026-12-31","to":"2027-01-01","a":2,"c":0,"i":0,"policy":"refundable_credit","total":4275},{"name":"Superior","from":"2027-01-01","to":"2027-01-02","a":2,"c":0,"i":0,"policy":"non_refundable","total":4061.25},{"name":"Superior","from":"2027-01-01","to":"2027-01-02","a":2,"c":0,"i":0,"policy":"refundable_credit","total":4275},{"name":"Superior","from":"2026-12-24","to":"2026-12-25","a":3,"c":1,"i":1,"policy":"non_refundable","total":6137},{"name":"Superior","from":"2026-12-24","to":"2026-12-25","a":3,"c":1,"i":1,"policy":"refundable_credit","total":6460},{"name":"Superior","from":"2026-12-25","to":"2026-12-28","a":3,"c":1,"i":1,"policy":"non_refundable","total":18411},{"name":"Superior","from":"2026-12-25","to":"2026-12-28","a":3,"c":1,"i":1,"policy":"refundable_credit","total":19380},{"name":"Superior","from":"2026-12-31","to":"2027-01-01","a":3,"c":1,"i":1,"policy":"non_refundable","total":6137},{"name":"Superior","from":"2026-12-31","to":"2027-01-01","a":3,"c":1,"i":1,"policy":"refundable_credit","total":6460},{"name":"Superior","from":"2027-01-01","to":"2027-01-02","a":3,"c":1,"i":1,"policy":"non_refundable","total":6137},{"name":"Superior","from":"2027-01-01","to":"2027-01-02","a":3,"c":1,"i":1,"policy":"refundable_credit","total":6460}]'::jsonb) LOOP
SELECT (q->>'total_price')::numeric INTO STRICT actual FROM room_types r CROSS JOIN LATERAL jsonb_array_elements(calculate_rate_variants_v2(r.id,(j->>'from')::date,(j->>'to')::date,null,(j->>'a')::int,(j->>'c')::int,(j->>'i')::int,'direct')) q WHERE r.name=j->>'name' AND q->>'meal_plan_code'='RO' AND q->>'cancellation_policy_code'=j->>'policy';
IF abs(actual-(j->>'total')::numeric)>0.001 THEN RAISE EXCEPTION 'Festive EP changed: %',j; END IF;END LOOP;
FOR j IN SELECT value FROM jsonb_array_elements('[{"name":"Balcony Rooms","from":"2026-11-13","to":"2026-11-16","quotes":[]},{"name":"Balcony Rooms","from":"2026-11-20","to":"2026-11-23","quotes":[]},{"name":"Balcony Rooms","from":"2027-04-02","to":"2027-04-05","quotes":[]},{"name":"Bamboo Cabins","from":"2026-11-13","to":"2026-11-16","quotes":[]},{"name":"Bamboo Cabins","from":"2026-11-20","to":"2026-11-23","quotes":[]},{"name":"Bamboo Cabins","from":"2027-04-02","to":"2027-04-05","quotes":[]},{"name":"Basement Hideouts","from":"2026-11-13","to":"2026-11-16","quotes":[{"plan":"BB","policy":"non_refundable","total":7980},{"plan":"BB","policy":"refundable_credit","total":8400},{"plan":"FB","policy":"non_refundable","total":12825},{"plan":"FB","policy":"refundable_credit","total":13500},{"plan":"HB","policy":"non_refundable","total":10260},{"plan":"HB","policy":"refundable_credit","total":10800},{"plan":"RO","policy":"non_refundable","total":7125},{"plan":"RO","policy":"refundable_credit","total":7500}]},{"name":"Basement Hideouts","from":"2027-04-02","to":"2027-04-05","quotes":[{"plan":"BB","policy":"non_refundable","total":9205.5},{"plan":"BB","policy":"refundable_credit","total":9690},{"plan":"FB","policy":"non_refundable","total":9205.5},{"plan":"FB","policy":"refundable_credit","total":9690},{"plan":"HB","policy":"non_refundable","total":9205.5},{"plan":"HB","policy":"refundable_credit","total":9690},{"plan":"RO","policy":"non_refundable","total":9205.5},{"plan":"RO","policy":"refundable_credit","total":9690}]},{"name":"Classic Pods","from":"2026-11-13","to":"2026-11-16","quotes":[]},{"name":"Classic Pods","from":"2026-11-20","to":"2026-11-23","quotes":[]},{"name":"Classic Pods","from":"2027-04-02","to":"2027-04-05","quotes":[]},{"name":"Deluxe","from":"2026-11-13","to":"2026-11-16","quotes":[{"plan":"BB","policy":"non_refundable","total":15105},{"plan":"BB","policy":"refundable_credit","total":15900},{"plan":"FB","policy":"non_refundable","total":19950},{"plan":"FB","policy":"refundable_credit","total":21000},{"plan":"HB","policy":"non_refundable","total":17385},{"plan":"HB","policy":"refundable_credit","total":18300},{"plan":"RO","policy":"non_refundable","total":14250},{"plan":"RO","policy":"refundable_credit","total":15000}]},{"name":"Deluxe","from":"2027-04-02","to":"2027-04-05","quotes":[{"plan":"BB","policy":"non_refundable","total":10060.5},{"plan":"BB","policy":"refundable_credit","total":10590},{"plan":"FB","policy":"non_refundable","total":14905.5},{"plan":"FB","policy":"refundable_credit","total":15690},{"plan":"HB","policy":"non_refundable","total":12340.5},{"plan":"HB","policy":"refundable_credit","total":12990},{"plan":"RO","policy":"non_refundable","total":9205.5},{"plan":"RO","policy":"refundable_credit","total":9690}]},{"name":"Gameside Quarters","from":"2026-11-13","to":"2026-11-16","quotes":[]},{"name":"Gameside Quarters","from":"2026-11-20","to":"2026-11-23","quotes":[]},{"name":"Gameside Quarters","from":"2027-04-02","to":"2027-04-05","quotes":[]},{"name":"Loft Rooms","from":"2026-11-13","to":"2026-11-16","quotes":[]},{"name":"Loft Rooms","from":"2026-11-20","to":"2026-11-23","quotes":[]},{"name":"Loft Rooms","from":"2027-04-02","to":"2027-04-05","quotes":[]},{"name":"Playside Rooms","from":"2026-11-13","to":"2026-11-16","quotes":[]},{"name":"Playside Rooms","from":"2026-11-20","to":"2026-11-23","quotes":[]},{"name":"Playside Rooms","from":"2027-04-02","to":"2027-04-05","quotes":[]},{"name":"Pool Deck Rooms","from":"2026-11-13","to":"2026-11-16","quotes":[]},{"name":"Pool Deck Rooms","from":"2026-11-20","to":"2026-11-23","quotes":[]},{"name":"Pool Deck Rooms","from":"2027-04-02","to":"2027-04-05","quotes":[]},{"name":"Poolview Rooms","from":"2026-11-13","to":"2026-11-16","quotes":[]},{"name":"Poolview Rooms","from":"2026-11-20","to":"2026-11-23","quotes":[]},{"name":"Poolview Rooms","from":"2027-04-02","to":"2027-04-05","quotes":[]},{"name":"Standard","from":"2026-11-13","to":"2026-11-16","quotes":[{"plan":"BB","policy":"non_refundable","total":9405},{"plan":"BB","policy":"refundable_credit","total":9900},{"plan":"FB","policy":"non_refundable","total":14250},{"plan":"FB","policy":"refundable_credit","total":15000},{"plan":"HB","policy":"non_refundable","total":11685},{"plan":"HB","policy":"refundable_credit","total":12300},{"plan":"RO","policy":"non_refundable","total":8550},{"plan":"RO","policy":"refundable_credit","total":9000}]},{"name":"Standard","from":"2027-04-02","to":"2027-04-05","quotes":[{"plan":"BB","policy":"non_refundable","total":11506.875},{"plan":"BB","policy":"refundable_credit","total":12112.5},{"plan":"FB","policy":"non_refundable","total":11506.875},{"plan":"FB","policy":"refundable_credit","total":12112.5},{"plan":"HB","policy":"non_refundable","total":11506.875},{"plan":"HB","policy":"refundable_credit","total":12112.5},{"plan":"RO","policy":"non_refundable","total":11506.875},{"plan":"RO","policy":"refundable_credit","total":12112.5}]},{"name":"Standard (Basement) (Non-AC)","from":"2026-11-13","to":"2026-11-16","quotes":[{"plan":"BB","policy":"non_refundable","total":10830},{"plan":"BB","policy":"refundable_credit","total":11400},{"plan":"FB","policy":"non_refundable","total":15675},{"plan":"FB","policy":"refundable_credit","total":16500},{"plan":"HB","policy":"non_refundable","total":13110},{"plan":"HB","policy":"refundable_credit","total":13800},{"plan":"RO","policy":"non_refundable","total":9975},{"plan":"RO","policy":"refundable_credit","total":10500}]},{"name":"Standard (Basement) (Non-AC)","from":"2026-11-20","to":"2026-11-23","quotes":[{"plan":"BB","policy":"non_refundable","total":31350},{"plan":"BB","policy":"refundable_credit","total":33000},{"plan":"FB","policy":"non_refundable","total":31350},{"plan":"FB","policy":"refundable_credit","total":33000},{"plan":"HB","policy":"non_refundable","total":31350},{"plan":"HB","policy":"refundable_credit","total":33000},{"plan":"RO","policy":"non_refundable","total":31350},{"plan":"RO","policy":"refundable_credit","total":33000}]},{"name":"Standard (Basement) (Non-AC)","from":"2027-04-02","to":"2027-04-05","quotes":[{"plan":"BB","policy":"non_refundable","total":9205.5},{"plan":"BB","policy":"refundable_credit","total":9690},{"plan":"FB","policy":"non_refundable","total":9205.5},{"plan":"FB","policy":"refundable_credit","total":9690},{"plan":"HB","policy":"non_refundable","total":9205.5},{"plan":"HB","policy":"refundable_credit","total":9690},{"plan":"RO","policy":"non_refundable","total":9205.5},{"plan":"RO","policy":"refundable_credit","total":9690}]},{"name":"Standard (Non-AC)","from":"2026-11-13","to":"2026-11-16","quotes":[]},{"name":"Standard (Non-AC)","from":"2026-11-20","to":"2026-11-23","quotes":[]},{"name":"Standard (Non-AC)","from":"2027-04-02","to":"2027-04-05","quotes":[]},{"name":"Superior","from":"2026-11-13","to":"2026-11-16","quotes":[{"plan":"BB","policy":"non_refundable","total":29355},{"plan":"BB","policy":"refundable_credit","total":30900},{"plan":"FB","policy":"non_refundable","total":34200},{"plan":"FB","policy":"refundable_credit","total":36000},{"plan":"HB","policy":"non_refundable","total":31635},{"plan":"HB","policy":"refundable_credit","total":33300},{"plan":"RO","policy":"non_refundable","total":28500},{"plan":"RO","policy":"refundable_credit","total":30000}]},{"name":"Superior","from":"2027-04-02","to":"2027-04-05","quotes":[{"plan":"BB","policy":"non_refundable","total":12361.87},{"plan":"BB","policy":"refundable_credit","total":13012.5},{"plan":"FB","policy":"non_refundable","total":17206.87},{"plan":"FB","policy":"refundable_credit","total":18112.5},{"plan":"HB","policy":"non_refundable","total":14641.87},{"plan":"HB","policy":"refundable_credit","total":15412.5},{"plan":"RO","policy":"non_refundable","total":11506.87},{"plan":"RO","policy":"refundable_credit","total":12112.5}]},{"name":"Superior (Loft)","from":"2026-11-13","to":"2026-11-16","quotes":[]},{"name":"Superior (Loft)","from":"2026-11-20","to":"2026-11-23","quotes":[]},{"name":"Superior (Loft)","from":"2027-04-02","to":"2027-04-05","quotes":[]}]'::jsonb) LOOP
SELECT coalesce(jsonb_agg(jsonb_build_object('plan',q->>'meal_plan_code','policy',q->>'cancellation_policy_code','total',(q->>'total_price')::numeric) ORDER BY q->>'meal_plan_code',q->>'cancellation_policy_code'),'[]'::jsonb) INTO actual_quotes FROM room_types r CROSS JOIN LATERAL jsonb_array_elements(calculate_rate_variants_v2(r.id,(j->>'from')::date,(j->>'to')::date,null,2,0,0,'direct')) q WHERE r.name=j->>'name';
IF actual_quotes IS DISTINCT FROM j->'quotes' THEN RAISE EXCEPTION 'Outside pricing changed: % % actual % expected %',j->>'name',j->>'from',actual_quotes,j->'quotes'; END IF;END LOOP;
END $verify$;
