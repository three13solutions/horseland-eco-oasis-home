-- Fix RLS policies for room_units table to ensure admin users can properly insert/update units

-- First, let's check if the admin check is working by updating the policies
DROP POLICY IF EXISTS "Admin users can manage all room units" ON public.room_units;
DROP POLICY IF EXISTS "Anyone can view active room units" ON public.room_units;

-- Create more explicit admin policies for room_units
CREATE POLICY "Admin users can view all room units" 
ON public.room_units 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.admin_profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admin users can insert room units" 
ON public.room_units 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.admin_profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admin users can update room units" 
ON public.room_units 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 
    FROM public.admin_profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admin users can delete room units" 
ON public.room_units 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 
    FROM public.admin_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Allow public to view active room units for booking purposes
CREATE POLICY "Anyone can view active room units" 
ON public.room_units 
FOR SELECT 
USING (is_active = true);

-- Also ensure the room_types table has proper policies
DROP POLICY IF EXISTS "Admin users can manage all content" ON public.room_types;
DROP POLICY IF EXISTS "Anyone can view published room types" ON public.room_types;

CREATE POLICY "Admin users can view all room types" 
ON public.room_types 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.admin_profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admin users can insert room types" 
ON public.room_types 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.admin_profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admin users can update room types" 
ON public.room_types 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 
    FROM public.admin_profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admin users can delete room types" 
ON public.room_types 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 
    FROM public.admin_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Allow public to view published room types
CREATE POLICY "Anyone can view published room types" 
ON public.room_types 
FOR SELECT 
USING (is_published = true);