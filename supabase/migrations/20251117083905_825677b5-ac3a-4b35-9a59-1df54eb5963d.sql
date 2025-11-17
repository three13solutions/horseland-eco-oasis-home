-- ============================================
-- SECURITY FIXES: Role Architecture & RLS Policies
-- ============================================

-- 1. Create app_role enum for proper role management
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'content_editor');

-- 2. Create dedicated user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role public.app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Create helper functions for common role checks
CREATE OR REPLACE FUNCTION public.is_admin_new()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role) 
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin_new()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'super_admin'::app_role)
$$;

-- 5. Migrate existing admin_profiles data to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT 
    user_id,
    CASE 
        WHEN role = 'super_admin' THEN 'super_admin'::app_role
        WHEN role = 'admin' THEN 'admin'::app_role
        ELSE 'content_editor'::app_role
    END
FROM public.admin_profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- 6. Add RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Super admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.is_super_admin_new())
WITH CHECK (public.is_super_admin_new());

-- 7. Add RLS policy for guests to view their own bookings
CREATE POLICY "Authenticated users can view own bookings"
ON public.bookings FOR SELECT
TO authenticated
USING (
    guest_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR guest_id = auth.uid()
);

-- 8. Add RLS policy for guests to view their own invoices
CREATE POLICY "Guests can view own invoices"
ON public.invoices FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.bookings
        WHERE bookings.id = invoices.booking_id
        AND (
            bookings.guest_id = auth.uid()
            OR bookings.guest_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    )
);

-- 9. Add index for performance on user_roles
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);

-- 10. Add trigger to update updated_at on user_roles
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Note: admin_profiles table is kept for backward compatibility
-- New code should use user_roles table and has_role() function