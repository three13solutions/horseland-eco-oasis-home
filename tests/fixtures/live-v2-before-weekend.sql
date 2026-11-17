CREATE OR REPLACE FUNCTION public.calculate_rate_variants_v2(p_room_type_id uuid, p_check_in date, p_check_out date, p_room_unit_id uuid DEFAULT NULL::uuid, p_adults_count integer DEFAULT 2, p_children_count integer DEFAULT 0, p_infants_count integer DEFAULT 0, p_booking_channel text DEFAULT 'direct'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
 v_nights int:=p_check_out-p_check_in; v_category uuid; v_date date; v_day_type text;
 v_anchor public.rate_plan_anchors%rowtype; v_source_rate numeric; v_target_rate numeric;
 v_source_version uuid; v_target_version uuid; v_daily_anchor numeric; v_room numeric; v_extra numeric;
 v_meal numeric; v_total_room numeric; v_total_meal numeric; v_policy numeric; v_total numeric;
 v_extra_adults int; v_all_guests int:=p_adults_count+p_children_count+p_infants_count;
 v_plan record; v_cancel record; v_coverage jsonb:='[]'::jsonb; v_breakdown jsonb;
 v_result jsonb:='[]'::jsonb; v_variant jsonb; v_legacy jsonb; v_covered boolean:=true;
 v_los_discount numeric; v_entry jsonb; v_modifiers jsonb; v_accommodation numeric; v_fb_rate numeric;
BEGIN

  IF NOT EXISTS (SELECT 1 FROM public.room_types r WHERE r.id=p_room_type_id AND r.pricing_status<>'configuration_required' AND EXISTS(SELECT 1 FROM public.room_units u WHERE u.room_type_id=r.id)) THEN RETURN '[]'::jsonb; END IF;

 if p_check_in is null or p_check_out is null or p_adults_count is null or p_children_count is null or p_infants_count is null or v_nights<1 or v_nights>365
 or p_adults_count<1 or p_children_count<0 or p_infants_count<0 or v_all_guests>100 then
   raise exception 'Invalid stay dates or guest counts';
 end if;
 select category_id into v_category from public.room_types where id=p_room_type_id;
 if not found then raise exception 'Room type not found'; end if;
 if p_room_unit_id is not null then
   if not exists(select 1 from public.room_units where id=p_room_unit_id and room_type_id=p_room_type_id) then raise exception 'Unit does not belong to room type'; end if;
   select coalesce(category_id,v_category) into v_category from public.room_units where id=p_room_unit_id;
 end if;
 -- Resolve all nights before pricing. Mixed verified/unverified stays use unchanged legacy calculation.
 for v_date in select generate_series(p_check_in,p_check_out-1,'1 day')::date loop
   v_day_type:=case when extract(dow from v_date) in (0,5,6) then 'weekend' else 'weekday' end;
   select a.* into v_anchor from public.rate_plan_anchors a
   where a.is_active and a.verified_basis
    and (not exists(select 1 from public.room_types where id=p_room_type_id and pricing_status='ready') or a.room_type_id=p_room_type_id or a.room_unit_id=p_room_unit_id)
    and (a.start_date is null or v_date>=a.start_date) and(a.end_date is null or v_date<=a.end_date)
    and v_nights>=a.min_nights and(a.max_nights is null or v_nights<=a.max_nights)
    and (p_adults_count>=a.included_adults or a.included_adults=2) and a.day_type in ('all',v_day_type)
    and ((a.room_unit_id=p_room_unit_id and p_room_unit_id is not null)
      or a.room_type_id=p_room_type_id or a.room_category_id=v_category)
   order by case when a.room_unit_id is not null then 1 when a.room_type_id is not null then 2 else 3 end,
    a.priority desc,a.min_nights desc,case when a.day_type='all' then 1 else 0 end,a.updated_at desc,a.id
   limit 1;
   if not found then v_covered:=false; exit; end if;
   v_coverage:=v_coverage||jsonb_build_object('date',v_date,'anchor',to_jsonb(v_anchor));
 end loop;
 if not v_covered then
   if exists(select 1 from public.room_types where id=p_room_type_id and pricing_status='ready') then return '[]'::jsonb; end if;
   v_legacy:=public.calculate_rate_variants_legacy_20261025(p_room_type_id,p_check_in,p_check_out,p_room_unit_id,p_adults_count,p_children_count,p_infants_count,p_booking_channel);
   for v_variant in select value from jsonb_array_elements(v_legacy) loop
     v_result:=v_result||(v_variant||jsonb_build_object('pricing_status','legacy_basis_unverified',
       'pricing_message','Existing rate retained; source meal basis has not been confirmed. No new meal supplement applied.',
       'nightly_breakdown','[]'::jsonb,'quote_fingerprint',md5(jsonb_build_array(p_room_type_id,p_room_unit_id,p_check_in,p_check_out,p_adults_count,p_children_count,p_infants_count,p_booking_channel,v_variant)::text)));
   end loop;
   return v_result;
 end if;
 for v_plan in select * from public.meal_plan_rules where is_active order by display_order loop
   v_total_room:=0;v_total_meal:=0;v_breakdown:='[]'::jsonb;
   for v_entry in select value from jsonb_array_elements(v_coverage) loop
     v_date:=(v_entry->>'date')::date;
     select * into v_anchor from jsonb_populate_record(null::public.rate_plan_anchors,v_entry->'anchor');
     select amount,id into v_source_rate,v_source_version from public.meal_supplement_versions
      where plan_code=v_anchor.source_meal_plan_code and effective_from<=v_date order by effective_from desc,recorded_at desc,id limit 1;
     if v_source_rate is null then raise exception 'No approved source meal rate for % on %',v_anchor.source_meal_plan_code,v_date; end if;
     select amount,id into v_target_rate,v_target_version from public.meal_supplement_versions
      where meal_plan_id=v_plan.id and effective_from<=v_date order by effective_from desc,recorded_at desc,id limit 1;
     if v_target_rate is null then raise exception 'No approved meal rate for % on %',v_plan.plan_code,v_date; end if;
     v_daily_anchor:=v_anchor.amount/v_anchor.quoted_nights;
     v_los_discount:=0;
     if v_anchor.los_min_nights is not null and v_nights>=v_anchor.los_min_nights then
       v_los_discount:=case when v_anchor.los_adjustment_type='percentage' then v_daily_anchor*v_anchor.los_adjustment_value/100 else v_anchor.los_adjustment_value end;
     end if;
     v_daily_anchor:=round(v_daily_anchor-v_los_discount,2);
     v_room:=round(v_daily_anchor-v_source_rate*v_anchor.included_adults,2);
     if v_room<0 then raise exception 'Rate plan % yields negative accommodation. Review source price or meals.',v_anchor.name; end if;
     v_extra_adults:=greatest(0,p_adults_count-v_anchor.included_adults);
     if (v_extra_adults>0 and v_anchor.extra_adult_per_night is null) or(p_children_count>0 and v_anchor.extra_child_per_night is null) then
       raise exception 'Extra-person accommodation rate is not configured for %',v_anchor.name;
     end if;
     v_extra:=v_extra_adults*coalesce(v_anchor.extra_adult_per_night,0)+p_children_count*coalesce(v_anchor.extra_child_per_night,0)+p_infants_count*v_anchor.extra_infant_per_night;
     v_modifiers:=jsonb_build_object('accommodation',v_room+v_extra,'adjustment',0,'rules','[]'::jsonb);
     if v_anchor.modifier_policy='accommodation_dynamic' then
       select amount into v_fb_rate from public.meal_supplement_versions where plan_code='FB' and effective_from<=v_date order by effective_from desc,recorded_at desc,id limit 1;
       if v_fb_rate is null then raise exception 'No FB meal version for inclusive constraint conversion';end if;
       v_modifiers:=public.apply_accommodation_modifiers(p_room_type_id,p_room_unit_id,v_date,p_booking_channel,v_room,v_extra,v_fb_rate*v_anchor.included_adults);
     end if;
     v_accommodation:=(v_modifiers->>'accommodation')::numeric;
     v_meal:=v_target_rate*v_all_guests;
     v_total_room:=v_total_room+v_accommodation;v_total_meal:=v_total_meal+v_meal;
     v_breakdown:=v_breakdown||jsonb_build_object('date',v_date,'anchor_id',v_anchor.id,'anchor_name',v_anchor.name,
      'anchor_updated_at',v_anchor.updated_at,'source_override_id',v_anchor.source_override_id,
      'entered_amount',v_anchor.amount,'quoted_nights',v_anchor.quoted_nights,'source_plan',v_anchor.source_meal_plan_code,
      'included_adults',v_anchor.included_adults,'source_meal_rate',v_source_rate,'source_meal_version',v_source_version,
      'normalized_anchor',v_daily_anchor,'length_of_stay_discount',v_los_discount,'room_only',v_room,
      'extra_accommodation',v_extra,'extra_adults',v_extra_adults,'extra_children',p_children_count,'infants',p_infants_count,
      'modifier_policy',v_anchor.modifier_policy,'accommodation_after_modifiers',v_accommodation,'dynamic_adjustment',v_modifiers->'adjustment','dynamic_rules',v_modifiers->'rules',
      'selected_meal_rate',v_target_rate,'selected_meal_version',v_target_version,'meal_guests',v_all_guests,'meal_cost',v_meal);
   end loop;
   for v_cancel in select * from public.cancellation_policy_rules where is_active order by display_order loop
     v_policy:=case when v_cancel.adjustment_type='percentage' then (v_total_room+v_total_meal)*v_cancel.adjustment_value/100
                    when v_cancel.adjustment_type='fixed' then v_cancel.adjustment_value else 0 end;
     v_policy:=round(v_policy,2);v_total:=round(v_total_room+v_total_meal+v_policy,2);
     if v_total<0 then raise exception 'Cancellation adjustment produces negative price'; end if;
     v_variant:=jsonb_build_object('meal_plan_code',v_plan.plan_code,'meal_plan_name',v_plan.plan_name,'meal_plan_description',v_plan.description,
      'included_meals',v_plan.included_meal_types,'meal_breakdown',v_breakdown,'nightly_breakdown',v_breakdown,
      'cancellation_policy_code',v_cancel.policy_code,'cancellation_policy_name',v_cancel.policy_name,'cancellation_terms',v_cancel.cancellation_terms,
      'room_rate',v_total_room,'meal_cost',v_total_meal,'policy_adjustment',v_policy,'total_price',v_total,
      'price_per_night',round(v_total/v_nights,2),'pricing_status','verified',
      'is_featured',coalesce(v_plan.is_featured,false) or coalesce(v_cancel.is_featured,false),
      'savings',greatest(-v_policy,0),'discount_percentage',case when v_cancel.adjustment_type='percentage' and v_cancel.adjustment_value<0 then abs(v_cancel.adjustment_value) else 0 end);
     v_result:=v_result||(v_variant||jsonb_build_object('quote_fingerprint',md5(jsonb_build_array(p_room_type_id,p_room_unit_id,p_check_in,p_check_out,p_adults_count,p_children_count,p_infants_count,p_booking_channel,v_variant)::text)));
   end loop;
 end loop;
 return v_result;
end $function$

