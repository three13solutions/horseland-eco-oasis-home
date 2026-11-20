CREATE FUNCTION guest_pricing_private.scoped_guest_accommodation(p_anchor jsonb,p_counts jsonb,p_room_type uuid,p_room_unit uuid,p_date date,p_nights integer,p_meal text) RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE anchor jsonb:=p_anchor; charges jsonb:=coalesce(p_anchor->'guest_type_charges','{}'); band jsonb; policy jsonb; comp public.guest_composition_rules%rowtype; ov public.tactical_overrides%rowtype; category uuid; day text; key text; rate numeric; sources jsonb:='{}'; result jsonb; rows jsonb:='[]'; entry jsonb;
BEGIN
 SELECT coalesce(u.category_id,r.category_id) INTO category FROM public.room_types r LEFT JOIN public.room_units u ON u.id=p_room_unit AND u.room_type_id=r.id WHERE r.id=p_room_type;
 day:=CASE WHEN public.is_pricing_weekend(p_date,array[0,5,6],p_room_type) THEN 'weekend' ELSE 'weekday' END;
 policy:=guest_pricing_private.get_booking_guest_policy();
 SELECT * INTO comp FROM public.guest_composition_rules WHERE is_active AND (room_type_id=p_room_type OR room_type_id IS NULL) ORDER BY (room_type_id IS NOT NULL) DESC,created_at DESC,id LIMIT 1;
 FOR band IN SELECT value FROM jsonb_array_elements(policy->'bands') LOOP
  key:=band->>'key';
  IF coalesce((p_counts->>key)::integer,0)=0 THEN CONTINUE; END IF;
  IF comp.id IS NOT NULL THEN
   IF comp.guest_type_charges ? key THEN
    charges:=jsonb_set(charges,ARRAY[key],CASE WHEN comp.guest_type_charges->key->>'mode'='same_as_adult' THEN jsonb_build_object('mode','fixed','amount',comp.extra_adult_charge) ELSE comp.guest_type_charges->key END);
    sources:=jsonb_set(sources,ARRAY[key],jsonb_build_object('composition_id',comp.id));
   END IF;
  END IF;
  SELECT * INTO ov FROM public.tactical_overrides t WHERE t.is_active AND NOT public.rate_override_disabled(t.id)
   AND (t.guest_type_key=key OR t.occupancy_type='extra_'||key) AND p_date BETWEEN t.start_date AND t.end_date
   AND (t.min_nights IS NULL OR p_nights>=t.min_nights) AND (t.max_nights IS NULL OR p_nights<=t.max_nights)
   AND (t.day_type IS NULL OR t.day_type IN ('all',day)) AND (t.meal_plan_code IS NULL OR t.meal_plan_code=p_meal)
   AND ((t.room_unit_id=p_room_unit AND p_room_unit IS NOT NULL) OR (t.room_unit_id IS NULL AND t.room_type_id=p_room_type) OR (t.room_unit_id IS NULL AND t.room_type_id IS NULL AND t.room_category_id=category))
   ORDER BY CASE WHEN t.room_unit_id IS NOT NULL THEN 1 WHEN t.room_type_id IS NOT NULL THEN 2 ELSE 3 END,t.created_at DESC,t.id LIMIT 1;
  IF ov.id IS NOT NULL THEN
   rate:=ov.adjustment_value;
   IF ov.adjustment_type IS DISTINCT FROM 'fixed' OR rate IS NULL OR rate<0 THEN RAISE EXCEPTION 'Guest override requires a configured fixed accommodation rate'; END IF;
   charges:=jsonb_set(charges,ARRAY[key],jsonb_build_object('mode','fixed','amount',rate));
   sources:=jsonb_set(sources,ARRAY[key],jsonb_build_object('override_id',ov.id));
  END IF;
 END LOOP;
 anchor:=jsonb_set(anchor,'{guest_type_charges}',charges);
 result:=guest_pricing_private.guest_type_accommodation_charge(anchor,p_counts);
 FOR entry IN SELECT value FROM jsonb_array_elements(result->'bands') LOOP
  rows:=rows||jsonb_build_array(entry||coalesce(sources->(entry->>'guest_type_key'),'{}'));
 END LOOP;
 RETURN result||jsonb_build_object('bands',rows);
END $$;
REVOKE ALL ON FUNCTION guest_pricing_private.scoped_guest_accommodation(jsonb,jsonb,uuid,uuid,date,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION guest_pricing_private.scoped_guest_accommodation(jsonb,jsonb,uuid,uuid,date,integer,text) TO service_role;
DO $$ DECLARE d text; old text:='guest_pricing_private.guest_type_accommodation_charge(to_jsonb(v_anchor),p_guest_counts)'; BEGIN
 d:=pg_get_functiondef('public.calculate_keyed_rate_variants_engine(uuid,date,date,uuid,integer,integer,integer,text,jsonb)'::regprocedure);
 IF strpos(d,old)=0 THEN RAISE EXCEPTION 'Reviewed keyed accommodation call not found'; END IF;
 d:=replace(d,old,'guest_pricing_private.scoped_guest_accommodation(to_jsonb(v_anchor),p_guest_counts,p_room_type_id,p_room_unit_id,v_date,v_nights,v_plan.plan_code)'); EXECUTE d;
END $$;