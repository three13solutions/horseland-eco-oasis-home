DO $$ DECLARE d text; BEGIN
 d:=pg_get_functiondef('public.calculate_keyed_rate_variants_engine(uuid,date,date,uuid,integer,integer,integer,text,jsonb)'::regprocedure);
 d:=replace(d,'if (v_extra_adults>0 and v_anchor.extra_adult_per_night is null) or(p_children_count>0 and v_anchor.extra_child_per_night is null) then','if false then');
 EXECUTE d;
 d:=pg_get_functiondef('guest_pricing_private.calculate_guest_type_rate_variants(uuid,date,date,jsonb,integer,uuid,text,boolean)'::regprocedure);
 d:=replace(d,'IF p_website THEN offered:=public.calculate_website_rate_variants(p_room_type_id,p_check_in,p_check_out,p_room_unit_id,a,c,i,p_booking_channel); END IF;','IF p_website THEN IF public.distribution_website_type_availability(p_room_type_id,p_check_in,p_check_out)=0 THEN RETURN ''[]''::jsonb; END IF; END IF;');
 d:=replace(d,'IF p_website AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(offered) x WHERE x->>''meal_plan_code''=v->>''meal_plan_code'' AND x->>''cancellation_policy_code''=v->>''cancellation_policy_code'') THEN CONTINUE; END IF;','IF p_website AND NOT EXISTS(SELECT 1 FROM distribution_private.meal_eligible_units(p_room_type_id,p_check_in,p_check_out,p_room_unit_id,distribution_private.active_meal_id(v->>''meal_plan_code''))) THEN CONTINUE; END IF;');
 EXECUTE d;
END $$;