DROP POLICY IF EXISTS "Guests can view own invoices" ON public.invoices;
CREATE POLICY "Guests can view own invoices" ON public.invoices FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = invoices.booking_id
    AND (b.guest_id = auth.uid() OR (b.guest_email IS NOT NULL AND b.guest_email = (auth.jwt() ->> 'email'))))
);