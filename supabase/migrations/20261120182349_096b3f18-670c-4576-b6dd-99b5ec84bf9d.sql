CREATE FUNCTION guest_policy_private.normalized_guest_name(p_band jsonb) RETURNS text LANGUAGE sql IMMUTABLE SET search_path='' AS $$SELECT lower(regexp_replace(trim(coalesce(p_band->>'name',replace(p_band->>'key','_',' '))),'\s+',' ','g'))$$;
CREATE FUNCTION guest_policy_private.assert_guest_name(p_band jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('guest_age_policy_versions'));
 IF EXISTS(SELECT 1 FROM public.guest_age_policy_versions v CROSS JOIN LATERAL jsonb_array_elements(v.bands) b WHERE b->>'key'<>p_band->>'key' AND guest_policy_private.normalized_guest_name(b)=guest_policy_private.normalized_guest_name(p_band)) OR EXISTS(SELECT 1 FROM guest_policy_private.guest_policy_drafts d WHERE d.status='draft' AND d.band->>'key'<>p_band->>'key' AND guest_policy_private.normalized_guest_name(d.band)=guest_policy_private.normalized_guest_name(p_band)) THEN RAISE EXCEPTION 'A different guest type already uses this name. Choose a unique guest type name.'; END IF;
END $$;
CREATE OR REPLACE FUNCTION public.validate_guest_policy_draft_row() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$ BEGIN
 IF NEW.status NOT IN ('draft','activated','deleted','deleted_history') OR NOT public.validate_guest_age_bands(jsonb_build_array(NEW.band||jsonb_build_object('enabled',true))) THEN RAISE EXCEPTION 'Invalid draft policy'; END IF;
 IF NEW.status='draft' THEN PERFORM guest_policy_private.assert_guest_name(NEW.band); END IF;
 NEW.updated_at:=clock_timestamp(); RETURN NEW; END $$;
CREATE FUNCTION guest_policy_private.validate_policy_names() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE b jsonb; BEGIN
 FOR b IN SELECT value FROM jsonb_array_elements(NEW.bands) LOOP
 PERFORM guest_policy_private.assert_guest_name(b);
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.bands) other WHERE other->>'key'<>b->>'key' AND guest_policy_private.normalized_guest_name(other)=guest_policy_private.normalized_guest_name(b)) THEN RAISE EXCEPTION 'Two guest types cannot use the same name'; END IF;
 IF EXISTS(SELECT 1 FROM guest_policy_private.guest_policy_drafts d WHERE d.status='deleted_history' AND d.band-'enabled'=b-'enabled') THEN RAISE EXCEPTION 'This policy was deleted. Create a new draft instead.'; END IF;
 END LOOP; RETURN NEW; END $$;
CREATE TRIGGER guest_policy_unique_names BEFORE INSERT ON public.guest_age_policy_versions FOR EACH ROW EXECUTE FUNCTION guest_policy_private.validate_policy_names();
CREATE FUNCTION guest_policy_private.deleted_guest_policies() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_admin_new(),false) THEN RAISE EXCEPTION 'Administrator required' USING errcode='42501'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(band),'[]'::jsonb) FROM guest_policy_private.guest_policy_drafts WHERE status='deleted_history'); END $$;
CREATE FUNCTION public.deleted_guest_policies() RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT guest_policy_private.deleted_guest_policies()$$;
CREATE FUNCTION guest_policy_private.delete_guest_policy(p_expected_revision integer,p_band jsonb,p_draft_id uuid DEFAULT NULL,p_expected_updated_at timestamptz DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE current_policy jsonb; BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_admin_new(),false) THEN RAISE EXCEPTION 'Administrator required' USING errcode='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('guest_age_policy_versions'));
 current_policy:=public.get_guest_age_policy();
 IF (current_policy->>'revision')::integer IS DISTINCT FROM p_expected_revision THEN RAISE EXCEPTION 'AGE_POLICY_CHANGED: reload policies before deleting'; END IF;
 IF p_draft_id IS NOT NULL THEN
 UPDATE guest_policy_private.guest_policy_drafts SET status='deleted',updated_by=auth.uid() WHERE id=p_draft_id AND status='draft' AND updated_at=p_expected_updated_at AND band-'enabled'=p_band-'enabled';
 IF NOT FOUND THEN RAISE EXCEPTION 'DRAFT_CHANGED: reload drafts before deleting'; END IF;
 ELSE
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(current_policy->'bands') b WHERE b-'enabled'=p_band-'enabled') THEN RAISE EXCEPTION 'Active policies cannot be deleted. Activate a replacement first.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.guest_age_policy_versions v CROSS JOIN LATERAL jsonb_array_elements(v.bands) b WHERE b-'enabled'=p_band-'enabled') THEN RAISE EXCEPTION 'Policy not found'; END IF;
 IF NOT EXISTS(SELECT 1 FROM guest_policy_private.guest_policy_drafts WHERE status='deleted_history' AND band-'enabled'=p_band-'enabled') THEN INSERT INTO guest_policy_private.guest_policy_drafts(band,status,updated_by) VALUES(p_band,'deleted_history',auth.uid()); END IF;
 END IF;
END $$;
CREATE FUNCTION public.delete_guest_policy(p_expected_revision integer,p_band jsonb,p_draft_id uuid DEFAULT NULL,p_expected_updated_at timestamptz DEFAULT NULL) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT guest_policy_private.delete_guest_policy(p_expected_revision,p_band,p_draft_id,p_expected_updated_at)$$;
DO $$ DECLARE definition text; BEGIN
 definition:=pg_get_functiondef('public.set_guest_type_policy_status(integer,jsonb,boolean)'::regprocedure);
 definition:=replace(definition,'ORDER BY v.revision DESC LOOP','AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.deleted_guest_policies()) deleted WHERE deleted-''enabled''=b-''enabled'') ORDER BY v.revision DESC LOOP');
 EXECUTE definition;
END $$;
REVOKE ALL ON FUNCTION guest_policy_private.assert_guest_name(jsonb),guest_policy_private.deleted_guest_policies(),guest_policy_private.delete_guest_policy(integer,jsonb,uuid,timestamptz),public.deleted_guest_policies(),public.delete_guest_policy(integer,jsonb,uuid,timestamptz) FROM public,anon;
GRANT EXECUTE ON FUNCTION guest_policy_private.deleted_guest_policies(),guest_policy_private.delete_guest_policy(integer,jsonb,uuid,timestamptz),public.deleted_guest_policies(),public.delete_guest_policy(integer,jsonb,uuid,timestamptz) TO authenticated,service_role;