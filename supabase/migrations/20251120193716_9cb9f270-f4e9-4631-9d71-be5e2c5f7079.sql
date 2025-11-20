-- Add policies for guests table to allow booking creation

-- Allow authenticated users to insert guests (for booking flow)
CREATE POLICY "Authenticated users can create guests"
ON public.guests
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow service role full access (for triggers and edge functions)
CREATE POLICY "Service role can manage all guests"
ON public.guests
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);