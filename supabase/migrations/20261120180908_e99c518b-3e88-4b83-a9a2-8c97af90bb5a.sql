CREATE SCHEMA guest_policy_private;
GRANT USAGE ON SCHEMA guest_policy_private TO authenticated,service_role;
REVOKE ALL ON public.guest_policy_drafts FROM anon;
ALTER TABLE public.guest_policy_drafts SET SCHEMA guest_policy_private;
GRANT SELECT,INSERT,UPDATE,DELETE ON guest_policy_private.guest_policy_drafts TO authenticated;
GRANT ALL ON guest_policy_private.guest_policy_drafts TO service_role;
CREATE POLICY guest_policy_drafts_admin_write ON guest_policy_private.guest_policy_drafts FOR ALL TO authenticated USING (public.is_admin_new()) WITH CHECK (public.is_admin_new());
DO $$ DECLARE f regprocedure; BEGIN
 FOREACH f IN ARRAY ARRAY['public.save_guest_policy_draft(jsonb,uuid,timestamptz)'::regprocedure,'public.apply_guest_policy_with_drafts(integer,jsonb,boolean,jsonb)'::regprocedure] LOOP
 EXECUTE replace(pg_get_functiondef(f),'public.guest_policy_drafts','guest_policy_private.guest_policy_drafts');
 END LOOP; END $$;
ALTER FUNCTION public.save_guest_policy_draft(jsonb,uuid,timestamptz) SECURITY INVOKER;
ALTER FUNCTION public.apply_guest_policy_with_drafts(integer,jsonb,boolean,jsonb) SECURITY INVOKER;
GRANT EXECUTE ON FUNCTION public.resolve_guest_policy_drafts(jsonb,jsonb,jsonb) TO authenticated,service_role;
CREATE FUNCTION public.list_guest_policy_drafts() RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_admin_new(),false) THEN RAISE EXCEPTION 'Administrator required' USING errcode='42501'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(to_jsonb(d) ORDER BY d.created_at DESC),'[]'::jsonb) FROM guest_policy_private.guest_policy_drafts d WHERE d.status='draft');
END $$;
REVOKE ALL ON FUNCTION public.list_guest_policy_drafts() FROM public,anon;
GRANT EXECUTE ON FUNCTION public.list_guest_policy_drafts() TO authenticated,service_role;