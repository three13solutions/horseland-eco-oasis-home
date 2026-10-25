begin;
lock table public.room_types,public.room_units in share row exclusive mode;
create temporary table empty_cleanup_targets on commit drop as
select id,name from public.room_types r where name in('Balcony Rooms','Bamboo Cabins','Classic Pods','Loft Rooms','Playside Rooms','Pool Deck Rooms','Poolview Rooms')
and not exists(select 1 from public.room_units u where u.room_type_id=r.id);
do $$ begin
 if (select count(*) from empty_cleanup_targets)<>7 then raise exception 'Expected exactly seven empty room types; cleanup aborted'; end if;
 if (select count(*) from public.tactical_overrides where room_type_id in(select id from empty_cleanup_targets))<>7
 or (select count(*) from public.guest_composition_rules where room_type_id in(select id from empty_cleanup_targets))<>7
 or (select count(*) from public.pricing_constraints where room_type_id in(select id from empty_cleanup_targets))<>7 then raise exception 'Pricing dependency counts changed; cleanup aborted'; end if;
 if exists(select 1 from public.tactical_overrides where room_type_id in(select id from empty_cleanup_targets) and end_date>=current_date)
 or exists(select 1 from public.rate_plan_anchors where room_type_id in(select id from empty_cleanup_targets)) then raise exception 'Unexpected current pricing; cleanup aborted'; end if;
end $$;
delete from public.tactical_overrides where room_type_id in(select id from empty_cleanup_targets);
delete from public.guest_composition_rules where room_type_id in(select id from empty_cleanup_targets);
delete from public.pricing_constraints where room_type_id in(select id from empty_cleanup_targets);
update public.room_types set base_price=null,seasonal_pricing='{}'::jsonb,pricing_status='configuration_required'
where id in(select id from empty_cleanup_targets);
create trigger guard_room_type_pricing_state before insert or update on public.room_types
 for each row execute function public.guard_room_type_pricing_state();
select jsonb_agg(jsonb_build_object('name',r.name,'base_price',r.base_price,'pricing_status',r.pricing_status)) result
from public.room_types r where id in(select id from empty_cleanup_targets);
commit;
