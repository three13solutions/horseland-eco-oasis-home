ALTER FUNCTION public.room_rate_management_grid(date,date) SECURITY INVOKER;
CREATE SCHEMA IF NOT EXISTS room_rate_private;
REVOKE ALL ON SCHEMA room_rate_private FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA room_rate_private TO authenticated;
ALTER FUNCTION public.save_room_rate_management(jsonb) SET SCHEMA room_rate_private;
CREATE FUNCTION public.save_room_rate_management(p_changes jsonb) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=public AS $$ SELECT room_rate_private.save_room_rate_management(p_changes); $$;
REVOKE ALL ON FUNCTION public.save_room_rate_management(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_room_rate_management(jsonb) TO authenticated;