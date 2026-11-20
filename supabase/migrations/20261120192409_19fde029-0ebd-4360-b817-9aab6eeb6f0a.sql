DO $$ DECLARE d text; needle text:='SELECT sum(value::text::integer) INTO n FROM jsonb_each(p_guest_counts);'; BEGIN
 d:=pg_get_functiondef('guest_pricing_private.calculate_guest_type_rate_variants(uuid,date,date,jsonb,integer,uuid,text,boolean)'::regprocedure);
 IF strpos(d,needle)=0 THEN RAISE EXCEPTION 'Reviewed guest-count calculation not found'; END IF;
 d:=replace(d,needle,needle||' IF p_website AND EXISTS(SELECT 1 FROM public.room_types r WHERE r.id=p_room_type_id AND r.max_guests < n-i) THEN RAISE EXCEPTION ''GUEST_CAPACITY_EXCEEDED: select a room with capacity for this guest party''; END IF;');
 EXECUTE d;
END $$;