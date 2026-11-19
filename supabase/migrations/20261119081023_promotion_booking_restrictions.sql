SET LOCAL lock_timeout='5s';
-- Repository-only release; existing promotions remain unrestricted.
alter table public.website_promotions
 add column eligible_room_category_ids uuid[],
 add column eligible_meal_plan_codes text[],
 add column min_stay_nights integer check(min_stay_nights between 1 and 365),
 add column excluded_stay_dates date[] not null default '{}';
alter table public.website_promotions add constraint managed_promotion_room_scope check(eligible_room_category_ids is null or cardinality(eligible_room_category_ids)>0);
alter table public.website_promotions add constraint managed_promotion_meal_scope check(eligible_meal_plan_codes is null or (cardinality(eligible_meal_plan_codes)>0 and eligible_meal_plan_codes <@ array['RO','BB','HB','FB']::text[]));

alter function public.save_managed_website_promotion(jsonb,integer) rename to save_managed_website_promotion_pre_restrictions;
revoke all on function public.save_managed_website_promotion_pre_restrictions(jsonb,integer) from public,anon,authenticated;
create function public.save_managed_website_promotion(p_settings jsonb,p_expected_revision integer default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare existing public.website_promotions; saved jsonb; cats uuid[]; plans text[]; excluded date[]; minimum integer; settings jsonb;
begin
 if auth.uid() is null or not coalesce(public.is_admin_new(),false) then raise exception 'Administrator required' using errcode='42501'; end if;
 -- Serialize before deriving omitted fields so a concurrent save cannot replace restrictions silently.
 perform pg_advisory_xact_lock(hashtext('promotion:'||upper(trim(p_settings->>'code'))));
 select * into existing from public.website_promotions where code=upper(trim(p_settings->>'code')) for update;
 settings:=case when existing.code is null then p_settings else to_jsonb(existing)||p_settings end;
 if settings->'eligible_room_category_ids' is not null and settings->'eligible_room_category_ids'<>'null'::jsonb then
   if jsonb_typeof(settings->'eligible_room_category_ids')<>'array' then raise exception 'Invalid room categories'; end if;
   select array_agg(distinct x::uuid) into cats from jsonb_array_elements_text(settings->'eligible_room_category_ids') x;
   if cats is null then raise exception 'Select a room category or use unrestricted'; end if;
   if exists(select 1 from unnest(cats) as selected(category_id) where selected.category_id is null or not exists(select 1 from public.room_categories c where c.id=selected.category_id)) then raise exception 'Unknown room category'; end if;
 end if;
 if settings->'eligible_meal_plan_codes' is not null and settings->'eligible_meal_plan_codes'<>'null'::jsonb then
   if jsonb_typeof(settings->'eligible_meal_plan_codes')<>'array' then raise exception 'Invalid meal plans'; end if;
   select array_agg(distinct x) into plans from jsonb_array_elements_text(settings->'eligible_meal_plan_codes') x;
   if plans is null or not plans <@ array['RO','BB','HB','FB']::text[] or array_position(plans,null) is not null then raise exception 'Select valid meal plans or use unrestricted'; end if;
 end if;
 if settings->'min_stay_nights' is not null and settings->'min_stay_nights'<>'null'::jsonb then
   if settings->>'min_stay_nights' !~ '^[0-9]+$' then raise exception 'Minimum stay must be whole nights'; end if;
   minimum:=(settings->>'min_stay_nights')::integer;
   if minimum<1 or minimum>365 then raise exception 'Minimum stay must be between 1 and 365'; end if;
 end if;
 if settings ? 'excluded_stay_dates' and jsonb_typeof(settings->'excluded_stay_dates')<>'array' then raise exception 'Excluded dates must be an array'; end if;
 if exists(select 1 from jsonb_array_elements_text(coalesce(settings->'excluded_stay_dates','[]'::jsonb)) x where x is null or x !~ '^\d{4}-\d{2}-\d{2}$') then raise exception 'Invalid excluded date'; end if;
 select coalesce(array_agg(distinct x::date),'{}'::date[]) into excluded from jsonb_array_elements_text(coalesce(settings->'excluded_stay_dates','[]'::jsonb)) x;
 if cardinality(excluded)>0 and coalesce(settings->>'mixed_stay_mode','') not in ('all_nights','eligible_nights') then raise exception 'Choose an explicit mixed-stay policy for excluded dates'; end if;
 saved:=public.save_managed_website_promotion_pre_restrictions(settings,p_expected_revision);
 update public.website_promotions set eligible_room_category_ids=cats,eligible_meal_plan_codes=plans,min_stay_nights=minimum,excluded_stay_dates=excluded where code=saved->>'code' returning to_jsonb(website_promotions.*) into saved;
 return saved;
end $$;
revoke all on function public.save_managed_website_promotion(jsonb,integer) from public,anon;
grant execute on function public.save_managed_website_promotion(jsonb,integer) to authenticated;
-- Existing generic audit trigger records the reviewed update. No booking/payment mutation.
