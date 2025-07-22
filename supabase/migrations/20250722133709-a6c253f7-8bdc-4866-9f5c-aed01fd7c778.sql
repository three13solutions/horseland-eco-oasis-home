-- Fix function search path security warnings by recreating functions and policies
-- Drop policies first to avoid dependency issues

DROP POLICY IF EXISTS "Only super admins can insert admin profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Users can update own profile, super admins can update any" ON public.admin_profiles;
DROP POLICY IF EXISTS "Only super admins can delete admin profiles" ON public.admin_profiles;

-- Drop and recreate functions with proper search_path
DROP FUNCTION IF EXISTS public.get_current_user_role();
DROP FUNCTION IF EXISTS public.is_super_admin();
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.log_admin_action(TEXT, TEXT, UUID, JSONB, JSONB);

-- Recreate functions with proper search_path
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM public.admin_profiles 
    WHERE user_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'super_admin' 
    FROM public.admin_profiles 
    WHERE user_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.admin_profiles 
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION public.log_admin_action(
  action_type TEXT,
  table_name TEXT DEFAULT NULL,
  record_id UUID DEFAULT NULL,
  old_data JSONB DEFAULT NULL,
  new_data JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.admin_audit_log (
    admin_user_id,
    action,
    target_table,
    target_id,
    old_values,
    new_values
  ) VALUES (
    auth.uid(),
    action_type,
    table_name,
    record_id,
    old_data,
    new_data
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Recreate policies using the fixed functions
CREATE POLICY "Only super admins can insert admin profiles" 
ON public.admin_profiles 
FOR INSERT 
WITH CHECK (public.is_super_admin());

CREATE POLICY "Users can update own profile, super admins can update any" 
ON public.admin_profiles 
FOR UPDATE 
USING (
  user_id = auth.uid() OR public.is_super_admin()
);

CREATE POLICY "Only super admins can delete admin profiles" 
ON public.admin_profiles 
FOR DELETE 
USING (public.is_super_admin());