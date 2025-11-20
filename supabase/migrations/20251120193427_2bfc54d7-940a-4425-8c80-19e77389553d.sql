-- Add INSERT policy for authenticated users to create bookings
CREATE POLICY "Authenticated users can create bookings"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add policy for service role (for edge functions)
CREATE POLICY "Service role can manage all bookings"
ON public.bookings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);