REVOKE ALL ON public.guest_type_pricing_release FROM anon,authenticated;
ALTER TABLE public.bookings ADD COLUMN guest_counts jsonb, ADD COLUMN guest_policy_snapshot jsonb;
CREATE FUNCTION public.persist_quoted_guest_party() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE req jsonb:=NEW.rate_breakdown#>'{validated_quote,request}'; counts jsonb; n integer;
BEGIN
 counts:=req->'guest_counts';
 IF counts IS NULL THEN RETURN NEW; END IF;
 IF jsonb_typeof(counts) IS DISTINCT FROM 'object' OR EXISTS(SELECT 1 FROM jsonb_each(counts) e WHERE jsonb_typeof(e.value) IS DISTINCT FROM 'number' OR e.value::text !~ '^[0-9]+$' OR e.value::numeric>100) THEN RAISE EXCEPTION 'Invalid quoted guest breakdown'; END IF;
 SELECT sum(value::text::integer) INTO n FROM jsonb_each(counts);
 IF n IS NULL OR n<1 OR n>100 THEN RAISE EXCEPTION 'Invalid quoted guest total'; END IF;
 NEW.guest_counts:=counts; NEW.guests_count:=n;
 NEW.guest_policy_snapshot:=NEW.rate_breakdown#>'{validated_quote,variant,guest_age_policy}';
 RETURN NEW;
END $$;
CREATE TRIGGER persist_quoted_guest_party BEFORE INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.persist_quoted_guest_party();
-- The configured drafts live in their existing private schema.
DO $$ DECLARE d text; signature text; BEGIN
 FOREACH signature IN ARRAY ARRAY['public.validate_keyed_override_guest()','public.validate_meal_age_pricing_rules(jsonb)'] LOOP
 d:=pg_get_functiondef(signature::regprocedure); d:=replace(d,'public.guest_policy_drafts','guest_policy_private.guest_policy_drafts'); EXECUTE d;
 END LOOP;
END $$;
ALTER FUNCTION public.validate_keyed_override_guest() SECURITY DEFINER;
REVOKE ALL ON FUNCTION public.validate_meal_age_pricing_rules(jsonb) FROM PUBLIC,anon,authenticated;
-- Enforce age coverage even while edits are staged, not only while the old release is active.
DO $$ DECLARE d text; BEGIN
 d:=pg_get_functiondef('public.save_guest_age_policy(integer,jsonb)'::regprocedure);
 d:=replace(d,'IF public.guest_age_meal_pricing_active() THEN','IF NOT public.guest_policy_complete(p_bands) THEN RAISE EXCEPTION ''Age policies must cover every completed year without gaps or overlaps''; END IF; IF public.guest_age_meal_pricing_active() AND NOT EXISTS(SELECT 1 FROM public.guest_type_pricing_release WHERE id AND enabled AND frontend_release=''keyed-guest-v1'') THEN');
 EXECUTE d;
 d:=pg_get_functiondef('guest_policy_private.apply_guest_policy_with_drafts(integer,jsonb,boolean,jsonb)'::regprocedure);
 d:=replace(d,'IF public.guest_age_meal_pricing_active() AND','IF public.guest_age_meal_pricing_active() AND NOT EXISTS(SELECT 1 FROM public.guest_type_pricing_release WHERE id AND enabled AND frontend_release=''keyed-guest-v1'') AND');
 EXECUTE d;
END $$;
-- Move privileged helpers outside the exposed API schema; expose only narrow invoker wrappers.
ALTER FUNCTION public.get_booking_guest_policy() SET SCHEMA guest_pricing_private;
ALTER FUNCTION public.validate_guest_type_counts(jsonb,integer) SET SCHEMA guest_pricing_private;
ALTER FUNCTION public.guest_type_accommodation_charge(jsonb,jsonb) SET SCHEMA guest_pricing_private;
ALTER FUNCTION public.guest_type_meal_charge(text,numeric,jsonb) SET SCHEMA guest_pricing_private;
ALTER FUNCTION public.calculate_guest_type_rate_variants(uuid,date,date,jsonb,integer,uuid,text,boolean) SET SCHEMA guest_pricing_private;
DO $$ DECLARE d text; signature text; BEGIN
 FOREACH signature IN ARRAY ARRAY['guest_pricing_private.validate_guest_type_counts(jsonb,integer)','guest_pricing_private.guest_type_accommodation_charge(jsonb,jsonb)','guest_pricing_private.guest_type_meal_charge(text,numeric,jsonb)','guest_pricing_private.calculate_guest_type_rate_variants(uuid,date,date,jsonb,integer,uuid,text,boolean)','public.calculate_keyed_rate_variants_engine(uuid,date,date,uuid,integer,integer,integer,text,jsonb)'] LOOP
 d:=pg_get_functiondef(signature::regprocedure);
 d:=replace(d,'public.get_booking_guest_policy()','guest_pricing_private.get_booking_guest_policy()');
 d:=replace(d,'public.validate_guest_type_counts(','guest_pricing_private.validate_guest_type_counts(');
 d:=replace(d,'public.guest_type_accommodation_charge(','guest_pricing_private.guest_type_accommodation_charge(');
 d:=replace(d,'public.guest_type_meal_charge(','guest_pricing_private.guest_type_meal_charge(');
 IF signature LIKE 'guest_pricing_private.calculate_guest_type_rate_variants%' THEN
 d:=replace(d,'p:=guest_pricing_private.validate_guest_type_counts','IF p_website IS NULL OR (NOT p_website AND auth.role() IS DISTINCT FROM ''service_role'' AND (auth.uid() IS NULL OR NOT coalesce(public.is_admin_new(),false))) THEN RAISE EXCEPTION ''Administrator required for internal rate previews'' USING errcode=''42501''; END IF; p:=guest_pricing_private.validate_guest_type_counts');
 END IF;
 EXECUTE d;
 END LOOP;
END $$;
GRANT USAGE ON SCHEMA guest_pricing_private TO anon,authenticated,service_role;
REVOKE ALL ON FUNCTION guest_pricing_private.get_booking_guest_policy(),guest_pricing_private.validate_guest_type_counts(jsonb,integer),guest_pricing_private.guest_type_accommodation_charge(jsonb,jsonb),guest_pricing_private.guest_type_meal_charge(text,numeric,jsonb),guest_pricing_private.calculate_guest_type_rate_variants(uuid,date,date,jsonb,integer,uuid,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION guest_pricing_private.get_booking_guest_policy(),guest_pricing_private.calculate_guest_type_rate_variants(uuid,date,date,jsonb,integer,uuid,text,boolean) TO anon,authenticated,service_role;
CREATE FUNCTION public.get_booking_guest_policy() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$SELECT guest_pricing_private.get_booking_guest_policy()$$;
CREATE FUNCTION public.calculate_guest_type_rate_variants(p_room_type_id uuid,p_check_in date,p_check_out date,p_guest_counts jsonb,p_policy_revision integer,p_room_unit_id uuid DEFAULT NULL,p_booking_channel text DEFAULT 'direct',p_website boolean DEFAULT false) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT guest_pricing_private.calculate_guest_type_rate_variants(p_room_type_id,p_check_in,p_check_out,p_guest_counts,p_policy_revision,p_room_unit_id,p_booking_channel,p_website)$$;
REVOKE ALL ON FUNCTION public.get_booking_guest_policy(),public.calculate_guest_type_rate_variants(uuid,date,date,jsonb,integer,uuid,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_booking_guest_policy(),public.calculate_guest_type_rate_variants(uuid,date,date,jsonb,integer,uuid,text,boolean) TO anon,authenticated,service_role;
NOTIFY pgrst,'reload schema';