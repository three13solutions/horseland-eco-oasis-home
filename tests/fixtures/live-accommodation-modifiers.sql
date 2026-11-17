CREATE OR REPLACE FUNCTION public.apply_accommodation_modifiers(p_room_type_id uuid, p_room_unit_id uuid, p_date date, p_channel text, p_room_only numeric, p_extra_accommodation numeric, p_included_fb_meals numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_price numeric:=p_room_only; v_before numeric; v_rule record; v_season uuid;
 v_rules jsonb:='[]'::jsonb; v_delta numeric; v_equivalent numeric; v_converted numeric;
begin
 if p_room_only is null or p_room_only<0 or p_extra_accommodation is null or p_extra_accommodation<0 or p_included_fb_meals is null or p_included_fb_meals<0 then raise exception 'Invalid accommodation modifier inputs'; end if;
 select s.id into v_season from public.seasons s join public.season_periods sp on sp.season_id=s.id
 where s.is_active and sp.year=extract(year from p_date) and
 ((sp.start_month<sp.end_month and ((extract(month from p_date)=sp.start_month and extract(day from p_date)>=sp.start_day) or (extract(month from p_date)>sp.start_month and extract(month from p_date)<sp.end_month) or (extract(month from p_date)=sp.end_month and extract(day from p_date)<=sp.end_day)))
 or(sp.start_month>sp.end_month and ((extract(month from p_date)=sp.start_month and extract(day from p_date)>=sp.start_day) or extract(month from p_date)>sp.start_month or extract(month from p_date)<sp.end_month or (extract(month from p_date)=sp.end_month and extract(day from p_date)<=sp.end_day)))
 or(sp.start_month=sp.end_month and extract(month from p_date)=sp.start_month and extract(day from p_date) between sp.start_day and sp.end_day)) limit 1;
 -- Quote RPC historically passes occupancy 0; do not invent live occupancy or change thresholds.
 select * into v_rule from public.occupancy_yield_rules where is_active and 0>=occupancy_threshold
 and(applies_to='all' or(applies_to='category' and room_type_id=p_room_type_id) or(applies_to='season' and season_id=v_season)) order by priority desc,occupancy_threshold desc limit 1;
 if found then
  v_before:=v_price;v_delta:=case when v_rule.price_adjustment_type='percentage' then v_price*v_rule.price_adjustment/100 else v_rule.price_adjustment end;v_price:=v_price+v_delta;
  v_rules:=v_rules||jsonb_build_object('type','occupancy_yield','id',v_rule.id,'name',v_rule.rule_name,'basis','room_only','before',v_before,'adjustment',v_delta,'after',v_price);
 end if;
 select * into v_rule from public.lead_time_rules where is_active and p_date-current_date between days_before_checkin_min and days_before_checkin_max
 and(applies_to='all' or(applies_to='category' and room_type_id=p_room_type_id) or(applies_to='season' and season_id=v_season)) order by priority desc limit 1;
 if found then
  v_before:=v_price;v_delta:=case when v_rule.price_adjustment_type='percentage' then v_price*v_rule.price_adjustment/100 else v_rule.price_adjustment end;v_price:=v_price+v_delta;
  v_rules:=v_rules||jsonb_build_object('type','lead_time','id',v_rule.id,'name',v_rule.rule_name,'basis','room_only','before',v_before,'adjustment',v_delta,'after',v_price);
 end if;
 -- Preserve existing ordering: explicit RO extras after yield/lead, before channel and limits.
 v_price:=v_price+p_extra_accommodation;
 select * into v_rule from public.channel_rules where is_active and channel_id=public.resolve_distribution_channel_id(p_channel)
 and(applies_to='all' or(applies_to='category' and room_type_id=p_room_type_id) or(applies_to='season' and season_id=v_season)) limit 1;
 if found then
  v_before:=v_price;v_delta:=case when v_rule.adjustment_type='percentage' then v_price*v_rule.adjustment_value/100 else v_rule.adjustment_value end;v_price:=v_price+v_delta;
  v_rules:=v_rules||jsonb_build_object('type','channel_adjustment','id',v_rule.id,'name',v_rule.channel_name,'basis','room_only_and_extra_accommodation','before',v_before,'adjustment',v_delta,'after',v_price);
 end if;
 -- Preserve stored limits as included-occupancy FB equivalent, NOT as RO limits.
 select * into v_rule from public.pricing_constraints where is_active and
 ((room_unit_id=p_room_unit_id and p_room_unit_id is not null) or(room_type_id=p_room_type_id and room_unit_id is null))
 order by case when room_unit_id is not null then 1 else 2 end limit 1;
 if found then
  v_equivalent:=v_price+p_included_fb_meals;v_before:=v_price;
  if v_rule.floor_price is not null and v_equivalent<v_rule.floor_price then
   v_converted:=v_rule.floor_price-p_included_fb_meals;
   if v_converted<0 then raise exception 'Inclusive floor cannot produce negative accommodation';end if;
   v_price:=v_converted;
   v_rules:=v_rules||jsonb_build_object('type','floor_constraint','id',v_rule.id,'basis','included_adults_fb_equivalent','stored_limit',v_rule.floor_price,'included_fb_meals',p_included_fb_meals,'before',v_before,'after',v_price);
  end if;
  v_equivalent:=v_price+p_included_fb_meals;v_before:=v_price;
  if v_rule.ceiling_price is not null and v_equivalent>v_rule.ceiling_price then
   v_converted:=v_rule.ceiling_price-p_included_fb_meals;
   if v_converted<0 then raise exception 'Inclusive ceiling cannot produce negative accommodation';end if;
   v_price:=v_converted;
   v_rules:=v_rules||jsonb_build_object('type','ceiling_constraint','id',v_rule.id,'basis','included_adults_fb_equivalent','stored_limit',v_rule.ceiling_price,'included_fb_meals',p_included_fb_meals,'before',v_before,'after',v_price);
  end if;
 end if;
 if v_price<0 then raise exception 'Dynamic rules produce negative accommodation';end if;
 return jsonb_build_object('accommodation',round(v_price,2),'adjustment',round(v_price-p_room_only-p_extra_accommodation,2),'rules',v_rules);
end $function$
