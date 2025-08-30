-- CRITICAL SECURITY FIXES

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

-- Create secure update policies
CREATE POLICY "Users can update own non-role fields" 
ON public.admin_profiles 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid() AND OLD.role = NEW.role);

CREATE POLICY "Super admins can update any profile" 
ON public.admin_profiles 
FOR UPDATE 
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- 4. Create trigger function to prevent unauthorized role changes
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only super admins can change roles
  IF OLD.role != NEW.role AND NOT is_super_admin() THEN
    RAISE EXCEPTION 'Only super administrators can modify user roles';
  END IF;
  
  -- Prevent last super admin from being demoted
  IF OLD.role = 'super_admin' AND NEW.role != 'super_admin' THEN
    IF (SELECT COUNT(*) FROM public.admin_profiles WHERE role = 'super_admin') <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the last super administrator';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create the trigger
CREATE TRIGGER prevent_admin_role_escalation
BEFORE UPDATE ON public.admin_profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_role_escalation();