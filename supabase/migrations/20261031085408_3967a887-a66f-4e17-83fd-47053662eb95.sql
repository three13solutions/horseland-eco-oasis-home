DO $$ DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['inventory_days','adjustments','settings','reservations'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS zz_activity_log ON distribution_private.%I', t);
    EXECUTE format('CREATE TRIGGER zz_activity_log AFTER INSERT OR UPDATE OR DELETE ON distribution_private.%I FOR EACH ROW EXECUTE FUNCTION public.record_activity_log()', t);
  END LOOP;
END $$;