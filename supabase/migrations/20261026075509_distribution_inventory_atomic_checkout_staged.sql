-- LOCAL CANDIDATE ONLY. NOT APPLIED. Requires isolated PostgreSQL validation and
-- payment/legacy/manual bridge implementation before activation. No existing
-- room/unit/booking/pricing data is changed by this additive candidate.

CREATE SCHEMA IF NOT EXISTS distribution_private;
REVOKE ALL ON SCHEMA distribution_private FROM PUBLIC, anon, authenticated;

CREATE TABLE public.distribution_channels (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 code text NOT NULL UNIQUE CHECK(code ~ '^[a-z][a-z0-9_]{1,49}$'),
 name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 100),
 kind text NOT NULL CHECK(kind IN ('website','offline','channel_manager','other')),
 is_active boolean NOT NULL DEFAULT true,
 notes text NOT NULL DEFAULT '' CHECK(length(notes)<=2000),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX distribution_channel_unique_name ON public.distribution_channels(lower(btrim(name)));
CREATE UNIQUE INDEX distribution_single_website ON public.distribution_channels(kind) WHERE kind='website';
INSERT INTO public.distribution_channels(code,name,kind,notes) VALUES
 ('website','Website','website','Direct website inventory. No OTA synchronisation.'),
 ('phone_whatsapp','Phone / WhatsApp','offline','Managed outside website inventory.'),
 ('walk_in','Walk-in','offline','Managed outside website inventory.'),
 ('resavenue','ResAvenue','channel_manager','External channel manager; not connected here.');
ALTER TABLE public.distribution_channels ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.distribution_channels FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.distribution_channels TO authenticated;
CREATE POLICY distribution_channel_admin_select ON public.distribution_channels FOR SELECT TO authenticated USING(public.is_admin_new());
CREATE POLICY distribution_channel_admin_insert ON public.distribution_channels FOR INSERT TO authenticated WITH CHECK(public.is_admin_new() AND kind<>'website');
CREATE POLICY distribution_channel_admin_update ON public.distribution_channels FOR UPDATE TO authenticated USING(public.is_admin_new()) WITH CHECK(public.is_admin_new());
CREATE FUNCTION distribution_private.protect_channel() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF TG_OP='UPDATE' AND (NEW.id<>OLD.id OR NEW.code<>OLD.code OR NEW.kind<>OLD.kind) THEN
  RAISE EXCEPTION 'Channel identity and kind cannot be changed';
 END IF;
 IF NEW.code='website' AND (NOT NEW.is_active OR NEW.kind<>'website') THEN
  RAISE EXCEPTION 'The system website channel cannot be disabled';
 END IF;
 NEW.updated_at:=now(); RETURN NEW;
END $$;
CREATE TRIGGER distribution_channel_protect BEFORE UPDATE ON public.distribution_channels FOR EACH ROW EXECUTE FUNCTION distribution_private.protect_channel();

CREATE TABLE distribution_private.settings (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 enabled boolean NOT NULL DEFAULT false,
 -- Deployment certification must be written only after actual evidence exists.
 readiness jsonb NOT NULL DEFAULT '{"atomic_finalizer":false,"provider_hold_release":false,"legacy_bridge":false,"manual_bridge":false,"overlap_audit":false,"concurrency_tests":false}'::jsonb
);
INSERT INTO distribution_private.settings DEFAULT VALUES;
CREATE TABLE distribution_private.day_revisions (
 category_id uuid NOT NULL REFERENCES public.room_categories(id),
 stay_date date NOT NULL, version bigint NOT NULL DEFAULT 0,
 PRIMARY KEY(category_id,stay_date)
);
CREATE TABLE distribution_private.inventory_days (
 category_id uuid NOT NULL REFERENCES public.room_categories(id),
 stay_date date NOT NULL,
 allocation_limit integer NOT NULL CHECK(allocation_limit>=0),
 stop_sell boolean NOT NULL DEFAULT false,
 version bigint NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid,
 PRIMARY KEY(category_id,stay_date)
);
CREATE TABLE distribution_private.reservations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_id uuid NOT NULL UNIQUE,
 source_channel_id uuid REFERENCES public.distribution_channels(id),
 room_type_id uuid NOT NULL REFERENCES public.room_types(id),
 room_unit_id uuid NOT NULL REFERENCES public.room_units(id),
 check_in date NOT NULL, check_out date NOT NULL CHECK(check_out>check_in AND check_out<=check_in+365),
 state text NOT NULL CHECK(state IN ('held','confirmed','released','review_required')),
 consumes_website_quota boolean NOT NULL DEFAULT false,
 provider_order_id text UNIQUE,
 booking_id uuid UNIQUE REFERENCES public.bookings(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 released_at timestamptz, release_reason text
);
-- Candidate uses serialized advisory locks below. Exclusion constraint must be
-- installed with btree_gist in final migration after existing overlap audit.
-- No destructive automatic cleanup of existing overlaps is permitted.
CREATE INDEX distribution_active_unit_dates ON distribution_private.reservations(room_unit_id,check_in,check_out) WHERE state IN ('held','confirmed','review_required');
CREATE TABLE distribution_private.reservation_nights (
 reservation_id uuid NOT NULL REFERENCES distribution_private.reservations(id),
 category_id uuid NOT NULL REFERENCES public.room_categories(id),
 stay_date date NOT NULL,
 PRIMARY KEY(reservation_id,stay_date)
);
CREATE INDEX distribution_nights_category_day ON distribution_private.reservation_nights(category_id,stay_date);
CREATE TABLE distribution_private.adjustments (
 request_id uuid PRIMARY KEY, actor uuid NOT NULL, changes jsonb NOT NULL,
 result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE distribution_private.day_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_private.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_private.inventory_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_private.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_private.reservation_nights ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_private.adjustments ENABLE ROW LEVEL SECURITY;

-- Revisions include inventory, reservation and legacy booking changes, including
-- inherited (unconfigured) cells. They do not themselves enforce allocation;
-- production booking bridges remain a required activation gate.
CREATE FUNCTION distribution_private.bump_day(p_category uuid,p_day date) RETURNS void LANGUAGE sql SET search_path='' AS $$
 INSERT INTO distribution_private.day_revisions(category_id,stay_date,version) VALUES(p_category,p_day,1)
 ON CONFLICT(category_id,stay_date) DO UPDATE SET version=distribution_private.day_revisions.version+1
$$;
CREATE FUNCTION distribution_private.revise_inventory_day() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 PERFORM distribution_private.bump_day(NEW.category_id,NEW.stay_date);
 RETURN NEW;
END $$;
CREATE TRIGGER distribution_inventory_day_revision AFTER INSERT OR UPDATE ON distribution_private.inventory_days FOR EACH ROW EXECUTE FUNCTION distribution_private.revise_inventory_day();
CREATE FUNCTION distribution_private.revise_reservation_night() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF TG_OP<>'INSERT' THEN PERFORM distribution_private.bump_day(OLD.category_id,OLD.stay_date); END IF;
 IF TG_OP<>'DELETE' THEN PERFORM distribution_private.bump_day(NEW.category_id,NEW.stay_date); END IF;
 RETURN NULL;
END $$;
CREATE TRIGGER distribution_reservation_night_revision AFTER INSERT OR UPDATE OR DELETE ON distribution_private.reservation_nights FOR EACH ROW EXECUTE FUNCTION distribution_private.revise_reservation_night();
CREATE FUNCTION distribution_private.revise_reservation_state() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE n record;
BEGIN
 IF NEW.state IS DISTINCT FROM OLD.state OR NEW.room_unit_id IS DISTINCT FROM OLD.room_unit_id OR NEW.check_in IS DISTINCT FROM OLD.check_in OR NEW.check_out IS DISTINCT FROM OLD.check_out OR NEW.consumes_website_quota IS DISTINCT FROM OLD.consumes_website_quota THEN
  FOR n IN SELECT category_id,stay_date FROM distribution_private.reservation_nights WHERE reservation_id=NEW.id ORDER BY category_id,stay_date LOOP
   PERFORM distribution_private.bump_day(n.category_id,n.stay_date);
  END LOOP;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER distribution_reservation_state_revision AFTER UPDATE ON distribution_private.reservations FOR EACH ROW EXECUTE FUNCTION distribution_private.revise_reservation_state();
CREATE FUNCTION distribution_private.revise_legacy_booking() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c uuid; d date;
BEGIN
 -- A compatibility invalidation trigger only, NOT the booking safety bridge.
 -- Every new production mutation RPC must acquire this lock before row writes.
 PERFORM pg_advisory_xact_lock(823116,1);
 IF TG_OP<>'INSERT' AND OLD.payment_status IS DISTINCT FROM 'cancelled' THEN
  SELECT category_id INTO c FROM public.room_types WHERE id=OLD.room_type_id;
  IF c IS NOT NULL AND OLD.check_out>OLD.check_in THEN
   FOR d IN SELECT generate_series(OLD.check_in::timestamp,(OLD.check_out-1)::timestamp,interval '1 day')::date LOOP
    PERFORM distribution_private.bump_day(c,d);
   END LOOP;
  END IF;
 END IF;
 IF TG_OP<>'DELETE' AND NEW.payment_status IS DISTINCT FROM 'cancelled' THEN
  SELECT category_id INTO c FROM public.room_types WHERE id=NEW.room_type_id;
  IF c IS NOT NULL AND NEW.check_out>NEW.check_in THEN
   FOR d IN SELECT generate_series(NEW.check_in::timestamp,(NEW.check_out-1)::timestamp,interval '1 day')::date LOOP
    PERFORM distribution_private.bump_day(c,d);
   END LOOP;
  END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER distribution_booking_revision BEFORE INSERT OR UPDATE OR DELETE ON public.bookings FOR EACH ROW EXECUTE FUNCTION distribution_private.revise_legacy_booking();

CREATE FUNCTION distribution_private.ready() RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT enabled AND NOT EXISTS (
  SELECT FROM unnest(ARRAY['atomic_finalizer','provider_hold_release','legacy_bridge','manual_bridge','overlap_audit','concurrency_tests']) key
  WHERE readiness->key IS DISTINCT FROM 'true'::jsonb
 ) FROM distribution_private.settings WHERE singleton
$$;
CREATE FUNCTION distribution_private.consumed(p_category uuid,p_day date) RETURNS integer LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT count(*)::integer FROM distribution_private.reservation_nights n
 JOIN distribution_private.reservations r ON r.id=n.reservation_id
 WHERE n.category_id=p_category AND n.stay_date=p_day
 AND r.consumes_website_quota AND r.state IN ('held','confirmed','review_required')
$$;
CREATE FUNCTION distribution_private.physical_available(p_category uuid,p_start date,p_end date,p_type uuid DEFAULT NULL) RETURNS integer LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT count(*)::integer FROM public.room_units u
 JOIN public.room_types t ON t.id=u.room_type_id
 JOIN public.room_categories c ON c.id=t.category_id
 WHERE c.id=p_category AND c.is_active AND t.is_published AND t.pricing_status IS NOT NULL AND t.pricing_status<>'configuration_required'
 AND (u.category_id IS NULL OR u.category_id=t.category_id) AND (p_type IS NULL OR t.id=p_type) AND u.is_active AND u.status='available'
 AND NOT EXISTS(SELECT FROM public.bookings b WHERE b.room_unit_id=u.id AND b.payment_status IS DISTINCT FROM 'cancelled' AND b.check_in<p_end AND b.check_out>p_start)
 AND NOT EXISTS(SELECT FROM distribution_private.reservations r WHERE r.room_unit_id=u.id AND r.state IN ('held','confirmed','review_required') AND r.check_in<p_end AND r.check_out>p_start)
$$;
CREATE FUNCTION distribution_private.effective_remaining(p_category uuid,p_day date) RETURNS integer LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT least(distribution_private.physical_available(p_category,p_day,p_day+1),
  coalesce((SELECT CASE WHEN stop_sell THEN 0 ELSE greatest(0,allocation_limit-distribution_private.consumed(p_category,p_day)) END
   FROM distribution_private.inventory_days WHERE category_id=p_category AND stay_date=p_day),2147483647))
$$;
CREATE FUNCTION public.distribution_inventory_grid(p_start date,p_end date) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin_new() THEN RAISE EXCEPTION 'Admin authorization required' USING ERRCODE='42501'; END IF;
 IF p_start IS NULL OR p_end IS NULL OR p_end<p_start OR p_end>p_start+365 THEN RAISE EXCEPTION 'Invalid date range'; END IF;
 SELECT jsonb_build_object(
 'enabled',coalesce(distribution_private.ready(),false),
 'readiness_message',CASE WHEN distribution_private.ready() THEN 'Website inventory is active. Room statuses are unchanged by these controls.' ELSE 'Preview only: payment, booking and concurrency safeguards must be verified before inventory controls can be activated.' END,
 'categories',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'name',name) ORDER BY display_order,name) FROM public.room_categories WHERE is_active),'[]'::jsonb),
 'cells',coalesce((SELECT jsonb_agg(jsonb_build_object('category_id',c.id,'date',d.day::date,'remaining',distribution_private.effective_remaining(c.id,d.day::date),
 'physical_remaining',distribution_private.physical_available(c.id,d.day::date,d.day::date+1),'version',coalesce(rv.version,0),'configured',i.category_id IS NOT NULL,'stop_sell',coalesce(i.stop_sell,false)) ORDER BY c.display_order,c.name,d.day)
 FROM public.room_categories c CROSS JOIN generate_series(p_start::timestamp,p_end::timestamp,interval '1 day') d(day)
 LEFT JOIN distribution_private.inventory_days i ON i.category_id=c.id AND i.stay_date=d.day::date LEFT JOIN distribution_private.day_revisions rv ON rv.category_id=c.id AND rv.stay_date=d.day::date WHERE c.is_active),'[]'::jsonb)) INTO result;
 RETURN result;
END $$;

CREATE FUNCTION public.save_distribution_inventory(p_changes jsonb,p_request_id uuid) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE x record; v_now date:=(now() AT TIME ZONE 'Asia/Kolkata')::date; v_current bigint; v_before jsonb; v_result jsonb; v_old distribution_private.adjustments%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin_new() THEN RAISE EXCEPTION 'Admin authorization required' USING ERRCODE='42501'; END IF;
 IF NOT coalesce(distribution_private.ready(),false) THEN RAISE EXCEPTION 'Website inventory is not activated'; END IF;
 IF p_request_id IS NULL OR jsonb_typeof(p_changes) IS DISTINCT FROM 'array' OR jsonb_array_length(p_changes) NOT BETWEEN 1 AND 1098 THEN RAISE EXCEPTION 'Invalid inventory update'; END IF;
 -- One conservative global transaction lock serializes admin changes and all
 -- future hold/finalize/cancel bridges. It trades throughput for safe lock order.
 PERFORM pg_advisory_xact_lock(823116,1);
 SELECT * INTO v_old FROM distribution_private.adjustments WHERE request_id=p_request_id;
 IF FOUND THEN
  IF v_old.actor<>auth.uid() OR v_old.changes<>p_changes THEN RAISE EXCEPTION 'Request ID already used for a different update'; END IF;
  RETURN v_old.result;
 END IF;
 IF EXISTS(SELECT 1 FROM jsonb_to_recordset(p_changes) AS a(category_id uuid,date date,remaining numeric,expected_version bigint)
 GROUP BY category_id,date HAVING count(*)>1) THEN RAISE EXCEPTION 'Duplicate cells in request'; END IF;
 FOR x IN SELECT * FROM jsonb_to_recordset(p_changes) AS a(category_id uuid,date date,remaining numeric,expected_version bigint) ORDER BY category_id,date LOOP
  IF x.category_id IS NULL OR x.date IS NULL OR x.remaining IS NULL OR x.remaining<>trunc(x.remaining) OR x.remaining<0 OR x.remaining>10000 OR x.expected_version IS NULL OR x.expected_version<0 OR x.date<v_now OR x.date>v_now+365 THEN RAISE EXCEPTION 'Invalid inventory cell'; END IF;
  IF NOT EXISTS(SELECT FROM public.room_categories WHERE id=x.category_id AND is_active) THEN RAISE EXCEPTION 'Category unavailable'; END IF;
  SELECT version INTO v_current FROM distribution_private.day_revisions WHERE category_id=x.category_id AND stay_date=x.date FOR UPDATE;
  IF coalesce(v_current,0)<>x.expected_version THEN RAISE EXCEPTION 'Inventory changed. Reload before saving.' USING ERRCODE='40001'; END IF;
  IF x.remaining>distribution_private.physical_available(x.category_id,x.date,x.date+1) THEN RAISE EXCEPTION 'Requested inventory exceeds eligible rooms'; END IF;
 END LOOP;
 -- All validation occurs before any cell mutation; function transaction remains
 -- atomic if an error occurs during writes as well.
 FOR x IN SELECT * FROM jsonb_to_recordset(p_changes) AS a(category_id uuid,date date,remaining integer,expected_version bigint) ORDER BY category_id,date LOOP
  INSERT INTO distribution_private.inventory_days(category_id,stay_date,allocation_limit,stop_sell,updated_by)
  VALUES(x.category_id,x.date,x.remaining+distribution_private.consumed(x.category_id,x.date),x.remaining=0,auth.uid())
  ON CONFLICT(category_id,stay_date) DO UPDATE SET allocation_limit=excluded.allocation_limit,stop_sell=excluded.stop_sell,version=distribution_private.inventory_days.version+1,updated_at=now(),updated_by=auth.uid();
 END LOOP;
 SELECT public.distribution_inventory_grid(min(date),max(date)) INTO v_result FROM jsonb_to_recordset(p_changes) AS a(date date);
 INSERT INTO distribution_private.adjustments(request_id,actor,changes,result) VALUES(p_request_id,auth.uid(),p_changes,v_result);
 RETURN v_result;
END $$;

REVOKE ALL ON ALL TABLES IN SCHEMA distribution_private FROM PUBLIC,anon,authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA distribution_private FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.distribution_inventory_grid(date,date) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.save_distribution_inventory(jsonb,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.distribution_inventory_grid(date,date),public.save_distribution_inventory(jsonb,uuid) TO authenticated;

-- LOCAL CANDIDATE ONLY. Requires staged_inventory_candidate.sql first.
-- No activation or replacement of existing booking/payment endpoints.

CREATE FUNCTION public.distribution_hold_website_inventory(p_request_id uuid,p_type uuid,p_check_in date,p_check_out date,p_unit uuid DEFAULT NULL)
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
  IF distribution_private.effective_remaining(v_type.category_id,v_day)<1 THEN RAISE EXCEPTION 'Website inventory sold out'; END IF;
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
-- Server calls only. Authenticated guests/admins cannot manufacture holds.
REVOKE ALL ON FUNCTION public.distribution_hold_website_inventory(uuid,uuid,date,date,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.distribution_hold_website_inventory(uuid,uuid,date,date,uuid) TO service_role;

CREATE FUNCTION public.distribution_website_type_availability(p_type uuid,p_check_in date,p_check_out date)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_category uuid; v_count integer; v_day date;
BEGIN
 IF NOT coalesce(distribution_private.ready(),false) THEN RAISE EXCEPTION 'Website inventory is not activated'; END IF;
 IF p_type IS NULL OR p_check_in IS NULL OR p_check_out IS NULL OR p_check_out<=p_check_in OR p_check_out>p_check_in+365 OR p_check_in<(now() AT TIME ZONE 'Asia/Kolkata')::date THEN RAISE EXCEPTION 'Invalid stay'; END IF;
 SELECT t.category_id INTO v_category FROM public.room_types t JOIN public.room_categories c ON c.id=t.category_id WHERE t.id=p_type AND t.is_published AND t.pricing_status IS NOT NULL AND t.pricing_status<>'configuration_required' AND c.is_active;
 IF NOT FOUND THEN RETURN 0; END IF;
 v_count:=distribution_private.physical_available(v_category,p_check_in,p_check_out,p_type);
 FOR v_day IN SELECT generate_series(p_check_in::timestamp,(p_check_out-1)::timestamp,interval '1 day')::date LOOP
  v_count:=least(v_count,distribution_private.effective_remaining(v_category,v_day));
 END LOOP;
 RETURN v_count;
END $$;
REVOKE ALL ON FUNCTION public.distribution_website_type_availability(uuid,date,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.distribution_website_type_availability(uuid,date,date) TO anon,authenticated,service_role;

-- LOCAL CANDIDATE. Service-only Store adapter for distributionPaymentCoordinator.
-- Does NOT implement confirmCaptured, release orders or activate inventory.

CREATE TABLE distribution_private.closed_checkout_requests (
 request_id uuid PRIMARY KEY, owner_scope text NOT NULL, closed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE distribution_private.closed_checkout_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON distribution_private.closed_checkout_requests FROM PUBLIC,anon,authenticated,service_role;
CREATE TABLE distribution_private.payment_intents (
 request_id uuid PRIMARY KEY,
 hold_id uuid NOT NULL UNIQUE REFERENCES distribution_private.reservations(id),
 owner_scope text NOT NULL CHECK(length(owner_scope) BETWEEN 1 AND 512),
 quote_fingerprint text NOT NULL CHECK(length(quote_fingerprint) BETWEEN 1 AND 1024),
 amount_paise bigint NOT NULL CHECK(amount_paise BETWEEN 100 AND 9007199254740991),
 currency text NOT NULL CHECK(currency='INR'),
 receipt text NOT NULL UNIQUE CHECK(length(receipt)<=40),
 intent jsonb NOT NULL,
 operation_token uuid NOT NULL DEFAULT gen_random_uuid(),
 state text NOT NULL CHECK(state IN ('creating','ready','review_required','confirmed','released')),
 provider_order_id text UNIQUE,
 provider_order jsonb,
 review_reason text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((provider_order_id IS NULL)=(provider_order IS NULL)),
 CHECK(state NOT IN ('ready','confirmed') OR provider_order_id IS NOT NULL)
);
ALTER TABLE distribution_private.payment_intents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON distribution_private.payment_intents FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION distribution_private.intent_record(p distribution_private.payment_intents) RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT jsonb_build_object('holdId',p.hold_id,'requestId',p.request_id,'ownerScope',p.owner_scope,'amountPaise',p.amount_paise,'currency',p.currency,'receipt',p.receipt,'quoteFingerprint',p.quote_fingerprint)
$$;
CREATE FUNCTION public.distribution_begin_payment_intent(p_intent jsonb) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p distribution_private.payment_intents%ROWTYPE; v_request uuid; v_amount numeric; v_hold jsonb; v_record jsonb;
BEGIN
 IF NOT coalesce(distribution_private.ready(),false) THEN RAISE EXCEPTION 'Website inventory is not activated'; END IF;
 IF p_intent IS NULL OR jsonb_typeof(p_intent)<>'object' OR octet_length(p_intent::text)>262144 THEN RAISE EXCEPTION 'Invalid payment intent'; END IF;
 IF coalesce(p_intent->>'requestId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'Invalid request ID'; END IF;
 v_request:=(p_intent->>'requestId')::uuid;
 IF jsonb_typeof(p_intent->'amountPaise') IS DISTINCT FROM 'number' OR p_intent->>'currency' IS DISTINCT FROM 'INR'
  OR jsonb_typeof(p_intent->'ownerScope') IS DISTINCT FROM 'string' OR length(p_intent->>'ownerScope') NOT BETWEEN 1 AND 512
  OR jsonb_typeof(p_intent->'quoteFingerprint') IS DISTINCT FROM 'string' OR length(p_intent->>'quoteFingerprint') NOT BETWEEN 1 AND 1024
  OR jsonb_typeof(p_intent->'selection') IS DISTINCT FROM 'object' OR jsonb_typeof(p_intent->'quoteSnapshot') IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid payment intent'; END IF;
 v_amount:=(p_intent->>'amountPaise')::numeric;
 IF v_amount<>trunc(v_amount) OR v_amount NOT BETWEEN 100 AND 9007199254740991 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
 PERFORM pg_advisory_xact_lock(823116,1);
 IF EXISTS(SELECT FROM distribution_private.closed_checkout_requests WHERE request_id=v_request) THEN RAISE EXCEPTION 'Checkout request was closed; use a new request'; END IF;
 SELECT * INTO p FROM distribution_private.payment_intents WHERE request_id=v_request FOR UPDATE;
 IF FOUND THEN
  IF p.intent<>p_intent THEN RAISE EXCEPTION 'Request ID already used for different owner, selection or quote'; END IF;
  v_record:=distribution_private.intent_record(p);
  IF p.state='ready' THEN RETURN jsonb_build_object('state','ready','record',v_record,'order',p.provider_order); END IF;
  -- A repeated call never returns the ownership token, even after uncertainty.
  RETURN jsonb_build_object('state',p.state,'record',v_record);
 END IF;
 v_hold:=public.distribution_hold_website_inventory(v_request,(p_intent#>>'{selection,roomTypeId}')::uuid,
  (p_intent#>>'{selection,checkIn}')::date,(p_intent#>>'{selection,checkOut}')::date,nullif(p_intent#>>'{selection,unitId}','')::uuid);
 -- Preexisting reservations without this intent must not acquire fresh provider
 -- ownership: they may belong to a previous integration or unfinished operation.
 IF coalesce((v_hold->>'reused')::boolean,false) THEN RAISE EXCEPTION 'Existing hold requires payment-intent reconciliation'; END IF;
 INSERT INTO distribution_private.payment_intents(request_id,hold_id,owner_scope,quote_fingerprint,amount_paise,currency,receipt,intent,state)
 VALUES(v_request,(v_hold->>'hold_id')::uuid,p_intent->>'ownerScope',p_intent->>'quoteFingerprint',v_amount::bigint,'INR','hl_'||replace(v_request::text,'-',''),p_intent,'creating') RETURNING * INTO p;
 RETURN jsonb_build_object('state','create_owned','record',distribution_private.intent_record(p),'operationToken',p.operation_token);
END $$;
CREATE FUNCTION public.distribution_bind_payment_order(p_record jsonb,p_operation_token uuid,p_order jsonb) RETURNS void
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p distribution_private.payment_intents%ROWTYPE; r distribution_private.reservations%ROWTYPE;
BEGIN
 PERFORM pg_advisory_xact_lock(823116,1);
 SELECT * INTO p FROM distribution_private.payment_intents WHERE request_id=(p_record->>'requestId')::uuid FOR UPDATE;
 IF NOT FOUND OR distribution_private.intent_record(p) IS DISTINCT FROM p_record OR p.operation_token IS DISTINCT FROM p_operation_token THEN RAISE EXCEPTION 'Payment-intent ownership mismatch'; END IF;
 IF p_order IS NULL OR jsonb_typeof(p_order)<>'object' OR coalesce(p_order->>'id','') !~ '^order_[A-Za-z0-9]+$'
  OR jsonb_typeof(p_order->'amount') IS DISTINCT FROM 'number' OR (p_order->>'amount')::numeric<>p.amount_paise
  OR p_order->>'currency' IS DISTINCT FROM p.currency OR p_order->>'receipt' IS DISTINCT FROM p.receipt
  OR p_order->>'status' IS NULL OR p_order->>'status' NOT IN ('created','attempted')
  OR jsonb_typeof(p_order->'amount_paid') IS DISTINCT FROM 'number' OR (p_order->>'amount_paid')::numeric<>0 THEN RAISE EXCEPTION 'Provider order does not match reserved quote'; END IF;
 IF p.state='ready' THEN
  IF p.provider_order_id<>p_order->>'id' THEN RAISE EXCEPTION 'Payment intent already bound to different order'; END IF;
  RETURN; -- response loss retry is safe, never overwrites original binding
 END IF;
 IF p.state NOT IN ('creating','review_required') THEN RAISE EXCEPTION 'Payment intent cannot accept order binding'; END IF;
 SELECT * INTO r FROM distribution_private.reservations WHERE id=p.hold_id FOR UPDATE;
 IF NOT FOUND OR r.state<>'held' OR r.request_id<>p.request_id OR (r.provider_order_id IS NOT NULL AND r.provider_order_id<>p_order->>'id') THEN RAISE EXCEPTION 'Inventory hold no longer matches payment intent'; END IF;
 UPDATE distribution_private.reservations SET provider_order_id=p_order->>'id' WHERE id=p.hold_id;
 UPDATE distribution_private.payment_intents SET state='ready',provider_order_id=p_order->>'id',provider_order=p_order,review_reason=NULL,updated_at=now() WHERE request_id=p.request_id;
END $$;
CREATE FUNCTION public.distribution_mark_payment_unknown(p_record jsonb,p_reason text) RETURNS void
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p distribution_private.payment_intents%ROWTYPE;
BEGIN
 -- Durable reconciliation remains permitted even if activation was disabled
 -- after provider call. It never releases inventory or downgrades ready.
 PERFORM pg_advisory_xact_lock(823116,1);
 SELECT * INTO p FROM distribution_private.payment_intents WHERE request_id=(p_record->>'requestId')::uuid FOR UPDATE;
 IF NOT FOUND OR distribution_private.intent_record(p) IS DISTINCT FROM p_record THEN RAISE EXCEPTION 'Payment-intent ownership mismatch'; END IF;
 IF p_reason IS NULL OR length(p_reason) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Invalid reconciliation reason'; END IF;
 IF p.state='creating' THEN UPDATE distribution_private.payment_intents SET state='review_required',review_reason=p_reason,updated_at=now() WHERE request_id=p.request_id; END IF;
END $$;
CREATE FUNCTION public.distribution_find_bound_order(p_order_id text,p_owner_scope text) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p distribution_private.payment_intents%ROWTYPE;
BEGIN
 -- Lookup stays available after disabling new sales so paid orders can be
 -- reconciled. This function makes no booking/payment/state changes.
 SELECT * INTO p FROM distribution_private.payment_intents WHERE provider_order_id=p_order_id AND owner_scope=p_owner_scope;
 IF NOT FOUND OR p.state NOT IN ('ready','confirmed') THEN RAISE EXCEPTION 'Bound order not available for this checkout'; END IF;
 RETURN distribution_private.intent_record(p)||jsonb_build_object('orderId',p.provider_order_id);
END $$;
REVOKE ALL ON FUNCTION distribution_private.intent_record(distribution_private.payment_intents) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.distribution_begin_payment_intent(jsonb),public.distribution_bind_payment_order(jsonb,uuid,jsonb),public.distribution_mark_payment_unknown(jsonb,text),public.distribution_find_bound_order(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.distribution_begin_payment_intent(jsonb),public.distribution_bind_payment_order(jsonb,uuid,jsonb),public.distribution_mark_payment_unknown(jsonb,text),public.distribution_find_bound_order(text,text) TO service_role;

-- LOCAL REVIEW CANDIDATE. No activation is performed here.

-- Abort on pre-existing duplicates rather than deleting or rewriting history.
CREATE UNIQUE INDEX distribution_booking_payment_unique ON public.bookings(payment_id) WHERE payment_id IS NOT NULL AND payment_id<>'';
CREATE UNIQUE INDEX distribution_booking_order_unique ON public.bookings(payment_order_id) WHERE payment_order_id IS NOT NULL AND payment_order_id<>'';
CREATE UNIQUE INDEX distribution_payment_unique ON public.payments(razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL AND razorpay_payment_id<>'';
CREATE UNIQUE INDEX distribution_completed_order_unique ON public.payments(razorpay_order_id) WHERE razorpay_order_id IS NOT NULL AND razorpay_order_id<>'' AND status='completed';
ALTER TABLE distribution_private.reservations ALTER CONSTRAINT reservations_booking_id_fkey DEFERRABLE INITIALLY DEFERRED;
CREATE TABLE distribution_private.captured_payments (
 payment_id text PRIMARY KEY, order_id text NOT NULL UNIQUE,
 hold_id uuid NOT NULL UNIQUE REFERENCES distribution_private.reservations(id),
 booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id),
 invoice_id uuid NOT NULL REFERENCES public.invoices(id),
 amount_paise bigint NOT NULL CHECK(amount_paise>0), currency text NOT NULL CHECK(currency='INR'),
 verified_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE distribution_private.captured_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON distribution_private.captured_payments FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION distribution_private.protection_active() RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT coalesce((SELECT enabled FROM distribution_private.settings WHERE singleton),false)
 OR EXISTS(SELECT FROM distribution_private.reservations WHERE state IN('held','confirmed','review_required'))
$$;
-- All supported write paths take the global lock before tuple locks, including
-- direct admin booking edits and old Edge Functions. No metadata/status is changed.
CREATE FUNCTION distribution_private.lock_inventory_statement() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF coalesce(distribution_private.protection_active(),false) THEN
  PERFORM pg_advisory_xact_lock(823116,1);
 END IF;
 RETURN NULL;
END $$;
CREATE TRIGGER "00_distribution_bookings_lock" BEFORE INSERT OR UPDATE OR DELETE ON public.bookings FOR EACH STATEMENT EXECUTE FUNCTION distribution_private.lock_inventory_statement();
CREATE TRIGGER "00_distribution_units_lock" BEFORE INSERT OR UPDATE OR DELETE ON public.room_units FOR EACH STATEMENT EXECUTE FUNCTION distribution_private.lock_inventory_statement();
CREATE TRIGGER "00_distribution_types_lock" BEFORE INSERT OR UPDATE OR DELETE ON public.room_types FOR EACH STATEMENT EXECUTE FUNCTION distribution_private.lock_inventory_statement();
CREATE TRIGGER "00_distribution_categories_lock" BEFORE INSERT OR UPDATE OR DELETE ON public.room_categories FOR EACH STATEMENT EXECUTE FUNCTION distribution_private.lock_inventory_statement();

CREATE FUNCTION distribution_private.guard_booking_inventory() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r distribution_private.reservations%ROWTYPE; u public.room_units%ROWTYPE; c uuid; d date; website boolean:=false; changed boolean;
BEGIN
 IF NOT coalesce(distribution_private.protection_active(),false) THEN
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
 END IF;
 PERFORM pg_advisory_xact_lock(823116,1);
 IF current_setting('role',true) IS DISTINCT FROM 'service_role' AND NOT coalesce(public.is_admin_new(),false) THEN RAISE EXCEPTION 'Booking changes require authorized staff or booking server' USING ERRCODE='42501'; END IF;
 IF TG_OP='DELETE' THEN
  IF EXISTS(SELECT FROM distribution_private.reservations WHERE booking_id=OLD.id AND consumes_website_quota) THEN
   RAISE EXCEPTION 'Cancel website bookings instead of deleting their payment and inventory history';
  END IF;
  RETURN OLD;
 END IF;
 SELECT * INTO r FROM distribution_private.reservations WHERE booking_id=NEW.id FOR UPDATE;
 website:=coalesce(r.consumes_website_quota,false);
 changed:=TG_OP='INSERT';
 IF TG_OP='UPDATE' THEN
  changed:=NEW.room_unit_id IS DISTINCT FROM OLD.room_unit_id OR NEW.room_type_id IS DISTINCT FROM OLD.room_type_id
   OR NEW.check_in IS DISTINCT FROM OLD.check_in OR NEW.check_out IS DISTINCT FROM OLD.check_out OR NEW.payment_status IS DISTINCT FROM OLD.payment_status;
 END IF;
 IF NOT changed THEN RETURN NEW; END IF;
 IF NEW.payment_status='cancelled' THEN RETURN NEW; END IF;
 IF NEW.check_in IS NULL OR NEW.check_out IS NULL OR NEW.check_out<=NEW.check_in OR NEW.check_out>NEW.check_in+365 THEN RAISE EXCEPTION 'Invalid reservation dates'; END IF;
 IF NEW.room_type_id IS NULL THEN RAISE EXCEPTION 'A concrete room type is required for inventory-backed bookings'; END IF;
 -- Payable website intents can only be converted by the atomic finalizer, which
 -- links the trusted private reservation before inserting the booking.
 IF NEW.payment_order_id IS NOT NULL AND EXISTS(SELECT FROM distribution_private.payment_intents WHERE provider_order_id=NEW.payment_order_id)
  AND (r.id IS NULL OR r.provider_order_id IS DISTINCT FROM NEW.payment_order_id) THEN
  RAISE EXCEPTION 'This payment requires the atomic inventory finalizer';
 END IF;
 IF TG_OP='INSERT' AND NEW.payment_method='razorpay' AND r.id IS NULL THEN
  RAISE EXCEPTION 'Unreserved payment requires staff reconciliation; do not charge again';
 END IF;
 SELECT category_id INTO c FROM public.room_types WHERE id=NEW.room_type_id;
 IF c IS NULL THEN RAISE EXCEPTION 'Room type category is missing'; END IF;
 IF NEW.room_unit_id IS NULL THEN
  SELECT x.id INTO NEW.room_unit_id FROM public.room_units x
  WHERE x.room_type_id=NEW.room_type_id AND x.is_active AND x.status='available'
   AND (x.category_id IS NULL OR x.category_id=c)
   AND NOT EXISTS(SELECT FROM public.bookings b WHERE b.id<>NEW.id AND b.room_unit_id=x.id AND b.payment_status IS DISTINCT FROM 'cancelled' AND b.check_in<NEW.check_out AND b.check_out>NEW.check_in)
   AND NOT EXISTS(SELECT FROM distribution_private.reservations z WHERE z.id IS DISTINCT FROM r.id AND z.room_unit_id=x.id AND z.state IN('held','confirmed','review_required') AND z.check_in<NEW.check_out AND z.check_out>NEW.check_in)
  ORDER BY x.unit_number,x.id LIMIT 1 FOR UPDATE;
 END IF;
 IF NEW.room_unit_id IS NULL THEN RAISE EXCEPTION 'No eligible continuous room unit is available'; END IF;
 SELECT * INTO u FROM public.room_units WHERE id=NEW.room_unit_id FOR SHARE;
 IF NOT FOUND OR u.room_type_id<>NEW.room_type_id OR NOT u.is_active OR (u.category_id IS NOT NULL AND u.category_id<>c) THEN RAISE EXCEPTION 'Invalid or inactive room unit'; END IF;
 -- Existing confirmed allocations may be occupied; no new assignment may use an
 -- operationally blocked, reserved, occupied or inactive unit.
 IF u.status<>'available' AND NOT(TG_OP='UPDATE' AND OLD.payment_status<>'cancelled' AND NEW.room_unit_id=OLD.room_unit_id AND NEW.check_in=OLD.check_in AND NEW.check_out=OLD.check_out) THEN
  RAISE EXCEPTION 'Room unit is not available for a new allocation';
 END IF;
 IF EXISTS(SELECT FROM public.bookings b WHERE b.id<>NEW.id AND b.room_unit_id=u.id AND b.payment_status IS DISTINCT FROM 'cancelled' AND b.check_in<NEW.check_out AND b.check_out>NEW.check_in)
 OR EXISTS(SELECT FROM distribution_private.reservations z WHERE z.id IS DISTINCT FROM r.id AND z.room_unit_id=u.id AND z.state IN('held','confirmed','review_required') AND z.check_in<NEW.check_out AND z.check_out>NEW.check_in) THEN RAISE EXCEPTION 'Room unit already reserved for these dates'; END IF;
 IF website AND (r.state='released' OR r.room_unit_id IS DISTINCT FROM NEW.room_unit_id OR r.room_type_id IS DISTINCT FROM NEW.room_type_id OR r.check_in IS DISTINCT FROM NEW.check_in OR r.check_out IS DISTINCT FROM NEW.check_out) THEN
  -- An active website booking's contractual selection is not silently rewritten.
  -- Cancellation is supported. Rescheduling requires a dedicated re-quote flow.
  RAISE EXCEPTION 'Website booking changes require a new verified reservation; cancel and reconcile before rebooking';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "01_distribution_booking_guard" BEFORE INSERT OR UPDATE OR DELETE ON public.bookings FOR EACH ROW EXECUTE FUNCTION distribution_private.guard_booking_inventory();

CREATE FUNCTION distribution_private.sync_booking_inventory() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r distribution_private.reservations%ROWTYPE; c uuid; rid uuid;
BEGIN
 IF NOT coalesce(distribution_private.protection_active(),false) THEN RETURN NULL; END IF;
 PERFORM pg_advisory_xact_lock(823116,1);
 IF TG_OP='DELETE' THEN
  UPDATE distribution_private.reservations SET state='released',booking_id=NULL,released_at=now(),release_reason='legacy_booking_deleted' WHERE booking_id=OLD.id;
  RETURN NULL;
 END IF;
 SELECT * INTO r FROM distribution_private.reservations WHERE booking_id=NEW.id FOR UPDATE;
 IF NEW.payment_status='cancelled' THEN
  UPDATE distribution_private.reservations SET state='released',released_at=coalesce(released_at,now()),release_reason='booking_cancelled' WHERE booking_id=NEW.id AND state<>'released';
  RETURN NULL;
 END IF;
 IF NEW.room_unit_id IS NULL OR NEW.room_type_id IS NULL THEN RAISE EXCEPTION 'Active booking requires unit and type'; END IF;
 SELECT category_id INTO c FROM public.room_types WHERE id=NEW.room_type_id;
 IF r.id IS NULL THEN
  INSERT INTO distribution_private.reservations(request_id,room_type_id,room_unit_id,check_in,check_out,state,consumes_website_quota,booking_id)
  VALUES(gen_random_uuid(),NEW.room_type_id,NEW.room_unit_id,NEW.check_in,NEW.check_out,'confirmed',false,NEW.id) RETURNING id INTO rid;
  INSERT INTO distribution_private.reservation_nights(reservation_id,category_id,stay_date)
  SELECT rid,c,d::date FROM generate_series(NEW.check_in::timestamp,(NEW.check_out-1)::timestamp,interval '1 day') d;
 ELSIF r.room_unit_id IS DISTINCT FROM NEW.room_unit_id OR r.room_type_id IS DISTINCT FROM NEW.room_type_id OR r.check_in IS DISTINCT FROM NEW.check_in OR r.check_out IS DISTINCT FROM NEW.check_out OR r.state='released' THEN
  IF r.consumes_website_quota THEN RAISE EXCEPTION 'Website reservation cannot be replaced outside verified lifecycle'; END IF;
  DELETE FROM distribution_private.reservation_nights WHERE reservation_id=r.id;
  UPDATE distribution_private.reservations SET room_type_id=NEW.room_type_id,room_unit_id=NEW.room_unit_id,check_in=NEW.check_in,check_out=NEW.check_out,state='confirmed',released_at=NULL,release_reason=NULL WHERE id=r.id;
  INSERT INTO distribution_private.reservation_nights(reservation_id,category_id,stay_date)
  SELECT r.id,c,d::date FROM generate_series(NEW.check_in::timestamp,(NEW.check_out-1)::timestamp,interval '1 day') d;
 END IF;
 RETURN NULL;
END $$;
CREATE TRIGGER distribution_booking_sync AFTER INSERT OR UPDATE OR DELETE ON public.bookings FOR EACH ROW EXECUTE FUNCTION distribution_private.sync_booking_inventory();

CREATE FUNCTION distribution_private.guard_inventory_metadata() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE relevant boolean:=false; c uuid; d date; ids uuid[];
BEGIN
 IF NOT coalesce(distribution_private.protection_active(),false) THEN
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
 END IF;
 PERFORM pg_advisory_xact_lock(823116,1);
 IF TG_TABLE_NAME='room_units' THEN
  relevant:=TG_OP='DELETE';
  IF TG_OP='UPDATE' THEN relevant:=NEW.room_type_id IS DISTINCT FROM OLD.room_type_id OR NEW.category_id IS DISTINCT FROM OLD.category_id OR NEW.is_active IS DISTINCT FROM OLD.is_active OR NEW.status IS DISTINCT FROM OLD.status; END IF;
  IF relevant AND EXISTS(SELECT FROM distribution_private.reservations r WHERE r.room_unit_id=OLD.id AND r.check_out>(now() AT TIME ZONE 'Asia/Kolkata')::date AND r.state IN('held','review_required')) THEN RAISE EXCEPTION 'Resolve the payable inventory hold before changing this room'; END IF;
  IF relevant AND (TG_OP='DELETE' OR NEW.room_type_id IS DISTINCT FROM OLD.room_type_id OR NEW.category_id IS DISTINCT FROM OLD.category_id OR NEW.is_active IS DISTINCT FROM OLD.is_active) AND EXISTS(SELECT FROM distribution_private.reservations r WHERE r.room_unit_id=OLD.id AND r.check_out>(now() AT TIME ZONE 'Asia/Kolkata')::date AND r.state='confirmed') THEN RAISE EXCEPTION 'Resolve future reservations before removing or remapping this unit'; END IF;
  SELECT array_agg(DISTINCT category_id) INTO ids FROM public.room_types WHERE id IN(OLD.room_type_id,CASE WHEN TG_OP='DELETE' THEN OLD.room_type_id ELSE NEW.room_type_id END);
 ELSIF TG_TABLE_NAME='room_types' THEN
  relevant:=TG_OP='DELETE';
  IF TG_OP='UPDATE' THEN relevant:=NEW.category_id IS DISTINCT FROM OLD.category_id OR NEW.is_published IS DISTINCT FROM OLD.is_published OR NEW.pricing_status IS DISTINCT FROM OLD.pricing_status; END IF;
  IF relevant AND EXISTS(SELECT FROM distribution_private.reservations r WHERE r.room_type_id=OLD.id AND r.check_out>(now() AT TIME ZONE 'Asia/Kolkata')::date AND r.state IN('held','review_required')) THEN RAISE EXCEPTION 'Resolve payable holds before changing room type eligibility'; END IF;
  IF relevant AND (TG_OP='DELETE' OR NEW.category_id IS DISTINCT FROM OLD.category_id) AND EXISTS(SELECT FROM distribution_private.reservations r WHERE r.room_type_id=OLD.id AND r.check_out>(now() AT TIME ZONE 'Asia/Kolkata')::date AND r.state='confirmed') THEN RAISE EXCEPTION 'Resolve future reservations before moving this room type category'; END IF;
  ids:=ARRAY[OLD.category_id,CASE WHEN TG_OP='DELETE' THEN OLD.category_id ELSE NEW.category_id END];
 ELSE
  relevant:=TG_OP='DELETE';
  IF TG_OP='UPDATE' THEN relevant:=NEW.is_active IS DISTINCT FROM OLD.is_active; END IF;
  IF relevant AND EXISTS(SELECT FROM distribution_private.reservation_nights n JOIN distribution_private.reservations r ON r.id=n.reservation_id WHERE n.category_id=OLD.id AND r.check_out>(now() AT TIME ZONE 'Asia/Kolkata')::date AND r.state IN('held','review_required')) THEN RAISE EXCEPTION 'Resolve payable holds before changing category eligibility'; END IF;
  ids:=ARRAY[OLD.id];
 END IF;
 IF relevant THEN
  FOR c IN SELECT DISTINCT x FROM unnest(ids) x WHERE x IS NOT NULL LOOP
   FOR d IN SELECT generate_series((now() AT TIME ZONE 'Asia/Kolkata')::date::timestamp,((now() AT TIME ZONE 'Asia/Kolkata')::date+365)::timestamp,interval '1 day')::date LOOP PERFORM distribution_private.bump_day(c,d); END LOOP;
  END LOOP;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER "01_distribution_units_guard" BEFORE UPDATE OR DELETE ON public.room_units FOR EACH ROW EXECUTE FUNCTION distribution_private.guard_inventory_metadata();
CREATE TRIGGER "01_distribution_types_guard" BEFORE UPDATE OR DELETE ON public.room_types FOR EACH ROW EXECUTE FUNCTION distribution_private.guard_inventory_metadata();
CREATE TRIGGER "01_distribution_categories_guard" BEFORE UPDATE OR DELETE ON public.room_categories FOR EACH ROW EXECUTE FUNCTION distribution_private.guard_inventory_metadata();

CREATE FUNCTION public.distribution_resume_payment_intent(p_request_id uuid,p_owner_scope text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p distribution_private.payment_intents%ROWTYPE;
BEGIN
 SELECT * INTO p FROM distribution_private.payment_intents WHERE request_id=p_request_id;
 IF NOT FOUND THEN RETURN NULL; END IF;
 IF p.owner_scope IS DISTINCT FROM p_owner_scope THEN RAISE EXCEPTION 'Checkout ownership mismatch'; END IF;
 RETURN p.intent;
END $$;

CREATE FUNCTION public.distribution_confirm_captured_payment(p_record jsonb,p_payment jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p distribution_private.payment_intents%ROWTYPE; r distribution_private.reservations%ROWTYPE;
 proof distribution_private.captured_payments%ROWTYPE; q jsonb; g jsonb; req jsonb; v jsonb; gid uuid; bid uuid; inv uuid; public_id text; v_email text; v_phone text; b public.bookings%ROWTYPE;
BEGIN
 -- This service-only API requires a provider-verified captured payment; the Edge
 -- wrapper verifies signature and fetches the payment. It stays usable if new
 -- sales are disabled after an already-payable order was created.
 PERFORM pg_advisory_xact_lock(823116,1);
 SELECT * INTO p FROM distribution_private.payment_intents WHERE provider_order_id=p_record->>'orderId' FOR UPDATE;
 IF NOT FOUND OR distribution_private.intent_record(p)||jsonb_build_object('orderId',p.provider_order_id) IS DISTINCT FROM p_record THEN RAISE EXCEPTION 'Bound payment checkout mismatch'; END IF;
 IF p_payment IS NULL OR p_payment->>'status' IS DISTINCT FROM 'captured' OR p_payment->>'order_id' IS DISTINCT FROM p.provider_order_id OR p_payment->>'currency' IS DISTINCT FROM p.currency
  OR coalesce(p_payment->>'id','') !~ '^pay_[A-Za-z0-9]+$' OR jsonb_typeof(p_payment->'amount') IS DISTINCT FROM 'number' OR (p_payment->>'amount')::numeric<>p.amount_paise OR coalesce((p_payment->>'amount_refunded')::numeric,0)<>0 THEN RAISE EXCEPTION 'Captured payment mismatch'; END IF;
 SELECT * INTO proof FROM distribution_private.captured_payments WHERE payment_id=p_payment->>'id' OR order_id=p.provider_order_id FOR UPDATE;
 IF FOUND THEN
  IF proof.payment_id<>p_payment->>'id' OR proof.order_id<>p.provider_order_id OR proof.hold_id<>p.hold_id THEN RAISE EXCEPTION 'Payment already allocated to another booking'; END IF;
  SELECT * INTO b FROM public.bookings WHERE id=proof.booking_id;
  IF NOT FOUND OR b.payment_status<>'confirmed' THEN RAISE EXCEPTION 'Previously confirmed payment requires staff reconciliation'; END IF;
  RETURN jsonb_build_object('bookingId',b.booking_id,'unitId',b.room_unit_id,'invoiceId',proof.invoice_id,'reused',true);
 END IF;
 IF p.state NOT IN('ready','review_required') THEN RAISE EXCEPTION 'Payment intent requires reconciliation'; END IF;
 SELECT * INTO r FROM distribution_private.reservations WHERE id=p.hold_id FOR UPDATE;
 IF NOT FOUND OR r.state<>'held' OR r.check_out<=(now() AT TIME ZONE 'Asia/Kolkata')::date OR r.provider_order_id IS DISTINCT FROM p.provider_order_id THEN RAISE EXCEPTION 'Payable room hold is missing; do not collect another payment'; END IF;
 q:=p.intent->'quoteSnapshot'; req:=q->'request'; v:=q->'variant';
 g:=coalesce(p.intent#>'{bookingMetadata,guest}',q->'guest');
 IF jsonb_typeof(q) IS DISTINCT FROM 'object' OR jsonb_typeof(g) IS DISTINCT FROM 'object'
  OR q->>'currency' IS DISTINCT FROM 'INR' OR round((q->>'total_amount')::numeric*100)<>p.amount_paise
  OR (req->>'room_type_id')::uuid<>r.room_type_id OR (req->>'check_in')::date<>r.check_in OR (req->>'check_out')::date<>r.check_out
  OR coalesce(length(btrim(g->>'first_name')),0) NOT BETWEEN 1 AND 100 OR coalesce(length(g->>'last_name'),0)>100
  OR (q->>'subtotal')::numeric+(q->>'tax_amount')::numeric<>(q->>'total_amount')::numeric THEN RAISE EXCEPTION 'Stored booking snapshot is incomplete or inconsistent'; END IF;
 IF EXISTS(SELECT FROM public.bookings WHERE payment_id=p_payment->>'id' OR payment_order_id=p.provider_order_id) THEN RAISE EXCEPTION 'Payment already has a legacy booking; reconcile instead of duplicating'; END IF;
 v_email:=nullif(btrim(g->>'email'),'');v_phone:=nullif(btrim(g->>'phone'),'');
 SELECT id INTO gid FROM public.guests WHERE (v_email IS NOT NULL AND lower(public.guests.email)=lower(v_email)) OR (v_phone IS NOT NULL AND public.guests.phone=v_phone) ORDER BY created_at,id LIMIT 1;
 IF gid IS NULL THEN
  INSERT INTO public.guests(first_name,last_name,email,phone,gender) VALUES(btrim(g->>'first_name'),coalesce(g->>'last_name',''),v_email,v_phone,nullif(g->>'gender','')) RETURNING id INTO gid;
 END IF;
 bid:=gen_random_uuid();public_id:='HL-'||replace(bid::text,'-','');inv:=gen_random_uuid();
 UPDATE distribution_private.reservations SET booking_id=bid,state='confirmed' WHERE id=r.id;
 INSERT INTO public.bookings(id,booking_id,guest_name,guest_email,guest_phone,room_type_id,room_unit_id,check_in,check_out,guests_count,total_amount,payment_status,notes,guest_id,payment_method,payment_id,payment_order_id,meal_plan_code,cancellation_policy_code,rate_breakdown,room_cost,meal_cost,selected_meals,selected_activities,selected_spa_services,selected_bedding)
 VALUES(bid,public_id,btrim((g->>'first_name')||' '||coalesce(g->>'last_name','')),v_email,v_phone,r.room_type_id,r.room_unit_id,r.check_in,r.check_out,
 (req->>'adults_count')::integer+(req->>'children_count')::integer+(req->>'infants_count')::integer,p.amount_paise::numeric/100,'confirmed',coalesce(p.intent#>>'{bookingMetadata,notes}',q->>'booking_notes'),gid,'razorpay',p_payment->>'id',p.provider_order_id,req->>'meal_plan_code',req->>'cancellation_policy_code',v||jsonb_build_object('adults_count',req->'adults_count','children_count',req->'children_count','infants_count',req->'infants_count','validated_quote',q),(v->>'room_rate')::numeric,(v->>'meal_cost')::numeric,
 coalesce((SELECT jsonb_agg(x) FROM jsonb_array_elements(q->'extras') x WHERE x->>'type'='meal'),'[]'),coalesce((SELECT jsonb_agg(x) FROM jsonb_array_elements(q->'extras') x WHERE x->>'type'='activity'),'[]'),coalesce((SELECT jsonb_agg(x) FROM jsonb_array_elements(q->'extras') x WHERE x->>'type'='spa'),'[]'),coalesce((SELECT jsonb_agg(x) FROM jsonb_array_elements(q->'extras') x WHERE x->>'type'='bedding'),'[]'));
 INSERT INTO public.invoices(id,booking_id,invoice_number,subtotal_amount,gst_amount,total_amount,paid_amount,due_amount,status,line_items)
 VALUES(inv,bid,'INV-WEB-'||replace(inv::text,'-',''),(q->>'subtotal')::numeric,(q->>'tax_amount')::numeric,p.amount_paise::numeric/100,0,p.amount_paise::numeric/100,'pending',jsonb_build_array(jsonb_build_object('description','Accommodation, selected meal plan and extras','amount',q->'subtotal')));
 INSERT INTO public.payments(invoice_id,booking_id,amount,payment_method,transaction_reference,razorpay_payment_id,razorpay_order_id,status)
 VALUES(inv,bid,p.amount_paise::numeric/100,'razorpay',p_payment->>'id',p_payment->>'id',p.provider_order_id,'completed');
 -- Explicit totals also cover installations without the existing invoice trigger.
 UPDATE public.invoices SET paid_amount=total_amount,due_amount=0,status='paid' WHERE id=inv;
 IF nullif(g->>'id_type','') IS NOT NULL AND nullif(g->>'id_number','') IS NOT NULL THEN
  INSERT INTO public.guest_identity_documents(guest_id,document_type,document_number,is_verified) SELECT gid,g->>'id_type',g->>'id_number',false WHERE NOT EXISTS(SELECT FROM public.guest_identity_documents WHERE guest_id=gid AND document_type=g->>'id_type' AND document_number=g->>'id_number');
 END IF;
 INSERT INTO distribution_private.captured_payments(payment_id,order_id,hold_id,booking_id,invoice_id,amount_paise,currency) VALUES(p_payment->>'id',p.provider_order_id,r.id,bid,inv,p.amount_paise,'INR');
 UPDATE distribution_private.payment_intents SET state='confirmed',updated_at=now() WHERE request_id=p.request_id;
 RETURN jsonb_build_object('bookingId',public_id,'unitId',r.room_unit_id,'invoiceId',inv,'reused',false);
END $$;

CREATE FUNCTION public.distribution_checkout_state() RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('enabled',coalesce(distribution_private.ready(),false))
$$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA distribution_private FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.distribution_resume_payment_intent(uuid,text),public.distribution_confirm_captured_payment(jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.distribution_resume_payment_intent(uuid,text),public.distribution_confirm_captured_payment(jsonb,jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.distribution_checkout_state() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.distribution_checkout_state() TO anon,authenticated,service_role;

-- LOCAL REVIEW CANDIDATE. Installation does not enable the feature.

ALTER TABLE distribution_private.settings ADD COLUMN legacy_checkout_paused boolean NOT NULL DEFAULT false;
-- Serialize cutover/disable with new inventory admission before settings tuple locks.
CREATE FUNCTION distribution_private.lock_settings_statement() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN PERFORM pg_advisory_xact_lock(823116,1); RETURN NULL; END $$;
CREATE TRIGGER distribution_settings_lock BEFORE INSERT OR UPDATE OR DELETE ON distribution_private.settings FOR EACH STATEMENT EXECUTE FUNCTION distribution_private.lock_settings_statement();
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
   v_count:=least(v_count,distribution_private.effective_remaining(v_category,v_day));
  END LOOP;
 END IF;
 RETURN v_count;
END $$;
CREATE FUNCTION public.distribution_pending_holds() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin_new() THEN RAISE EXCEPTION 'Admin authorization required' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('hold_id',r.id,'state',r.state,'payment_state',p.state,'category_name',c.name,'room_type_name',t.name,'unit_number',u.unit_number,'check_in',r.check_in,'check_out',r.check_out,'created_at',r.created_at,'provider_order_id',r.provider_order_id,'review_reason',p.review_reason) ORDER BY r.created_at),'[]') INTO result
 FROM distribution_private.reservations r LEFT JOIN distribution_private.payment_intents p ON p.hold_id=r.id
 JOIN public.room_units u ON u.id=r.room_unit_id JOIN public.room_types t ON t.id=r.room_type_id JOIN public.room_categories c ON c.id=t.category_id
 WHERE r.state IN('held','review_required');
 RETURN result;
END $$;
-- Deliberately no arbitrary "release unpaid" RPC: a still-payable order is not
-- safe to release merely because a staff member clicked a button or a timer ran.
CREATE FUNCTION public.distribution_admin_reconciliation_intent(p_hold_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p distribution_private.payment_intents%ROWTYPE;
BEGIN
 -- service-only wrapper must authenticate the admin before calling this lookup;
 -- no client receives guest details or the private owner capability.
 SELECT * INTO p FROM distribution_private.payment_intents WHERE hold_id=p_hold_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Payment intent not found'; END IF;
 RETURN jsonb_build_object('intent',p.intent,'record',distribution_private.intent_record(p),'orderId',p.provider_order_id,'state',p.state);
END $$;
CREATE FUNCTION public.distribution_get_hold_payment_record(p_hold_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p distribution_private.payment_intents%ROWTYPE;
BEGIN
 SELECT * INTO p FROM distribution_private.payment_intents WHERE hold_id=p_hold_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Payment intent not found'; END IF;
 RETURN jsonb_build_object('record',distribution_private.intent_record(p)||jsonb_build_object('orderId',p.provider_order_id),'provider_order_id',p.provider_order_id,'state',p.state,'created_at',p.created_at);
END $$;
REVOKE ALL ON FUNCTION public.distribution_get_hold_payment_record(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.distribution_get_hold_payment_record(uuid) TO service_role;
CREATE FUNCTION public.distribution_close_unused_checkout(p_request_id uuid,p_owner_scope text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE existing_owner text;
BEGIN
 IF p_request_id IS NULL OR coalesce(length(p_owner_scope),0) NOT BETWEEN 1 AND 512 THEN RAISE EXCEPTION 'Invalid checkout identity'; END IF;
 PERFORM pg_advisory_xact_lock(823116,1);
 IF EXISTS(SELECT FROM distribution_private.payment_intents WHERE request_id=p_request_id) OR EXISTS(SELECT FROM distribution_private.reservations WHERE request_id=p_request_id) THEN RETURN false; END IF;
 SELECT owner_scope INTO existing_owner FROM distribution_private.closed_checkout_requests WHERE request_id=p_request_id;
 IF FOUND THEN RETURN existing_owner=p_owner_scope; END IF;
 INSERT INTO distribution_private.closed_checkout_requests(request_id,owner_scope) VALUES(p_request_id,p_owner_scope);
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.distribution_close_unused_checkout(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.distribution_close_unused_checkout(uuid,text) TO service_role;
CREATE OR REPLACE FUNCTION public.distribution_checkout_state() RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('enabled',coalesce(distribution_private.ready(),false),'legacy_checkout_paused',coalesce((SELECT legacy_checkout_paused FROM distribution_private.settings WHERE singleton),false))
$$;
CREATE FUNCTION public.distribution_resume_checkout(p_request_id uuid,p_owner_scope text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p distribution_private.payment_intents%ROWTYPE; public_booking_id text; public_booking_status text;
BEGIN
 SELECT * INTO p FROM distribution_private.payment_intents WHERE request_id=p_request_id;
 IF NOT FOUND THEN RETURN NULL; END IF;
 IF p.owner_scope IS DISTINCT FROM p_owner_scope THEN RAISE EXCEPTION 'Checkout ownership mismatch'; END IF;
 SELECT b.booking_id,b.payment_status INTO public_booking_id,public_booking_status FROM distribution_private.reservations r JOIN public.bookings b ON b.id=r.booking_id WHERE r.id=p.hold_id;
 RETURN jsonb_build_object('intent',p.intent,'record',distribution_private.intent_record(p)||jsonb_build_object('orderId',p.provider_order_id),'provider_order_id',p.provider_order_id,'state',p.state,'booking_id',public_booking_id,'booking_status',public_booking_status);
END $$;
REVOKE ALL ON FUNCTION public.distribution_resume_checkout(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.distribution_resume_checkout(uuid,text) TO service_role;
REVOKE ALL ON FUNCTION public.distribution_pending_holds() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.distribution_pending_holds() TO authenticated;
REVOKE ALL ON FUNCTION public.distribution_admin_reconciliation_intent(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.distribution_admin_reconciliation_intent(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.distribution_website_type_availability(uuid,date,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.distribution_website_type_availability(uuid,date,date) TO anon,authenticated,service_role;

-- Installation only. Calling backfill requires reviewed deployment/activation.

CREATE FUNCTION public.distribution_inventory_activation_audit() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE today date:=(now() AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
 RETURN jsonb_build_object(
 'active_unassigned_bookings',(SELECT count(*) FROM public.bookings WHERE payment_status IS DISTINCT FROM 'cancelled' AND check_out>today AND (room_unit_id IS NULL OR room_type_id IS NULL)),
 'active_mismatched_bookings',(SELECT count(*) FROM public.bookings b JOIN public.room_units u ON u.id=b.room_unit_id WHERE b.payment_status IS DISTINCT FROM 'cancelled' AND b.check_out>today AND b.room_type_id IS DISTINCT FROM u.room_type_id),
 'overlapping_bookings',(SELECT count(*) FROM public.bookings a JOIN public.bookings b ON a.id<b.id AND a.room_unit_id=b.room_unit_id AND a.check_in<b.check_out AND a.check_out>b.check_in WHERE a.payment_status IS DISTINCT FROM 'cancelled' AND b.payment_status IS DISTINCT FROM 'cancelled' AND a.check_out>today AND b.check_out>today),
 'unbridged_active_bookings',(SELECT count(*) FROM public.bookings b WHERE b.payment_status IS DISTINCT FROM 'cancelled' AND b.check_out>today AND NOT EXISTS(SELECT FROM distribution_private.reservations r WHERE r.booking_id=b.id)),
 'unbound_saved_order_quotes',(SELECT count(*) FROM public.booking_order_quotes q WHERE NOT EXISTS(SELECT FROM distribution_private.payment_intents p WHERE p.provider_order_id=q.order_id)),
 'note','Provider orders outside saved quotes must be audited separately; zero database quotes is not proof of zero payable provider orders.'
 );
END $$;
CREATE FUNCTION public.distribution_backfill_existing_bookings() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b public.bookings%ROWTYPE; c uuid; rid uuid; total integer:=0; audit jsonb; today date:=(now() AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
 PERFORM pg_advisory_xact_lock(823116,1);
 audit:=public.distribution_inventory_activation_audit();
 IF (audit->>'active_unassigned_bookings')::integer<>0 OR (audit->>'active_mismatched_bookings')::integer<>0 OR (audit->>'overlapping_bookings')::integer<>0 THEN RAISE EXCEPTION 'Existing inventory requires reconciliation before activation'; END IF;
 FOR b IN SELECT * FROM public.bookings WHERE payment_status IS DISTINCT FROM 'cancelled' AND check_out>today ORDER BY id FOR UPDATE LOOP
  IF EXISTS(SELECT FROM distribution_private.reservations WHERE booking_id=b.id) THEN CONTINUE; END IF;
  SELECT category_id INTO c FROM public.room_types WHERE id=b.room_type_id;
  IF c IS NULL OR b.check_out<=b.check_in OR b.check_out>b.check_in+365 THEN RAISE EXCEPTION 'Existing booking has invalid inventory mapping'; END IF;
  IF EXISTS(SELECT FROM distribution_private.reservations WHERE room_unit_id=b.room_unit_id AND state IN('held','confirmed','review_required') AND check_in<b.check_out AND check_out>b.check_in) THEN RAISE EXCEPTION 'Existing booking overlaps a new hold'; END IF;
  INSERT INTO distribution_private.reservations(request_id,room_type_id,room_unit_id,check_in,check_out,state,consumes_website_quota,booking_id)
  VALUES(gen_random_uuid(),b.room_type_id,b.room_unit_id,b.check_in,b.check_out,'confirmed',false,b.id) RETURNING id INTO rid;
  INSERT INTO distribution_private.reservation_nights(reservation_id,category_id,stay_date) SELECT rid,c,d::date FROM generate_series(b.check_in::timestamp,(b.check_out-1)::timestamp,interval '1 day')d;
  total:=total+1;
 END LOOP;
 RETURN jsonb_build_object('backfilled',total,'source','legacy_unknown','website_quota_consumed',false);
END $$;
REVOKE ALL ON FUNCTION public.distribution_inventory_activation_audit(),public.distribution_backfill_existing_bookings() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.distribution_inventory_activation_audit(),public.distribution_backfill_existing_bookings() TO service_role;

-- Service-only recovery after verified exact-one provider receipt lookup. No release.

CREATE FUNCTION public.distribution_reconcile_payment_order(p_hold_id uuid,p_order jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p distribution_private.payment_intents%ROWTYPE; r distribution_private.reservations%ROWTYPE;
BEGIN
 -- Admin Edge wrapper fetches this order directly from Razorpay. SQL does not
 -- trust a browser-provided order, and this function is service-role only.
 PERFORM pg_advisory_xact_lock(823116,1);
 SELECT * INTO p FROM distribution_private.payment_intents WHERE hold_id=p_hold_id FOR UPDATE;
 IF NOT FOUND OR p.state NOT IN('creating','review_required','ready','confirmed') THEN RAISE EXCEPTION 'Hold is not reconcilable'; END IF;
 IF p_order IS NULL OR coalesce(p_order->>'id','') !~ '^order_[A-Za-z0-9]+$'
  OR p_order->>'receipt' IS DISTINCT FROM p.receipt OR p_order->>'currency' IS DISTINCT FROM p.currency
  OR jsonb_typeof(p_order->'amount') IS DISTINCT FROM 'number' OR (p_order->>'amount')::numeric<>p.amount_paise
  OR p_order#>>'{notes,inventory_hold}' IS DISTINCT FROM p.hold_id::text
  OR p_order->>'status' NOT IN('created','attempted','paid') OR p_order->>'status' IS NULL THEN RAISE EXCEPTION 'Provider order does not match this hold'; END IF;
 IF p.provider_order_id IS NOT NULL THEN
  IF p.provider_order_id<>p_order->>'id' THEN RAISE EXCEPTION 'Hold already bound to a different provider order'; END IF;
  RETURN distribution_private.intent_record(p)||jsonb_build_object('orderId',p.provider_order_id);
 END IF;
 SELECT * INTO r FROM distribution_private.reservations WHERE id=p.hold_id FOR UPDATE;
 IF NOT FOUND OR r.state<>'held' OR r.provider_order_id IS NOT NULL THEN RAISE EXCEPTION 'Inventory hold is not available for reconciliation'; END IF;
 UPDATE distribution_private.reservations SET provider_order_id=p_order->>'id' WHERE id=r.id;
 UPDATE distribution_private.payment_intents SET state='ready',provider_order_id=p_order->>'id',provider_order=p_order,review_reason=NULL,updated_at=now() WHERE request_id=p.request_id RETURNING * INTO p;
 RETURN distribution_private.intent_record(p)||jsonb_build_object('orderId',p.provider_order_id);
END $$;
REVOKE ALL ON FUNCTION public.distribution_reconcile_payment_order(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.distribution_reconcile_payment_order(uuid,jsonb) TO service_role;

-- Server-derived HMAC admission keys only; never stores raw IP or guest contact.

ALTER TABLE distribution_private.payment_intents ADD COLUMN source_key text CHECK(source_key ~ '^[0-9a-f]{64}$'), ADD COLUMN contact_key text CHECK(contact_key ~ '^[0-9a-f]{64}$'), ADD COLUMN source_verified boolean;
CREATE INDEX distribution_intent_pending_source ON distribution_private.payment_intents(source_key,state);
CREATE INDEX distribution_intent_pending_contact ON distribution_private.payment_intents(contact_key,state);
CREATE INDEX distribution_intent_hourly_source ON distribution_private.payment_intents(source_key,created_at);
CREATE OR REPLACE FUNCTION public.distribution_begin_payment_intent(p_intent jsonb) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p distribution_private.payment_intents%ROWTYPE; v_request uuid; v_amount numeric; v_hold jsonb; v_record jsonb;
BEGIN
 IF NOT coalesce(distribution_private.ready(),false) THEN RAISE EXCEPTION 'Website inventory is not activated'; END IF;
 IF p_intent IS NULL OR jsonb_typeof(p_intent)<>'object' OR octet_length(p_intent::text)>262144 THEN RAISE EXCEPTION 'Invalid payment intent'; END IF;
 IF coalesce(p_intent->>'requestId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'Invalid request ID'; END IF;
 v_request:=(p_intent->>'requestId')::uuid;
 IF jsonb_typeof(p_intent->'amountPaise') IS DISTINCT FROM 'number' OR p_intent->>'currency' IS DISTINCT FROM 'INR'
  OR jsonb_typeof(p_intent->'ownerScope') IS DISTINCT FROM 'string' OR length(p_intent->>'ownerScope') NOT BETWEEN 1 AND 512
  OR jsonb_typeof(p_intent->'quoteFingerprint') IS DISTINCT FROM 'string' OR length(p_intent->>'quoteFingerprint') NOT BETWEEN 1 AND 1024
  OR jsonb_typeof(p_intent->'selection') IS DISTINCT FROM 'object' OR jsonb_typeof(p_intent->'quoteSnapshot') IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid payment intent'; END IF;
 v_amount:=(p_intent->>'amountPaise')::numeric;
 IF v_amount<>trunc(v_amount) OR v_amount NOT BETWEEN 100 AND 9007199254740991 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
 PERFORM pg_advisory_xact_lock(823116,1);
 IF EXISTS(SELECT FROM distribution_private.closed_checkout_requests WHERE request_id=v_request) THEN RAISE EXCEPTION 'Checkout request was closed; use a new request'; END IF;
 SELECT * INTO p FROM distribution_private.payment_intents WHERE request_id=v_request FOR UPDATE;
 IF FOUND THEN
  IF p.intent<>p_intent THEN RAISE EXCEPTION 'Request ID already used for different owner, selection or quote'; END IF;
  v_record:=distribution_private.intent_record(p);
  IF p.state='ready' THEN RETURN jsonb_build_object('state','ready','record',v_record,'order',p.provider_order); END IF;
  -- A repeated call never returns the ownership token, even after uncertainty.
  RETURN jsonb_build_object('state',p.state,'record',v_record);
 END IF;
 IF jsonb_typeof(p_intent->'admission') IS DISTINCT FROM 'object'
  OR coalesce(p_intent#>>'{admission,sourceKey}','') !~ '^[0-9a-f]{64}$'
  OR coalesce(p_intent#>>'{admission,contactKey}','') !~ '^[0-9a-f]{64}$'
  OR jsonb_typeof(p_intent#>'{admission,sourceVerified}') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Server admission keys are required'; END IF;
 IF (SELECT count(*) FROM distribution_private.payment_intents WHERE source_key=p_intent#>>'{admission,sourceKey}' AND state IN('creating','ready','review_required'))>=3
 OR (SELECT count(*) FROM distribution_private.payment_intents WHERE contact_key=p_intent#>>'{admission,contactKey}' AND state IN('creating','ready','review_required'))>=1
 OR (SELECT count(*) FROM distribution_private.payment_intents WHERE source_key=p_intent#>>'{admission,sourceKey}' AND created_at>now()-interval '1 hour')>=10 THEN
  RAISE EXCEPTION 'DISTRIBUTION_ADMISSION_LIMIT: Too many pending checkout attempts. Retry later or contact hotel to reconcile existing attempts.' USING ERRCODE='P0001';
 END IF;
 v_hold:=public.distribution_hold_website_inventory(v_request,(p_intent#>>'{selection,roomTypeId}')::uuid,
  (p_intent#>>'{selection,checkIn}')::date,(p_intent#>>'{selection,checkOut}')::date,nullif(p_intent#>>'{selection,unitId}','')::uuid);
 -- Preexisting reservations without this intent must not acquire fresh provider
 -- ownership: they may belong to a previous integration or unfinished operation.
 IF coalesce((v_hold->>'reused')::boolean,false) THEN RAISE EXCEPTION 'Existing hold requires payment-intent reconciliation'; END IF;
 INSERT INTO distribution_private.payment_intents(request_id,hold_id,owner_scope,quote_fingerprint,amount_paise,currency,receipt,intent,state,source_key,contact_key,source_verified)
 VALUES(v_request,(v_hold->>'hold_id')::uuid,p_intent->>'ownerScope',p_intent->>'quoteFingerprint',v_amount::bigint,'INR','hl_'||replace(v_request::text,'-',''),p_intent,'creating',p_intent#>>'{admission,sourceKey}',p_intent#>>'{admission,contactKey}',(p_intent#>>'{admission,sourceVerified}')::boolean) RETURNING * INTO p;
 RETURN jsonb_build_object('state','create_owned','record',distribution_private.intent_record(p),'operationToken',p.operation_token);
END $$;

REVOKE ALL ON FUNCTION public.distribution_begin_payment_intent(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.distribution_begin_payment_intent(jsonb) TO service_role;
