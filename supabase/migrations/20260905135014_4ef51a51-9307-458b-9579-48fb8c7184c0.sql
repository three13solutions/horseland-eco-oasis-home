DROP POLICY IF EXISTS "Authenticated users can view own bookings" ON public.bookings;

CREATE POLICY "Authenticated users can view own bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  (guest_email IS NOT NULL AND guest_email = (auth.jwt() ->> 'email'))
  OR guest_id = auth.uid()
);