CREATE TABLE IF NOT EXISTS distribution_private.type_inventory_days (
 room_type_id uuid NOT NULL REFERENCES public.room_types(id) ON DELETE CASCADE,
 stay_date date NOT NULL,
 allocation_limit integer NOT NULL CHECK(allocation_limit>=0),
 stop_sell boolean NOT NULL DEFAULT false,
 version bigint NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid,
 PRIMARY KEY(room_type_id,stay_date)
);
ALTER TABLE distribution_private.type_inventory_days ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON distribution_private.type_inventory_days FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION distribution_private.type_consumed(p_type uuid,p_day date) RETURNS integer LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT count(*)::integer FROM distribution_private.reservations r
 WHERE r.room_type_id=p_type AND r.consumes_website_quota AND r.state IN ('held','confirmed','review_required')
 AND r.check_in<=p_day AND r.check_out>p_day
$$;

CREATE OR REPLACE FUNCTION distribution_private.type_effective_remaining(p_type uuid,p_day date) RETURNS integer LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT least(
  distribution_private.physical_available(t.category_id,p_day,p_day+1,t.id),
  distribution_private.effective_remaining(t.category_id,p_day),
  coalesce((SELECT CASE WHEN i.stop_sell THEN 0 ELSE greatest(0,i.allocation_limit-distribution_private.type_consumed(t.id,p_day)) END
   FROM distribution_private.type_inventory_days i WHERE i.room_type_id=t.id AND i.stay_date=p_day),2147483647))
 FROM public.room_types t WHERE t.id=p_type
$$;

CREATE OR REPLACE FUNCTION public.distribution_inventory_grid(p_start date,p_end date) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin_new() THEN RAISE EXCEPTION 'Admin authorization required' USING ERRCODE='42501'; END IF;
 IF p_start IS NULL OR p_end IS NULL OR p_end<p_start OR p_end>p_start+365 THEN RAISE EXCEPTION 'Invalid date range'; END IF;
 WITH types AS (
  SELECT t.id,t.name,t.category_id,c.display_order cord,c.name cname FROM public.room_types t JOIN public.room_categories c ON c.id=t.category_id
  WHERE c.is_active AND t.is_published
 )
 SELECT jsonb_build_object(
 'enabled',coalesce(distribution_private.ready(),false),
 'readiness_message',CASE WHEN distribution_private.ready() THEN 'Website inventory is active. Room statuses are unchanged by these controls.' ELSE 'Preview only: payment, booking and concurrency safeguards must be verified before inventory controls can be activated.' END,
 'categories',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'name',name,'category_name',cname) ORDER BY cord,cname,name) FROM types),'[]'::jsonb),
 'cells',coalesce((SELECT jsonb_agg(jsonb_build_object('category_id',t.id,'date',d.day::date,
   'remaining',distribution_private.type_effective_remaining(t.id,d.day::date),
   'physical_remaining',distribution_private.physical_available(t.category_id,d.day::date,d.day::date+1,t.id),
   'version',coalesce(i.version,0),'configured',i.room_type_id IS NOT NULL,'stop_sell',coalesce(i.stop_sell,false)) ORDER BY t.cord,t.cname,t.name,d.day)
  FROM types t CROSS JOIN generate_series(p_start::timestamp,p_end::timestamp,interval '1 day') d(day)
  LEFT JOIN distribution_private.type_inventory_days i ON i.room_type_id=t.id AND i.stay_date=d.day::date),'[]'::jsonb)) INTO result;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.save_distribution_inventory(p_changes jsonb,p_request_id uuid) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE x record; v_now date:=(now() AT TIME ZONE 'Asia/Kolkata')::date; v_current bigint; v_result jsonb; v_old distribution_private.adjustments%ROWTYPE; v_cat uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin_new() THEN RAISE EXCEPTION 'Admin authorization required' USING ERRCODE='42501'; END IF;
 IF NOT coalesce(distribution_private.ready(),false) THEN RAISE EXCEPTION 'Website inventory is not activated'; END IF;
 IF p_request_id IS NULL OR jsonb_typeof(p_changes) IS DISTINCT FROM 'array' OR jsonb_array_length(p_changes) NOT BETWEEN 1 AND 5000 THEN RAISE EXCEPTION 'Invalid inventory update'; END IF;
 PERFORM pg_advisory_xact_lock(823116,1);
 SELECT * INTO v_old FROM distribution_private.adjustments WHERE request_id=p_request_id;
 IF FOUND THEN
  IF v_old.actor<>auth.uid() OR v_old.changes<>p_changes THEN RAISE EXCEPTION 'Request ID already used for a different update'; END IF;
  RETURN v_old.result;
 END IF;
 IF EXISTS(SELECT 1 FROM jsonb_to_recordset(p_changes) AS a(category_id uuid,date date) GROUP BY category_id,date HAVING count(*)>1) THEN RAISE EXCEPTION 'Duplicate cells in request'; END IF;
 FOR x IN SELECT * FROM jsonb_to_recordset(p_changes) AS a(category_id uuid,date date,remaining numeric,expected_version bigint) ORDER BY category_id,date LOOP
  IF x.category_id IS NULL OR x.date IS NULL OR x.remaining IS NULL OR x.remaining<>trunc(x.remaining) OR x.remaining<0 OR x.remaining>10000 OR x.expected_version IS NULL OR x.expected_version<0 OR x.date<v_now OR x.date>v_now+365 THEN RAISE EXCEPTION 'Invalid inventory cell'; END IF;
  SELECT t.category_id INTO v_cat FROM public.room_types t JOIN public.room_categories c ON c.id=t.category_id WHERE t.id=x.category_id AND t.is_published AND c.is_active;
  IF v_cat IS NULL THEN RAISE EXCEPTION 'Room type unavailable'; END IF;
  SELECT version INTO v_current FROM distribution_private.type_inventory_days WHERE room_type_id=x.category_id AND stay_date=x.date FOR UPDATE;
  IF coalesce(v_current,0)<>x.expected_version THEN RAISE EXCEPTION 'Inventory changed. Reload before saving.' USING ERRCODE='40001'; END IF;
  IF x.remaining>distribution_private.physical_available(v_cat,x.date,x.date+1,x.category_id) THEN RAISE EXCEPTION 'Requested inventory exceeds eligible rooms'; END IF;
 END LOOP;
 FOR x IN SELECT * FROM jsonb_to_recordset(p_changes) AS a(category_id uuid,date date,remaining integer) ORDER BY category_id,date LOOP
  INSERT INTO distribution_private.type_inventory_days(room_type_id,stay_date,allocation_limit,stop_sell,updated_by)
  VALUES(x.category_id,x.date,x.remaining+distribution_private.type_consumed(x.category_id,x.date),x.remaining=0,auth.uid())
  ON CONFLICT(room_type_id,stay_date) DO UPDATE SET allocation_limit=excluded.allocation_limit,stop_sell=excluded.stop_sell,version=distribution_private.type_inventory_days.version+1,updated_at=now(),updated_by=auth.uid();
 END LOOP;
 SELECT public.distribution_inventory_grid(min(date),max(date)) INTO v_result FROM jsonb_to_recordset(p_changes) AS a(date date);
 INSERT INTO distribution_private.adjustments(request_id,actor,changes,result) VALUES(p_request_id,auth.uid(),p_changes,v_result);
 RETURN v_result;
END $$;

CREATE OR REPLACE FUNCTION public.distribution_hold_website_inventory(p_request_id uuid,p_type uuid,p_check_in date,p_check_out date,p_unit uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_type public.room_types%ROWTYPE; v_channel uuid; v_unit uuid; v_id uuid; v_existing distribution_private.reservations%ROWTYPE; v_day date;
BEGIN
 IF NOT coalesce(distribution_private.ready(),false) THEN RAISE EXCEPTION 'Website inventory is not activated'; END IF;
 IF p_request_id IS NULL OR p_type IS NULL OR p_check_in IS NULL OR p_check_out IS NULL OR p_check_in<(now() AT TIME ZONE 'Asia/Kolkata')::date OR p_check_out<=p_check_in OR p_check_out>p_check_in+365 THEN RAISE EXCEPTION 'Invalid stay'; END IF;
 PERFORM pg_advisory_xact_lock(823116,1);
 IF NOT coalesce(distribution_private.ready(),false) THEN RAISE EXCEPTION 'Website inventory is not activated'; END IF;
 SELECT * INTO v_existing FROM distribution_private.reservations WHERE request_id=p_request_id FOR UPDATE;
 IF FOUND THEN
  IF v_existing.room_type_id<>p_type OR v_existing.check_in<>p_check_in OR v_existing.check_out<>p_check_out OR (p_unit IS NOT NULL AND v_existing.room_unit_id<>p_unit) THEN RAISE EXCEPTION 'Request ID already used for different selection'; END IF;
  IF v_existing.state NOT IN ('held','confirmed') THEN RAISE EXCEPTION 'Reservation is no longer payable'; END IF;
  RETURN jsonb_build_object('hold_id',v_existing.id,'room_unit_id',v_existing.room_unit_id,'state',v_existing.state,'reused',true);
 END IF;
 SELECT * INTO v_type FROM public.room_types WHERE id=p_type FOR SHARE;
 IF NOT FOUND OR v_type.is_published IS DISTINCT FROM true OR v_type.pricing_status IS NULL OR v_type.pricing_status='configuration_required' OR v_type.category_id IS NULL THEN RAISE EXCEPTION 'Room type unavailable'; END IF;
 PERFORM 1 FROM public.room_categories WHERE id=v_type.category_id AND is_active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Category unavailable'; END IF;
 FOR v_day IN SELECT generate_series(p_check_in::timestamp,(p_check_out-1)::timestamp,interval '1 day')::date LOOP
  IF distribution_private.type_effective_remaining(p_type,v_day)<1 THEN RAISE EXCEPTION 'Website inventory sold out'; END IF;
 END LOOP;
 SELECT u.id INTO v_unit FROM public.room_units u
 WHERE u.room_type_id=p_type AND (u.category_id IS NULL OR u.category_id=v_type.category_id) AND u.is_active AND u.status='available' AND (p_unit IS NULL OR u.id=p_unit)
 AND NOT EXISTS(SELECT FROM public.bookings b WHERE b.room_unit_id=u.id AND b.payment_status IS DISTINCT FROM 'cancelled' AND b.check_in<p_check_out AND b.check_out>p_check_in)
 AND NOT EXISTS(SELECT FROM distribution_private.reservations r WHERE r.room_unit_id=u.id AND r.state IN ('held','confirmed','review_required') AND r.check_in<p_check_out AND r.check_out>p_check_in)
 ORDER BY u.unit_number,u.id FOR UPDATE OF u SKIP LOCKED LIMIT 1;
 IF v_unit IS NULL THEN RAISE EXCEPTION 'No eligible room is available for the entire stay'; END IF;
 SELECT id INTO v_channel FROM public.distribution_channels WHERE code='website' AND kind='website' AND is_active;
 IF v_channel IS NULL THEN RAISE EXCEPTION 'Website channel unavailable'; END IF;
 INSERT INTO distribution_private.reservations(request_id,source_channel_id,room_type_id,room_unit_id,check_in,check_out,state,consumes_website_quota)
 VALUES(p_request_id,v_channel,p_type,v_unit,p_check_in,p_check_out,'held',true) RETURNING id INTO v_id;
 INSERT INTO distribution_private.reservation_nights(reservation_id,category_id,stay_date)
 SELECT v_id,v_type.category_id,d::date FROM generate_series(p_check_in::timestamp,(p_check_out-1)::timestamp,interval '1 day') d;
 RETURN jsonb_build_object('hold_id',v_id,'room_unit_id',v_unit,'state','held','reused',false);
END $$;
REVOKE ALL ON FUNCTION public.distribution_hold_website_inventory(uuid,uuid,date,date,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.distribution_hold_website_inventory(uuid,uuid,date,date,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.distribution_website_type_availability(p_type uuid,p_check_in date,p_check_out date)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_category uuid; v_count integer; v_day date;
BEGIN
 IF p_type IS NULL OR p_check_in IS NULL OR p_check_out IS NULL OR p_check_out<=p_check_in OR p_check_out>p_check_in+365 OR p_check_in<(now() AT TIME ZONE 'Asia/Kolkata')::date THEN RAISE EXCEPTION 'Invalid stay'; END IF;
 SELECT t.category_id INTO v_category FROM public.room_types t JOIN public.room_categories c ON c.id=t.category_id WHERE t.id=p_type AND t.is_published AND t.pricing_status IS NOT NULL AND t.pricing_status<>'configuration_required' AND c.is_active;
 IF NOT FOUND THEN RETURN 0; END IF;
 v_count:=distribution_private.physical_available(v_category,p_check_in,p_check_out,p_type);
 IF coalesce(distribution_private.ready(),false) THEN
  FOR v_day IN SELECT generate_series(p_check_in::timestamp,(p_check_out-1)::timestamp,interval '1 day')::date LOOP
   v_count:=least(v_count,distribution_private.type_effective_remaining(p_type,v_day));
  END LOOP;
 END IF;
 RETURN v_count;
END $$;
REVOKE ALL ON FUNCTION public.distribution_website_type_availability(uuid,date,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.distribution_website_type_availability(uuid,date,date) TO anon,authenticated,service_role;
REVOKE ALL ON FUNCTION distribution_private.type_consumed(uuid,date),distribution_private.type_effective_remaining(uuid,date) FROM PUBLIC,anon,authenticated;