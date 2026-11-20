CREATE OR REPLACE FUNCTION public.validate_guest_age_bands(p_bands jsonb) RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path=public,pg_temp AS $$
DECLARE b jsonb; prior_max integer:=-1; lo integer; hi integer; open_end boolean:=false;
BEGIN
 IF jsonb_typeof(p_bands) IS DISTINCT FROM 'array' OR jsonb_array_length(p_bands)<1 THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_bands) b GROUP BY b->>'key' HAVING count(*)>1) THEN RETURN false; END IF;
 FOR b IN SELECT value FROM jsonb_array_elements(p_bands) ORDER BY (value->>'min_age')::integer LOOP
  IF coalesce(b->>'key','') !~ '^[a-z][a-z0-9_]*$' OR (b ? 'name' AND (jsonb_typeof(b->'name') IS DISTINCT FROM 'string' OR length(trim(b->>'name'))=0)) THEN RETURN false; END IF;
  IF b ? 'enabled' AND jsonb_typeof(b->'enabled') IS DISTINCT FROM 'boolean' THEN RETURN false; END IF;
  IF jsonb_typeof(b->'min_age') IS DISTINCT FROM 'number' OR b->>'min_age' !~ '^[0-9]+$' THEN RETURN false; END IF;
  lo:=(b->>'min_age')::integer;
  IF NOT b ? 'max_age' THEN RETURN false; END IF;
  IF b->'max_age'='null'::jsonb THEN hi:=null;
  ELSE
   IF jsonb_typeof(b->'max_age') IS DISTINCT FROM 'number' OR b->>'max_age' !~ '^[0-9]+$' THEN RETURN false; END IF;
   hi:=(b->>'max_age')::integer; IF hi<lo THEN RETURN false; END IF;
  END IF;
  IF coalesce(b->>'accommodation_rule','') NOT IN ('adult','child','guest_type','free') OR coalesce(b->>'meal_rule','') NOT IN ('full','free') THEN RETURN false; END IF;
  IF coalesce((b->>'enabled')::boolean,true) THEN
   IF open_end OR lo<=prior_max THEN RETURN false; END IF;
   open_end:=hi IS NULL; prior_max:=hi;
  END IF;
 END LOOP;
 RETURN true;
EXCEPTION WHEN others THEN RETURN false;
END $$;
CREATE OR REPLACE FUNCTION public.set_guest_type_policy_status(p_expected_revision integer,p_band jsonb,p_enabled boolean) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE current_policy jsonb; next_bands jsonb; candidate jsonb; replacement jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_admin_new(),false) THEN RAISE EXCEPTION 'Administrator required' USING errcode='42501'; END IF;
 IF p_enabled IS NULL OR coalesce(p_band->>'key','') !~ '^[a-z][a-z0-9_]*$' THEN RAISE EXCEPTION 'Invalid guest type or status'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('guest_age_policy_versions'));
 current_policy:=public.get_guest_age_policy();
 IF (current_policy->>'revision')::integer IS DISTINCT FROM p_expected_revision THEN RAISE EXCEPTION 'AGE_POLICY_CHANGED: refresh and review before saving'; END IF;
 IF NOT p_enabled THEN
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(current_policy->'bands') b WHERE (b-'enabled')=(p_band-'enabled') AND coalesce((b->>'enabled')::boolean,true)) THEN RAISE EXCEPTION 'Only an active current policy can be deactivated'; END IF;
  FOR candidate IN SELECT b FROM public.guest_age_policy_versions v CROSS JOIN LATERAL jsonb_array_elements(v.bands) b WHERE b->>'key'=p_band->>'key' AND (b-'enabled')<>(p_band-'enabled') AND b->'min_age'=p_band->'min_age' AND b->'max_age'=p_band->'max_age' ORDER BY v.revision DESC LOOP
   SELECT jsonb_agg(CASE WHEN b->>'key'=p_band->>'key' THEN candidate||jsonb_build_object('enabled',true) ELSE b END ORDER BY ord) INTO next_bands FROM jsonb_array_elements(current_policy->'bands') WITH ORDINALITY x(b,ord);
   IF public.validate_guest_age_bands(next_bands) THEN replacement:=candidate; EXIT; END IF;
  END LOOP;
  IF replacement IS NULL THEN RAISE EXCEPTION 'NO_ALTERNATE_POLICY: an alternate policy covering the same ages is required before deactivation'; END IF;
 ELSE
  IF NOT EXISTS(SELECT 1 FROM public.guest_age_policy_versions v CROSS JOIN LATERAL jsonb_array_elements(v.bands) b WHERE (b-'enabled')=(p_band-'enabled')) THEN RAISE EXCEPTION 'Policy version not found'; END IF;
  SELECT jsonb_agg(CASE WHEN b->>'key'=p_band->>'key' THEN p_band||jsonb_build_object('enabled',true) ELSE b END ORDER BY ord) INTO next_bands FROM jsonb_array_elements(current_policy->'bands') WITH ORDINALITY x(b,ord);
 END IF;
 RETURN public.save_guest_age_policy(p_expected_revision,next_bands);
END $$;
CREATE OR REPLACE FUNCTION public.validate_meal_age_pricing_rules(p_rules jsonb) RETURNS boolean LANGUAGE plpgsql STABLE SET search_path=public,pg_temp AS $$
DECLARE r jsonb; policy jsonb:=public.get_guest_age_policy(); amount numeric;
BEGIN
 IF jsonb_typeof(p_rules) IS DISTINCT FROM 'array' OR jsonb_array_length(p_rules)<>jsonb_array_length(policy->'bands')*4 THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_rules) r GROUP BY r->>'plan_code',r->>'band_key' HAVING count(*)>1) THEN RETURN false; END IF;
 FOR r IN SELECT value FROM jsonb_array_elements(p_rules) LOOP
  IF r->>'plan_code' NOT IN ('RO','BB','HB','FB') OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(policy->'bands') b WHERE b->>'key'=r->>'band_key') OR coalesce(r->>'mode','') NOT IN ('full','percentage','fixed','free') THEN RETURN false; END IF;
  IF r->>'plan_code'='RO' AND r->>'mode'<>'free' OR r->>'plan_code'<>'RO' AND r->>'band_key'='adult' AND r->>'mode'<>'full' THEN RETURN false; END IF;
  IF r->>'mode' IN ('full','free') THEN IF r->'value' IS DISTINCT FROM 'null'::jsonb THEN RETURN false; END IF;
  ELSE
   IF jsonb_typeof(r->'value') IS DISTINCT FROM 'number' THEN RETURN false; END IF;
   amount:=(r->>'value')::numeric; IF amount<0 OR round(amount,2)<>amount OR r->>'mode'='percentage' AND amount>100 THEN RETURN false; END IF;
  END IF;
 END LOOP;
 RETURN true;
EXCEPTION WHEN others THEN RETURN false;
END $$;
DO $$ DECLARE d text; BEGIN
 SELECT pg_get_functiondef('public.save_meal_age_pricing_policy(integer,jsonb,integer,bigint)'::regprocedure) INTO d;
 d:=replace(d, 'perform 1 from guest_pricing_private.release_state where id and active for share;
 if not found then raise exception ''GUEST_PRICING_NOT_ACTIVE: age and meal pricing are staged; publish and activate the matching booking frontend before editing''; end if;', '');
 IF d LIKE '%GUEST_PRICING_NOT_ACTIVE%' THEN RAISE EXCEPTION 'Meal save guard changed; review required'; END IF;
 EXECUTE d;
END $$;