REVOKE ALL ON public.guest_email_runtime, public.guest_email_events FROM anon, authenticated;
DROP POLICY "Admins view guest email deliveries" ON public.guest_email_events;
CREATE POLICY "Service manages guest email events" ON public.guest_email_events FOR ALL TO service_role USING(true) WITH CHECK(true);
CREATE POLICY "Service manages guest email runtime" ON public.guest_email_runtime FOR ALL TO service_role USING(true) WITH CHECK(true);