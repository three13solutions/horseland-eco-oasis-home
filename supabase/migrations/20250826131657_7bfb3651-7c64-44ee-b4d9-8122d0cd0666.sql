-- Fix security vulnerability: Restrict admin_profiles SELECT access to admin users only
-- This prevents public exposure of admin email addresses

-- Drop the current overly permissive policy
DROP POLICY IF EXISTS "Admin users can view all admin profiles" ON public.admin_profiles;

-- Create a new secure policy that only allows admin users to view admin profiles
CREATE POLICY "Only admin users can view admin profiles" 
ON public.admin_profiles 
FOR SELECT 
USING (is_admin());