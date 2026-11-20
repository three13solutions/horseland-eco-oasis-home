DROP POLICY "Admins manage integrations" ON public.website_integrations;
CREATE POLICY "Admins insert integrations" ON public.website_integrations FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins update integrations" ON public.website_integrations FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete integrations" ON public.website_integrations FOR DELETE TO authenticated USING (public.is_admin());