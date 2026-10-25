-- Empty room types have genuinely unset pricing, never a zero fallback.
-- Existing populated types retain their prior calculation and migration state.
alter table public.room_types alter column base_price drop not null;
alter table public.room_types alter column base_price drop default;
alter table public.room_types add column pricing_status text not null default 'legacy'
 check(pricing_status in ('legacy','configuration_required','ready'));
alter table public.room_types alter column pricing_status set default 'configuration_required';

create or replace function public.room_type_has_pricing(p_type uuid) returns boolean
language sql stable security invoker set search_path=public as $$
 select exists(select 1 from public.room_types where id=p_type and (base_price is not null or coalesce(seasonal_pricing,'{}'::jsonb)<>'{}'::jsonb))
 or exists(select 1 from public.tactical_overrides where room_type_id=p_type)
 or exists(select 1 from public.guest_composition_rules where room_type_id=p_type)
 or exists(select 1 from public.pricing_constraints where room_type_id=p_type)
 or exists(select 1 from public.seasonal_pricing where room_type_id=p_type)
 or exists(select 1 from public.rate_plan_anchors where room_type_id=p_type)
 or exists(select 1 from public.channel_rules where room_type_id=p_type)
 or exists(select 1 from public.lead_time_rules where room_type_id=p_type)
 or exists(select 1 from public.occupancy_yield_rules where room_type_id=p_type)
 or exists(select 1 from public.meal_plan_rules where room_type_id=p_type)
 or exists(select 1 from public.cancellation_policy_rules where room_type_id=p_type)
$$;

create or replace function public.guard_empty_type_pricing() returns trigger
language plpgsql security invoker set search_path=public as $$
declare v_type uuid; v_unit uuid;
begin
 v_type:=(to_jsonb(new)->>'room_type_id')::uuid;
 v_unit:=(to_jsonb(new)->>'room_unit_id')::uuid;
 if v_type is null and v_unit is not null then select room_type_id into v_type from public.room_units where id=v_unit; end if;
 if v_type is not null then
  perform 1 from public.room_types where id=v_type for update;
  if not exists(select 1 from public.room_units where room_type_id=v_type) then
   raise exception 'Assign a room unit before configuring prices or policies for this room type';
  end if;
 end if;
 return new;
end $$;

do $$ declare t text; begin
 foreach t in array array['tactical_overrides','guest_composition_rules','pricing_constraints','seasonal_pricing','rate_plan_anchors','channel_rules','lead_time_rules','occupancy_yield_rules','meal_plan_rules','cancellation_policy_rules'] loop
 execute format('create trigger guard_empty_type_pricing before insert or update on public.%I for each row execute function public.guard_empty_type_pricing()',t);
 end loop;
end $$;

create or replace function public.guard_room_type_pricing_state() returns trigger
language plpgsql security invoker set search_path=public as $$
begin
 if not exists(select 1 from public.room_units where room_type_id=new.id) then
  if new.base_price is not null or coalesce(new.seasonal_pricing,'{}'::jsonb)<>'{}'::jsonb then
   raise exception 'Empty room types must have blank pricing. Assign a unit and complete Rate Plans setup first';
  end if;
  new.pricing_status:='configuration_required';
 elsif new.pricing_status='ready' and not exists(
   select 1 from public.rate_plan_anchors a where (a.room_type_id=new.id or a.room_unit_id in(select id from public.room_units where room_type_id=new.id)) and a.is_active and a.verified_basis
     and a.extra_adult_per_night is not null and a.extra_child_per_night is not null
 ) then
  raise exception 'Complete and activate a verified rate plan before marking pricing ready';
 elsif tg_op='UPDATE' and old.pricing_status<>'legacy' and new.pricing_status='legacy' then
  raise exception 'Newly configured room types cannot bypass Rate Plans setup using legacy pricing';
 end if;
 return new;
end $$;
-- Install only after the one-time approved cleanup has blanked existing empty types.

create or replace function public.guard_last_unit_pricing() returns trigger
language plpgsql security invoker set search_path=public as $$
begin
 if tg_op='DELETE' or new.room_type_id is distinct from old.room_type_id then
  perform 1 from public.room_types where id=old.room_type_id for update;
  if not exists(select 1 from public.room_units where room_type_id=old.room_type_id and id<>old.id)
    and public.room_type_has_pricing(old.room_type_id) then
   raise exception 'This is the last assigned unit. Explicitly clear this room type''s pricing and policies before removing or moving it. No pricing was deleted';
  end if;
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
create trigger guard_last_unit_pricing before update of room_type_id or delete on public.room_units
 for each row execute function public.guard_last_unit_pricing();

create or replace function public.guard_unit_pricing_setup() returns trigger
language plpgsql security invoker set search_path=public as $$
declare v_status text;
begin
 select pricing_status into v_status from public.room_types where id=new.room_type_id for update;
 if v_status<>'legacy' and new.custom_pricing is not null and new.custom_pricing<>'{}'::jsonb then
  raise exception 'Use verified Rate Plans for this unit instead of legacy custom pricing';
 end if;
 return new;
end $$;
create trigger guard_unit_pricing_setup before insert or update of room_type_id,custom_pricing on public.room_units
 for each row execute function public.guard_unit_pricing_setup();

create or replace function public.refresh_room_type_pricing_state() returns trigger
language plpgsql security invoker set search_path=public as $$
declare v_type uuid; v_old_type uuid;
begin
 if tg_table_name='room_units' then
  if tg_op<>'INSERT' then v_old_type:=old.room_type_id; end if;
  if tg_op<>'DELETE' then v_type:=new.room_type_id; end if;
 else
  if tg_op<>'INSERT' then
   v_old_type:=old.room_type_id;
   if v_old_type is null and old.room_unit_id is not null then select room_type_id into v_old_type from public.room_units where id=old.room_unit_id; end if;
  end if;
  if tg_op<>'DELETE' then
   v_type:=new.room_type_id;
   if v_type is null and new.room_unit_id is not null then select room_type_id into v_type from public.room_units where id=new.room_unit_id; end if;
  end if;
 end if;
 for v_type in select distinct x from unnest(array[v_type,v_old_type]) x where x is not null loop
  update public.room_types r set pricing_status=case
   when not exists(select 1 from public.room_units where room_type_id=r.id) then 'configuration_required'
   when exists(select 1 from public.rate_plan_anchors a where (a.room_type_id=r.id or a.room_unit_id in(select id from public.room_units where room_type_id=r.id)) and a.is_active and a.verified_basis and a.extra_adult_per_night is not null and a.extra_child_per_night is not null) then 'ready'
   else 'configuration_required' end
  where r.id=v_type and (r.pricing_status<>'legacy' or not exists(select 1 from public.room_units where room_type_id=r.id));
 end loop;
 return null;
end $$;
create trigger refresh_type_pricing_after_assignment after insert or update of room_type_id or delete on public.room_units
 for each row execute function public.refresh_room_type_pricing_state();
create trigger refresh_type_pricing_after_anchor after insert or update or delete on public.rate_plan_anchors
 for each row execute function public.refresh_room_type_pricing_state();

-- All quote entry points refuse zero-unit/unconfigured types, including old cached clients.
-- Existing populated legacy calculations are unchanged.
do $patch$
declare r record; d text; guard text;
begin
 for r in select p.oid,p.proname from pg_proc p where p.pronamespace='public'::regnamespace and p.proname in
 ('calculate_rate_variants','calculate_rate_variants_legacy_20261025','calculate_rate_variants_v2','calculate_dynamic_price','calculate_dynamic_price_legacy_20261025','get_base_price_for_date') loop
  d:=pg_get_functiondef(r.oid);
  guard:=E'\n  IF NOT EXISTS (SELECT 1 FROM public.room_types r WHERE r.id=p_room_type_id AND r.pricing_status<>''configuration_required'' AND EXISTS(SELECT 1 FROM public.room_units u WHERE u.room_type_id=r.id)) THEN ';
  if r.proname like 'calculate_rate_variants%' then guard:=guard||'RETURN ''[]''::jsonb;'; else guard:=guard||'RETURN;'; end if;
  guard:=guard||E' END IF;\n';
  if r.proname<>'calculate_rate_variants_v2' then
   guard:=guard||E' IF EXISTS(SELECT 1 FROM public.room_types WHERE id=p_room_type_id AND pricing_status=''ready'') THEN ';
   if r.proname like 'calculate_rate_variants%' then guard:=guard||'RETURN ''[]''::jsonb;'; else guard:=guard||'RETURN;'; end if;
   guard:=guard||E' END IF;\n';
  else
   d:=replace(d,'if not v_covered then',E'if not v_covered then\n   if exists(select 1 from public.room_types where id=p_room_type_id and pricing_status=''ready'') then return ''[]''::jsonb; end if;');
   -- A reopened type must have explicit direct pricing, not inherited category defaults.
   d:=replace(d,'where a.is_active and a.verified_basis',E'where a.is_active and a.verified_basis\n    and (not exists(select 1 from public.room_types where id=p_room_type_id and pricing_status=''ready'') or a.room_type_id=p_room_type_id or a.room_unit_id=p_room_unit_id)');
  end if;
  d:=regexp_replace(d,'\mBEGIN\M',E'BEGIN\n'||guard,'i');
  execute d;
 end loop;
end $patch$;
