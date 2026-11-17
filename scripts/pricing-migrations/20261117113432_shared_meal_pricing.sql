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
