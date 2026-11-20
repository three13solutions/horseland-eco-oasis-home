CREATE OR REPLACE FUNCTION public.save_guest_age_policy(p_expected_revision integer,p_bands jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE current_revision integer; old_bands jsonb; expected_min integer:=0; b jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_admin_new(),false) THEN RAISE EXCEPTION 'Administrator required' USING errcode='42501'; END IF;
 IF NOT public.validate_guest_age_bands(p_bands) THEN RAISE EXCEPTION 'Active age ranges cannot overlap; choose valid ages and charge rules'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_bands) x WHERE x->'enabled'='false'::jsonb) THEN RAISE EXCEPTION 'Use the status toggle: an alternate policy must replace a deactivated policy'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('guest_age_policy_versions'));
 SELECT revision,bands INTO current_revision,old_bands FROM public.guest_age_policy_versions ORDER BY revision DESC LIMIT 1;
 IF p_expected_revision IS DISTINCT FROM current_revision THEN RAISE EXCEPTION 'AGE_POLICY_CHANGED: refresh and review before saving'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(old_bands) old WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_bands) next WHERE next->>'key'=old->>'key')) THEN RAISE EXCEPTION 'Guest types cannot be removed through policy edits'; END IF;
 IF public.guest_age_meal_pricing_active() THEN
  IF jsonb_array_length(p_bands)<>3 OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_bands) x WHERE x->>'key' NOT IN ('adult','child','infant') OR x->>'accommodation_rule'='guest_type') THEN RAISE EXCEPTION 'CUSTOM_GUEST_PRICING_STAGED: custom types require the matching guest-selection and pricing release'; END IF;
  FOR b IN SELECT value FROM jsonb_array_elements(p_bands) ORDER BY (value->>'min_age')::integer LOOP
   IF (b->>'min_age')::integer<>expected_min THEN RAISE EXCEPTION 'Live age ranges must cover every age without gaps'; END IF;
   IF b->>'key'='adult' AND b->'max_age'<>'null'::jsonb THEN RAISE EXCEPTION 'Adult segmentation requires the matching guest-selection and pricing release'; END IF;
   expected_min:=coalesce((b->>'max_age')::integer,0)+1;
  END LOOP;
 END IF;
 INSERT INTO public.guest_age_policy_versions(revision,bands,updated_by) VALUES(current_revision+1,p_bands,auth.uid());
 RETURN public.get_guest_age_policy();
END $$;