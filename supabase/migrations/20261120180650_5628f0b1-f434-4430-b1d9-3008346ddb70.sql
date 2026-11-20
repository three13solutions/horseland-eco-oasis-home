CREATE TABLE public.guest_policy_drafts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), band jsonb NOT NULL, status text NOT NULL DEFAULT 'draft', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid);
GRANT SELECT ON public.guest_policy_drafts TO authenticated;
GRANT ALL ON public.guest_policy_drafts TO service_role;
ALTER TABLE public.guest_policy_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY guest_policy_drafts_admin_read ON public.guest_policy_drafts FOR SELECT TO authenticated USING (public.is_admin_new());
CREATE FUNCTION public.validate_guest_policy_draft_row() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$ BEGIN
 IF NEW.status NOT IN ('draft','activated') OR NOT public.validate_guest_age_bands(jsonb_build_array(NEW.band || jsonb_build_object('enabled',true))) THEN RAISE EXCEPTION 'Invalid draft policy'; END IF;
 NEW.updated_at:=clock_timestamp(); RETURN NEW; END $$;
CREATE TRIGGER guest_policy_draft_validation BEFORE INSERT OR UPDATE ON public.guest_policy_drafts FOR EACH ROW EXECUTE FUNCTION public.validate_guest_policy_draft_row();
CREATE TRIGGER zz_activity_log AFTER INSERT OR UPDATE OR DELETE ON public.guest_policy_drafts FOR EACH ROW EXECUTE FUNCTION public.record_activity_log();
CREATE FUNCTION public.save_guest_policy_draft(p_band jsonb,p_id uuid DEFAULT NULL,p_expected_updated_at timestamptz DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE d public.guest_policy_drafts;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_admin_new(),false) THEN RAISE EXCEPTION 'Administrator required' USING errcode='42501'; END IF;
 IF NOT public.validate_guest_age_bands(jsonb_build_array(p_band || jsonb_build_object('enabled',true))) THEN RAISE EXCEPTION 'Enter valid draft ages and charge rules'; END IF;
 IF p_id IS NULL THEN INSERT INTO public.guest_policy_drafts(band,updated_by) VALUES(p_band||jsonb_build_object('enabled',true),auth.uid()) RETURNING * INTO d;
 ELSE UPDATE public.guest_policy_drafts SET band=p_band||jsonb_build_object('enabled',true),updated_by=auth.uid() WHERE id=p_id AND status='draft' AND updated_at=p_expected_updated_at RETURNING * INTO d;
 IF NOT FOUND THEN RAISE EXCEPTION 'DRAFT_CHANGED: reload drafts before editing'; END IF; END IF;
 RETURN to_jsonb(d); END $$;
CREATE FUNCTION public.guest_policy_complete(p_bands jsonb) RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path=public,pg_temp AS $$
DECLARE b jsonb; expected_min integer:=0; open_end boolean:=false;
BEGIN
 IF NOT public.validate_guest_age_bands(p_bands) THEN RETURN false; END IF;
 FOR b IN SELECT value FROM jsonb_array_elements(p_bands) ORDER BY (value->>'min_age')::integer LOOP
 IF b->'enabled'='false'::jsonb OR open_end OR (b->>'min_age')::integer<>expected_min THEN RETURN false; END IF;
 open_end:=b->'max_age'='null'::jsonb; expected_min:=coalesce((b->>'max_age')::integer,0)+1;
 END LOOP;
 RETURN open_end;
END $$;
CREATE FUNCTION public.resolve_guest_policy_drafts(p_current jsonb,p_band jsonb,p_drafts jsonb) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path=public,pg_temp AS $$
DECLARE result jsonb; solutions integer;
BEGIN
 IF NOT public.validate_guest_age_bands(jsonb_build_array(p_band||jsonb_build_object('enabled',true))) THEN RAISE EXCEPTION 'Invalid policy'; END IF;
 WITH RECURSIVE candidates AS (
 SELECT (d->>'id')::uuid id,d FROM jsonb_array_elements(p_drafts) d WHERE d->'band'->>'key'<>p_band->>'key'
 ), choices AS (
 SELECT coalesce(jsonb_agg(b),'[]'::jsonb)||jsonb_build_array(p_band||jsonb_build_object('enabled',true)) bands, '[]'::jsonb drafts, ARRAY[p_band->>'key']::text[] used_keys,NULL::uuid last_id
 FROM jsonb_array_elements(p_current) b WHERE b->>'key'<>p_band->>'key'
 UNION ALL
 SELECT (SELECT coalesce(jsonb_agg(b),'[]'::jsonb) FROM jsonb_array_elements(c.bands) b WHERE b->>'key'<>d.d->'band'->>'key')||jsonb_build_array(d.d->'band'||jsonb_build_object('enabled',true)),c.drafts||jsonb_build_array(d.d),c.used_keys||ARRAY[d.d->'band'->>'key'],d.id
 FROM choices c JOIN candidates d ON (c.last_id IS NULL OR d.id>c.last_id) AND NOT (d.d->'band'->>'key'=ANY(c.used_keys))
 ), valid AS (SELECT bands,drafts,jsonb_array_length(drafts) n FROM choices WHERE public.guest_policy_complete(bands)), minimal AS (SELECT * FROM valid WHERE n=(SELECT min(n) FROM valid))
 SELECT count(*),jsonb_agg(jsonb_build_object('bands',bands,'drafts',drafts))->0 INTO solutions,result FROM minimal;
 IF solutions=0 THEN RAISE EXCEPTION 'No compatible draft covers the missing ages without overlaps. Save matching draft policies first.'; END IF;
 IF solutions>1 THEN RAISE EXCEPTION 'More than one draft combination covers these ages. Edit the conflicting drafts so there is one matching combination.'; END IF;
 RETURN result;
END $$;
CREATE FUNCTION public.apply_guest_policy_with_drafts(p_expected_revision integer,p_band jsonb,p_activate boolean DEFAULT false,p_expected_plan jsonb DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE current_policy jsonb; drafts jsonb; plan jsonb; result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_admin_new(),false) THEN RAISE EXCEPTION 'Administrator required' USING errcode='42501'; END IF;
 IF p_activate IS NULL THEN RAISE EXCEPTION 'Choose preview or activation'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('guest_age_policy_versions'));
 IF p_activate THEN PERFORM 1 FROM public.guest_policy_drafts WHERE status='draft' ORDER BY id FOR UPDATE; END IF;
 current_policy:=public.get_guest_age_policy();
 IF (current_policy->>'revision')::integer IS DISTINCT FROM p_expected_revision THEN RAISE EXCEPTION 'AGE_POLICY_CHANGED: reload before activating'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'band',band,'updated_at',updated_at) ORDER BY id),'[]'::jsonb) INTO drafts FROM public.guest_policy_drafts WHERE status='draft';
 plan:=public.resolve_guest_policy_drafts(current_policy->'bands',p_band,drafts);
 IF public.guest_age_meal_pricing_active() AND (jsonb_array_length(plan->'bands')<>3 OR EXISTS(SELECT 1 FROM jsonb_array_elements(plan->'bands') b WHERE b->>'key' NOT IN ('adult','child','infant') OR b->>'accommodation_rule'='guest_type' OR (b->>'key'='adult' AND b->'max_age'<>'null'::jsonb))) THEN RAISE EXCEPTION 'Custom guest types and Adult segments can be saved as drafts, but activation needs matching booking and pricing support first.'; END IF;
 IF NOT p_activate THEN RETURN plan; END IF;
 IF p_expected_plan IS DISTINCT FROM plan THEN RAISE EXCEPTION 'DRAFT_CHANGED: the matching drafts changed; review activation again'; END IF;
 result:=public.save_guest_age_policy(p_expected_revision,plan->'bands');
 UPDATE public.guest_policy_drafts SET status='activated',updated_by=auth.uid() WHERE id IN (SELECT (d->>'id')::uuid FROM jsonb_array_elements(plan->'drafts') d);
 UPDATE public.guest_policy_drafts SET status='activated',updated_by=auth.uid() WHERE status='draft' AND (band-'enabled')=(p_band-'enabled');
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.save_guest_policy_draft(jsonb,uuid,timestamptz),public.apply_guest_policy_with_drafts(integer,jsonb,boolean,jsonb),public.resolve_guest_policy_drafts(jsonb,jsonb,jsonb) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.save_guest_policy_draft(jsonb,uuid,timestamptz),public.apply_guest_policy_with_drafts(integer,jsonb,boolean,jsonb) TO authenticated,service_role;