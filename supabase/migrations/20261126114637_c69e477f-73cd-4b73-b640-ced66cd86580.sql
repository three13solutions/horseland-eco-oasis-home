CREATE OR REPLACE FUNCTION public.room_rate_management_grid(p_from date,p_to date) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin_new() THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501'; END IF;
 IF p_from IS NULL OR p_to IS NULL OR p_to<p_from OR p_to-p_from>365 THEN RAISE EXCEPTION 'Choose a valid range of up to 366 nights'; END IF;
 SELECT jsonb_build_object('categories',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'name',name,'is_active',is_active) ORDER BY sort_order,name) FROM room_categories),'[]'::jsonb),'entries',coalesce(jsonb_agg(entry ORDER BY entry->>'category_id',entry->>'date',entry->>'type_id'),'[]'::jsonb)) INTO result
 FROM (
 SELECT jsonb_build_object('category_id',r.category_id,'type_id',r.id,'type_name',r.name,'date',d.dt::date,'weekend',public.is_pricing_weekend(d.dt::date,array[0,5,6],r.id),'ep',CASE WHEN a.source_meal_plan_code='RO' THEN a.amount/a.quoted_nights ELSE NULL END,'adult',a.extra_adult_per_night,'child',a.extra_child_per_night,'editable',r.pricing_status<>'configuration_required' AND public.get_pricing_preservation_policy(r.id,d.dt::date) IS NULL AND (a.id IS NULL OR (a.source_meal_plan_code='RO' AND a.source_override_id IS NULL)),'reason',CASE WHEN r.pricing_status='configuration_required' THEN 'Complete room-type pricing setup first' WHEN public.get_pricing_preservation_policy(r.id,d.dt::date) IS NOT NULL THEN 'Protected date-specific pricing policy' WHEN a.source_override_id IS NOT NULL OR a.source_meal_plan_code<>'RO' THEN 'Package or override basis: manage in Rate Plans' ELSE NULL END,'fingerprint',md5(jsonb_build_array(to_jsonb(r),public.get_pricing_preservation_policy(r.id,d.dt::date),public.is_pricing_weekend(d.dt::date,array[0,5,6],r.id),coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.id) FROM rate_plan_anchors x WHERE (x.room_type_id=r.id OR x.room_category_id=r.category_id OR x.room_unit_id IN (SELECT id FROM room_units WHERE room_type_id=r.id)) AND (x.start_date IS NULL OR x.start_date<=d.dt::date) AND (x.end_date IS NULL OR x.end_date>=d.dt::date)),'[]'::jsonb))::text)) entry
 FROM room_types r CROSS JOIN generate_series(p_from,p_to,interval '1 day') d(dt)
 LEFT JOIN LATERAL (SELECT x.* FROM rate_plan_anchors x WHERE x.is_active AND x.verified_basis AND x.room_unit_id IS NULL AND (x.room_type_id=r.id OR (x.room_category_id=r.category_id AND r.pricing_status<>'ready')) AND (x.start_date IS NULL OR x.start_date<=d.dt::date) AND (x.end_date IS NULL OR x.end_date>=d.dt::date) AND x.min_nights<=1 AND (x.max_nights IS NULL OR x.max_nights>=1) AND x.included_adults=2 AND x.day_type IN ('all',CASE WHEN public.is_pricing_weekend(d.dt::date,array[0,5,6],r.id) THEN 'weekend' ELSE 'weekday' END) ORDER BY CASE WHEN x.room_type_id IS NOT NULL THEN 2 ELSE 3 END,x.priority DESC,x.min_nights DESC,CASE WHEN x.day_type='all' THEN 1 ELSE 0 END,x.updated_at DESC,x.id LIMIT 1) a ON true
 WHERE r.category_id IS NOT NULL AND EXISTS(SELECT 1 FROM room_units u WHERE u.room_type_id=r.id)
 ) q;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.room_rate_management_grid(date,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.room_rate_management_grid(date,date) TO authenticated;

CREATE OR REPLACE FUNCTION public.save_room_rate_management(p_changes jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE item jsonb; e jsonb; grid jsonb; a public.rate_plan_anchors%rowtype; n public.rate_plan_anchors%rowtype; target date; typ uuid; cat uuid; changed integer:=0; found_source boolean; k text;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin_new() THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(p_changes) IS DISTINCT FROM 'array' OR jsonb_array_length(p_changes)=0 THEN RAISE EXCEPTION 'No changes to save'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_changes) x GROUP BY x->>'type_id',x->>'date' HAVING count(*)>1) THEN RAISE EXCEPTION 'Duplicate room/date changes'; END IF;
 LOCK TABLE public.rate_plan_anchors,public.room_types,public.room_units,public.pricing_day_rules,public.pricing_preservation_periods IN SHARE ROW EXCLUSIVE MODE;
 SELECT public.room_rate_management_grid(min((x->>'date')::date),max((x->>'date')::date)) INTO grid FROM jsonb_array_elements(p_changes) x;
 -- Validate the complete batch before any write; no partial saves.
 FOR item IN SELECT value FROM jsonb_array_elements(p_changes) LOOP
  SELECT value INTO e FROM jsonb_array_elements(grid->'entries') WHERE value->>'type_id'=item->>'type_id' AND value->>'date'=item->>'date';
  IF e IS NULL OR e->>'fingerprint' IS DISTINCT FROM item->>'fingerprint' THEN RAISE EXCEPTION 'Rates changed while editing. Refresh and review again.' USING ERRCODE='40001'; END IF;
  IF NOT (e->>'editable')::boolean THEN RAISE EXCEPTION '%: %',e->>'type_name',e->>'reason'; END IF;
  IF NOT (item ? 'ep' OR item ? 'adult' OR item ? 'child') THEN RAISE EXCEPTION 'Choose at least one rate to update'; END IF;
  FOREACH k IN ARRAY ARRAY['ep','adult','child'] LOOP
   IF item ? k AND (jsonb_typeof(item->k)<>'number' OR (item->>k)::numeric<0 OR (item->>k)::numeric<>round((item->>k)::numeric,2)) THEN RAISE EXCEPTION 'Rates must be non-negative amounts with at most two decimal places'; END IF;
  END LOOP;
  IF e->>'ep' IS NULL AND NOT (item ? 'ep' AND item ? 'adult' AND item ? 'child') THEN RAISE EXCEPTION 'Enter all three rates when creating a new EP rate'; END IF;
 END LOOP;
 FOR item IN SELECT value FROM jsonb_array_elements(p_changes) ORDER BY value->>'date',value->>'type_id' LOOP
  target:=(item->>'date')::date;typ:=(item->>'type_id')::uuid;SELECT category_id INTO cat FROM room_types WHERE id=typ;found_source:=false;
  -- Split only normal EP references. Keep stay tiers, modifiers, custom guest links and all dates outside the edit.
  FOR a IN SELECT x.* FROM rate_plan_anchors x WHERE x.room_type_id=typ AND x.room_unit_id IS NULL AND x.is_active AND x.verified_basis AND x.source_meal_plan_code='RO' AND x.source_override_id IS NULL AND (x.start_date IS NULL OR x.start_date<=target) AND (x.end_date IS NULL OR x.end_date>=target) AND x.day_type IN ('all',CASE WHEN public.is_pricing_weekend(target,array[0,5,6],typ) THEN 'weekend' ELSE 'weekday' END) LOOP
   found_source:=true;n:=a;
   IF a.start_date=target AND a.end_date=target THEN
    n.id:=a.id;
   ELSE
    IF a.end_date IS NULL OR a.end_date>target THEN
     n:=a;n.id:=gen_random_uuid();n.start_date:=target+1;n.created_at:=now();n.updated_at:=now();INSERT INTO rate_plan_anchors SELECT (n).*;
    END IF;
    IF a.start_date IS NULL OR a.start_date<target THEN UPDATE rate_plan_anchors SET end_date=target-1 WHERE id=a.id;
    ELSE UPDATE rate_plan_anchors SET is_active=false WHERE id=a.id; END IF;
    n:=a;n.id:=gen_random_uuid();n.start_date:=target;n.end_date:=target;n.created_at:=now();n.updated_at:=now();
   END IF;
   IF item ? 'ep' THEN n.amount:=(item->>'ep')::numeric*n.quoted_nights; END IF;
   IF item ? 'adult' THEN n.extra_adult_per_night:=(item->>'adult')::numeric; END IF;
   IF item ? 'child' THEN n.extra_child_per_night:=(item->>'child')::numeric;n.guest_type_charges:=jsonb_set(n.guest_type_charges,'{child}',jsonb_build_object('mode','custom','amount',(item->>'child')::numeric),true); END IF;
   IF n.id=a.id THEN UPDATE rate_plan_anchors SET amount=n.amount,extra_adult_per_night=n.extra_adult_per_night,extra_child_per_night=n.extra_child_per_night,guest_type_charges=n.guest_type_charges WHERE id=a.id;
   ELSE INSERT INTO rate_plan_anchors SELECT (n).*; END IF;
  END LOOP;
  IF NOT found_source THEN
   SELECT x.* INTO a FROM rate_plan_anchors x WHERE x.room_category_id=cat AND x.is_active AND x.verified_basis AND x.source_meal_plan_code='RO' AND x.source_override_id IS NULL AND (x.start_date IS NULL OR x.start_date<=target) AND (x.end_date IS NULL OR x.end_date>=target) AND x.min_nights=1 AND x.max_nights IS NULL AND x.day_type IN ('all',CASE WHEN public.is_pricing_weekend(target,array[0,5,6],typ) THEN 'weekend' ELSE 'weekday' END) ORDER BY x.priority DESC,x.updated_at DESC LIMIT 1;
   IF a.id IS NOT NULL THEN n:=a;n.id:=gen_random_uuid();n.room_category_id:=NULL;n.room_type_id:=typ;n.start_date:=target;n.end_date:=target;n.created_at:=now();n.updated_at:=now();
    IF item ? 'ep' THEN n.amount:=(item->>'ep')::numeric*n.quoted_nights; END IF;
    IF item ? 'adult' THEN n.extra_adult_per_night:=(item->>'adult')::numeric; END IF;
    IF item ? 'child' THEN n.extra_child_per_night:=(item->>'child')::numeric;n.guest_type_charges:=jsonb_set(n.guest_type_charges,'{child}',jsonb_build_object('mode','custom','amount',(item->>'child')::numeric),true); END IF;
    INSERT INTO rate_plan_anchors SELECT (n).*;
   ELSE
    IF NOT (item ? 'ep' AND item ? 'adult' AND item ? 'child') THEN RAISE EXCEPTION 'Enter all three rates for a new EP reference'; END IF;
    INSERT INTO rate_plan_anchors(name,room_type_id,amount,source_meal_plan_code,quoted_nights,included_adults,start_date,end_date,min_nights,day_type,extra_adult_per_night,extra_child_per_night,extra_infant_per_night,guest_type_charges,is_active,verified_basis,modifier_policy)
    VALUES('Room Rate Management · '||target,typ,(item->>'ep')::numeric,'RO',1,2,target,target,1,'all',(item->>'adult')::numeric,(item->>'child')::numeric,0,jsonb_build_object('child',jsonb_build_object('mode','custom','amount',(item->>'child')::numeric)),true,true,'none');
   END IF;
  END IF;
  changed:=changed+1;
 END LOOP;
 RETURN jsonb_build_object('saved',changed);
END $$;
REVOKE ALL ON FUNCTION public.save_room_rate_management(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_room_rate_management(jsonb) TO authenticated;