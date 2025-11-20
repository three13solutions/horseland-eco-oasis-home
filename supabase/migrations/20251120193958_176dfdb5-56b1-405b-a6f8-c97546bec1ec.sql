-- Drop the existing restrictive policies and add ones that allow anonymous bookings

-- Drop existing INSERT policy for bookings that only allows authenticated users
DROP POLICY IF EXISTS "Authenticated users can create bookings" ON public.bookings;

-- Allow ANYONE (authenticated or not) to insert bookings
CREATE POLICY "Anyone can create bookings"
ON public.bookings
FOR INSERT
TO public
WITH CHECK (true);

-- Drop existing INSERT policy for guests that only allows authenticated users
DROP POLICY IF EXISTS "Authenticated users can create guests" ON public.guests;

-- Allow ANYONE (authenticated or not) to insert guests
CREATE POLICY "Anyone can create guests"
ON public.guests
FOR INSERT
TO public
WITH CHECK (true);