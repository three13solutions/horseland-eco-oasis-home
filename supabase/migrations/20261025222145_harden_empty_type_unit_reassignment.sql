create or replace function public.unit_has_direct_pricing(p_unit uuid) returns boolean
language plpgsql stable security invoker set search_path=public as $$
declare t text; found_price boolean;
begin
 if exists(select 1 from public.room_units where id=p_unit and custom_pricing is not null and custom_pricing<>'{}'::jsonb) then return true; end if;
 foreach t in array array['tactical_overrides','pricing_constraints','seasonal_pricing','rate_plan_anchors','channel_rules','lead_time_rules','occupancy_yield_rules','meal_plan_rules','cancellation_policy_rules','guest_composition_rules','rate_card_cache'] loop
  execute format('select exists(select 1 from public.%I r where to_jsonb(r)->>''room_unit_id''=$1)',t) into found_price using p_unit::text;
  if found_price then return true; end if;
 end loop;
 return false;
end $$;

create or replace function public.guard_unit_pricing_setup() returns trigger
language plpgsql security invoker set search_path=public as $$
declare v_status text;
begin
 select pricing_status into v_status from public.room_types where id=new.room_type_id for update;
 if v_status<>'legacy' then
  if new.custom_pricing is not null and new.custom_pricing<>'{}'::jsonb then raise exception 'Use verified Rate Plans for this unit instead of legacy custom pricing'; end if;
  if tg_op='UPDATE' and new.room_type_id is distinct from old.room_type_id and public.unit_has_direct_pricing(old.id) then
   raise exception 'Clear this unit''s previous pricing before assigning it to a room type requiring complete pricing setup';
  end if;
 end if;
 return new;
end $$;

create or replace function public.guard_last_unit_pricing() returns trigger
language plpgsql security invoker set search_path=public as $$
begin
 if tg_op='DELETE' or new.room_type_id is distinct from old.room_type_id then
  perform 1 from public.room_types where id=old.room_type_id for update;
  if not exists(select 1 from public.room_units where room_type_id=old.room_type_id and id<>old.id)
    and (public.room_type_has_pricing(old.room_type_id) or public.unit_has_direct_pricing(old.id)) then
   raise exception 'This is the last assigned unit. Use Rate Plans > Clear pricing for this room type before removing or moving it. No pricing was deleted';
  end if;
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;

-- Add publication transition enforcement without changing existing publication flags.
do $$ declare d text; begin
 d:=pg_get_functiondef('public.guard_room_type_pricing_state()'::regprocedure);
 d:=replace(d,' return new;',E' if new.pricing_status=''configuration_required'' and new.is_published and (tg_op=''INSERT'' or not old.is_published) then\n  raise exception ''Complete pricing setup before publishing this room type'';\n end if;\n return new;');
 execute d;
end $$;

create or replace function public.get_room_type_pricing_cleanup_preview(p_type_id uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare r public.room_types%rowtype; v_units uuid[]; v_count integer; t text; n integer; v_hash text; v_hashes jsonb:='{}'; v_counts jsonb:='{}'; v_anchor_ids uuid[];
begin
 if auth.uid() is null or not public.is_admin_new() then raise exception 'Admin authorization required' using errcode='42501'; end if;
 select * into r from public.room_types where id=p_type_id;
 if not found then raise exception 'Room type not found'; end if;
 select coalesce(array_agg(id order by id),'{}'::uuid[]),count(*) into v_units,v_count from public.room_units where room_type_id=p_type_id;
 if v_count>1 then raise exception 'Clear pricing is available only for room types with zero or one assigned unit'; end if;
 foreach t in array array['tactical_overrides','guest_composition_rules','pricing_constraints','seasonal_pricing','rate_plan_anchors','channel_rules','lead_time_rules','occupancy_yield_rules','meal_plan_rules','cancellation_policy_rules','rate_card_cache'] loop
  execute format('select count(*),md5(coalesce(jsonb_agg(to_jsonb(x) order by id)::text,''[]'')) from public.%I x where x.room_type_id=$1 or (to_jsonb(x)->>''room_unit_id'')=any($2)',t)
  into n,v_hash using p_type_id,v_units::text[];
  v_counts:=v_counts||jsonb_build_object(t,n);v_hashes:=v_hashes||jsonb_build_object(t,v_hash);
 end loop;
 select array_agg(id) into v_anchor_ids from public.rate_plan_anchors where room_type_id=p_type_id or room_unit_id=any(v_units);
 select count(*),md5(coalesce(jsonb_agg(to_jsonb(x) order by id)::text,'[]')) into n,v_hash from public.rate_plan_anchor_versions x where anchor_id=any(v_anchor_ids);
 v_counts:=v_counts||jsonb_build_object('rate_plan_anchor_versions',n);v_hashes:=v_hashes||jsonb_build_object('rate_plan_anchor_versions',v_hash);
 select count(*),md5(coalesce(jsonb_agg(to_jsonb(x) order by override_id)::text,'[]')) into n,v_hash from public.rate_plan_managed_overrides x where anchor_id=any(v_anchor_ids) or override_id in(select id from tactical_overrides where room_type_id=p_type_id or room_unit_id=any(v_units));
 v_counts:=v_counts||jsonb_build_object('rate_plan_managed_overrides',n);v_hashes:=v_hashes||jsonb_build_object('rate_plan_managed_overrides',v_hash);
 select count(*),md5(coalesce(jsonb_agg(jsonb_build_object('id',id,'custom_pricing',custom_pricing) order by id)::text,'[]')) into n,v_hash from public.room_units where id=any(v_units) and custom_pricing is not null;
 v_counts:=v_counts||jsonb_build_object('unit_custom_pricing',n);v_hashes:=v_hashes||jsonb_build_object('unit_custom_pricing',v_hash);
 return jsonb_build_object('type_id',r.id,'name',r.name,'unit_count',v_count,'counts',v_counts,'base_price',r.base_price,'seasonal_pricing',r.seasonal_pricing,
 'fingerprint',md5(jsonb_build_array(r.id,r.name,r.base_price,r.seasonal_pricing,r.pricing_status,v_units,v_hashes)::text));
end $$;
revoke all on function public.get_room_type_pricing_cleanup_preview(uuid) from public,anon;
grant execute on function public.get_room_type_pricing_cleanup_preview(uuid) to authenticated;

create or replace function public.clear_room_type_pricing(p_type_id uuid,p_confirmation_name text,p_expected_fingerprint text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_preview jsonb; v_units uuid[]; v_anchors uuid[]; t text; v_other boolean;
begin
 if auth.uid() is null or not public.is_admin_new() then raise exception 'Admin authorization required' using errcode='42501'; end if;
 perform 1 from public.room_types where id=p_type_id for update;
 select coalesce(array_agg(id),'{}'::uuid[]) into v_units from public.room_units where room_type_id=p_type_id;
 perform 1 from public.room_units where id=any(v_units) for update;
 v_preview:=public.get_room_type_pricing_cleanup_preview(p_type_id);
 if p_confirmation_name is distinct from v_preview->>'name' or p_expected_fingerprint is distinct from v_preview->>'fingerprint' then
  raise exception 'Pricing or assignment changed, or confirmation does not match. Refresh the cleanup preview and confirm again';
 end if;
 select coalesce(array_agg(id),'{}'::uuid[]) into v_anchors from public.rate_plan_anchors where room_type_id=p_type_id or room_unit_id=any(v_units);
 -- Reject dependencies outside the preview scope instead of following a broad cascade.
 if exists(select 1 from public.rate_plan_anchors where source_override_id in(select id from tactical_overrides where room_type_id=p_type_id or room_unit_id=any(v_units)) and not(id=any(v_anchors))) then
  raise exception 'A rate outside this room type references these overrides; review that dependency before cleanup';
 end if;
 if exists(select 1 from public.rate_plan_managed_overrides m where m.anchor_id=any(v_anchors) and not exists(select 1 from public.tactical_overrides t where t.id=m.override_id and (t.room_type_id=p_type_id or t.room_unit_id=any(v_units)))) then
  raise exception 'This rate plan manages an override outside this room type; review ownership before cleanup';
 end if;
 if exists(select 1 from public.meal_supplement_versions where meal_plan_id in(select id from meal_plan_rules where room_type_id=p_type_id)) then
  raise exception 'Scoped meal plans have versioned supplements; review them separately before cleanup';
 end if;
 delete from public.rate_plan_managed_overrides where anchor_id=any(v_anchors) or override_id in(select id from tactical_overrides where room_type_id=p_type_id or room_unit_id=any(v_units));
 delete from public.rate_plan_anchor_versions where anchor_id=any(v_anchors);
 delete from public.rate_plan_anchors where id=any(v_anchors);
 foreach t in array array['tactical_overrides','guest_composition_rules','pricing_constraints','seasonal_pricing','channel_rules','lead_time_rules','occupancy_yield_rules','meal_plan_rules','cancellation_policy_rules','rate_card_cache'] loop
  execute format('delete from public.%I x where x.room_type_id=$1 or (to_jsonb(x)->>''room_unit_id'')=any($2)',t) using p_type_id,v_units::text[];
 end loop;
 update public.room_units set custom_pricing=null where id=any(v_units) and custom_pricing is not null;
 update public.room_types set base_price=null,seasonal_pricing='{}'::jsonb,pricing_status='configuration_required' where id=p_type_id;
 return jsonb_build_object('cleared',true,'type_id',p_type_id,'name',v_preview->>'name','removed_counts',v_preview->'counts','pricing_status','configuration_required');
end $$;
revoke all on function public.clear_room_type_pricing(uuid,text,text) from public,anon;
grant execute on function public.clear_room_type_pricing(uuid,text,text) to authenticated;

-- Include saved rate caches in the last-unit clear prerequisite.
do $$ declare d text; begin
 d:=pg_get_functiondef('public.room_type_has_pricing(uuid)'::regprocedure);
 d:=replace(d,' or exists(select 1 from public.tactical_overrides',E' or exists(select 1 from public.rate_card_cache where room_type_id=p_type)\n or exists(select 1 from public.tactical_overrides');
 execute d;
end $$;
create trigger guard_empty_type_pricing before insert or update on public.rate_card_cache
 for each row execute function public.guard_empty_type_pricing();
