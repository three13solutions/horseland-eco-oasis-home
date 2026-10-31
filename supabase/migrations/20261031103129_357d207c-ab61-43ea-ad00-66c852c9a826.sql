DROP TRIGGER IF EXISTS audit_log_immutable ON public.admin_audit_log;

UPDATE public.admin_audit_log l
SET actor_email = u.email,
    actor_name = COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1))
FROM auth.users u
WHERE u.id = l.admin_user_id
  AND l.actor_email IS NULL;

CREATE TRIGGER audit_log_immutable BEFORE UPDATE OR DELETE ON public.admin_audit_log
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_changes();