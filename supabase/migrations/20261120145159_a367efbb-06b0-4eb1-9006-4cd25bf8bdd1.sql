CREATE TABLE public.website_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  platform text NOT NULL DEFAULT 'custom',
  description text,
  code text NOT NULL DEFAULT '',
  placement text NOT NULL DEFAULT 'head',
  target_mode text NOT NULL DEFAULT 'global',
  page_paths text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT website_integrations_placement_chk CHECK (placement IN ('head','body_start','body_end')),
  CONSTRAINT website_integrations_target_chk CHECK (target_mode IN ('global','specific'))
);
GRANT SELECT ON public.website_integrations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.website_integrations TO authenticated;
GRANT ALL ON public.website_integrations TO service_role;
ALTER TABLE public.website_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read active integrations" ON public.website_integrations
  FOR SELECT TO anon, authenticated USING (is_active = true OR public.is_admin());
CREATE POLICY "Admins manage integrations" ON public.website_integrations
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER update_website_integrations_updated_at BEFORE UPDATE ON public.website_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER zz_activity_log AFTER INSERT OR UPDATE OR DELETE ON public.website_integrations
  FOR EACH ROW EXECUTE FUNCTION public.record_activity_log();