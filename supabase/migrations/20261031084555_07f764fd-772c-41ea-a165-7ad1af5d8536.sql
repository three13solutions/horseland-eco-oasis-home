ALTER TABLE public.admin_audit_log ADD COLUMN IF NOT EXISTS actor_email text, ADD COLUMN IF NOT EXISTS actor_name text, ADD COLUMN IF NOT EXISTS record_key text;
CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_table_idx ON public.admin_audit_log(target_table);

CREATE OR REPLACE FUNCTION public.record_activity_log()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); o jsonb; n jsonb; em text; nm text; k text;
BEGIN
  IF uid IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP <> 'INSERT' THEN o := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN n := to_jsonb(NEW); END IF;
  IF TG_OP = 'UPDATE' AND o - 'updated_at' = n - 'updated_at' THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'api_integration_secrets' THEN
    o := CASE WHEN o IS NULL THEN NULL ELSE jsonb_build_object('values','[hidden]') END;
    n := CASE WHEN n IS NULL THEN NULL ELSE jsonb_build_object('values','[hidden]') END;
  END IF;
  k := COALESCE(n->>'id', o->>'id');
  SELECT u.email, COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name') INTO em, nm FROM auth.users u WHERE u.id = uid;
  INSERT INTO public.admin_audit_log(admin_user_id, action, target_table, target_id, record_key, old_values, new_values, actor_email, actor_name)
  VALUES (uid, lower(TG_OP), TG_TABLE_NAME,
    CASE WHEN k ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN k::uuid END,
    k, o, n, em, COALESCE(nm, split_part(em,'@',1)));
  RETURN COALESCE(NEW, OLD);
END $$;
REVOKE EXECUTE ON FUNCTION public.record_activity_log() FROM PUBLIC, anon, authenticated;

DO $$ DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public'
    AND tablename NOT IN ('admin_audit_log','rate_card_cache','booking_order_quotes') LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS zz_activity_log ON public.%I', t);
    EXECUTE format('CREATE TRIGGER zz_activity_log AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.record_activity_log()', t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.prevent_audit_log_changes()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'Activity logs cannot be modified or deleted'; END $$;
DROP TRIGGER IF EXISTS audit_log_immutable ON public.admin_audit_log;
CREATE TRIGGER audit_log_immutable BEFORE UPDATE OR DELETE ON public.admin_audit_log
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_changes();
REVOKE UPDATE, DELETE, TRUNCATE ON public.admin_audit_log FROM anon, authenticated;