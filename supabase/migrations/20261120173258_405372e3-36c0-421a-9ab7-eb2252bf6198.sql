CREATE OR REPLACE FUNCTION public.validate_guest_age_bands(p_bands jsonb) RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path=public,pg_temp AS $$
DECLARE b jsonb; k text; expected_min integer:=0; lo integer; hi integer;
BEGIN
 IF jsonb_typeof(p_bands) IS DISTINCT FROM 'array' OR jsonb_array_length(p_bands)<>3 THEN RETURN false; END IF;
 FOREACH k IN ARRAY ARRAY['infant','child','adult'] LOOP
  IF (SELECT count(*) FROM jsonb_array_elements(p_bands) x WHERE x->>'key'=k)<>1 THEN RETURN false; END IF;
  SELECT x INTO b FROM jsonb_array_elements(p_bands) x WHERE x->>'key'=k;
  IF b ? 'enabled' AND jsonb_typeof(b->'enabled') IS DISTINCT FROM 'boolean' THEN RETURN false; END IF;
  IF jsonb_typeof(b->'min_age') IS DISTINCT FROM 'number' OR b->>'min_age' !~ '^[0-9]+$' THEN RETURN false; END IF;
  lo:=(b->>'min_age')::integer; IF lo<>expected_min OR lo>150 THEN RETURN false; END IF;
  IF k='adult' THEN
   IF NOT b ? 'max_age' OR b->'max_age'<>'null'::jsonb OR coalesce(b->>'accommodation_rule','') NOT IN ('adult','free') THEN RETURN false; END IF;
  ELSE
   IF jsonb_typeof(b->'max_age') IS DISTINCT FROM 'number' OR b->>'max_age' !~ '^[0-9]+$' THEN RETURN false; END IF;
   hi:=(b->>'max_age')::integer; IF hi<lo OR hi>=150 OR coalesce(b->>'accommodation_rule','') NOT IN ('child','free') THEN RETURN false; END IF;
   expected_min:=hi+1;
  END IF;
  IF coalesce(b->>'meal_rule','') NOT IN ('full','free') THEN RETURN false; END IF;
 END LOOP;
 RETURN true;
EXCEPTION WHEN others THEN RETURN false;
END $$;
CREATE OR REPLACE FUNCTION public.save_guest_age_policy(p_expected_revision integer,p_bands jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE current_revision integer;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_admin_new(),false) THEN RAISE EXCEPTION 'Administrator required' USING errcode='42501'; END IF;
 IF NOT public.validate_guest_age_bands(p_bands) THEN RAISE EXCEPTION 'Age bands must be complete, contiguous and non-overlapping with valid pricing rules'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('guest_age_policy_versions'));
 SELECT max(revision) INTO current_revision FROM public.guest_age_policy_versions;
 IF p_expected_revision IS DISTINCT FROM current_revision THEN RAISE EXCEPTION 'AGE_POLICY_CHANGED: refresh and review before saving'; END IF;
 INSERT INTO public.guest_age_policy_versions(revision,bands,updated_by) VALUES(current_revision+1,p_bands,auth.uid());
 RETURN public.get_guest_age_policy();
END $$;
CREATE OR REPLACE FUNCTION public.set_guest_type_policy_status(p_expected_revision integer,p_band jsonb,p_enabled boolean) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE current_policy jsonb; next_bands jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_admin_new(),false) THEN RAISE EXCEPTION 'Administrator required' USING errcode='42501'; END IF;
 IF p_enabled IS NULL OR p_band->>'key' NOT IN ('adult','child','infant') THEN RAISE EXCEPTION 'Invalid guest type or status'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('guest_age_policy_versions'));
 current_policy:=public.get_guest_age_policy();
 IF (current_policy->>'revision')::integer IS DISTINCT FROM p_expected_revision THEN RAISE EXCEPTION 'AGE_POLICY_CHANGED: refresh and review before saving'; END IF;
 IF NOT p_enabled AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(current_policy->'bands') b WHERE (b-'enabled')=(p_band-'enabled')) THEN RAISE EXCEPTION 'Only the current policy can be deactivated'; END IF;
 IF p_enabled AND NOT EXISTS(SELECT 1 FROM public.guest_age_policy_versions v CROSS JOIN LATERAL jsonb_array_elements(v.bands) b WHERE (b-'enabled')=(p_band-'enabled')) THEN RAISE EXCEPTION 'Policy version not found'; END IF;
 SELECT jsonb_agg(CASE WHEN b->>'key'=p_band->>'key' THEN p_band||jsonb_build_object('enabled',p_enabled) ELSE b END ORDER BY ord) INTO next_bands FROM jsonb_array_elements(current_policy->'bands') WITH ORDINALITY x(b,ord);
 RETURN public.save_guest_age_policy(p_expected_revision,next_bands);
END $$;
REVOKE ALL ON FUNCTION public.set_guest_type_policy_status(integer,jsonb,boolean) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.set_guest_type_policy_status(integer,jsonb,boolean) TO authenticated,service_role;
ALTER TABLE public.rate_plan_anchors ADD COLUMN guest_type_charges jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.guest_composition_rules ADD COLUMN guest_type_charges jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE OR REPLACE FUNCTION public.sync_guest_type_charge_inputs() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE entry record; row_data jsonb:=to_jsonb(NEW); adult_amount numeric; column_name text; amount numeric;
BEGIN
 IF jsonb_typeof(NEW.guest_type_charges) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Guest type charges must be an object'; END IF;
 adult_amount:=CASE WHEN TG_TABLE_NAME='rate_plan_anchors' THEN NEW.extra_adult_per_night ELSE (row_data->>'extra_adult_charge')::numeric END;
 FOR entry IN SELECT key,value FROM jsonb_each(NEW.guest_type_charges) LOOP
  IF entry.key !~ '^[a-z][a-z0-9_]*$' OR jsonb_typeof(entry.value) IS DISTINCT FROM 'object' OR coalesce(entry.value->>'mode','') NOT IN ('fixed','same_as_adult') THEN RAISE EXCEPTION 'Invalid guest type charge'; END IF;
  IF entry.value->>'mode'='same_as_adult' THEN
   IF entry.key='adult' THEN RAISE EXCEPTION 'Adult rate cannot refer to itself'; END IF;
   amount:=adult_amount;
  ELSE
   IF jsonb_typeof(entry.value->'amount') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Enter a guest type amount'; END IF;
   amount:=(entry.value->>'amount')::numeric;
   IF amount<0 OR amount::text IN ('NaN','Infinity','-Infinity') OR round(amount,2)<>amount THEN RAISE EXCEPTION 'Enter a non-negative rate with up to two decimal places'; END IF;
  END IF;
  IF entry.key IN ('child','infant') THEN
   column_name:=CASE WHEN TG_TABLE_NAME='rate_plan_anchors' THEN 'extra_'||entry.key||'_per_night' ELSE 'extra_'||entry.key||'_charge' END;
   row_data:=jsonb_set(row_data,ARRAY[column_name],coalesce(to_jsonb(amount),'null'::jsonb));
  END IF;
 END LOOP;
 NEW:=jsonb_populate_record(NEW,row_data); RETURN NEW;
END $$;
CREATE TRIGGER sync_guest_type_charge_inputs BEFORE INSERT OR UPDATE ON public.rate_plan_anchors FOR EACH ROW EXECUTE FUNCTION public.sync_guest_type_charge_inputs();
CREATE TRIGGER sync_guest_type_charge_inputs BEFORE INSERT OR UPDATE ON public.guest_composition_rules FOR EACH ROW EXECUTE FUNCTION public.sync_guest_type_charge_inputs();