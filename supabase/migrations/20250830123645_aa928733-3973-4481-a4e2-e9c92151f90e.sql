-- CRITICAL SECURITY FIXES - Part 1: Storage and Basic Policies

-- 1. Create private storage bucket for identity documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('identity-documents', 'identity-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 2. Create strict RLS policies for identity documents storage
CREATE POLICY "Admin users can view identity documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'identity-documents' AND is_admin());

CREATE POLICY "Admin users can upload identity documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'identity-documents' AND is_admin());

CREATE POLICY "Admin users can update identity documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'identity-documents' AND is_admin());

CREATE POLICY "Admin users can delete identity documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'identity-documents' AND is_admin());

-- 3. Fix admin_profiles privilege escalation vulnerability
-- Drop the insecure update policy
DROP POLICY IF EXISTS "Users can update own profile, super admins can update any" ON public.admin_profiles;

-- Create secure update policies - users can only update their own profile, not change roles
CREATE POLICY "Users can update own non-role fields" 
ON public.admin_profiles 
FOR UPDATE 
USING (user_id = auth.uid() AND is_admin());

-- Super admins can update any profile including roles
CREATE POLICY "Super admins can update any profile" 
ON public.admin_profiles 
FOR UPDATE 
USING (is_super_admin());