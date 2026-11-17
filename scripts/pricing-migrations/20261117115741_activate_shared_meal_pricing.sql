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
