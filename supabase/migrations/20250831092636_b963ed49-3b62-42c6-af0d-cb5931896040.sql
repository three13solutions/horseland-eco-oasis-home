-- Fix function search path security warnings

-- Update the payment status validation function with secure search path
CREATE OR REPLACE FUNCTION public.validate_payment_status_change()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only allow payment status changes through specific edge functions or admin users
  -- This prevents client-side manipulation of payment status
  IF OLD.payment_status != NEW.payment_status THEN
    -- Check if this is being called from an edge function (has service role)
    -- Or if the user is an admin
    IF NOT (
      current_setting('role', true) = 'service_role' OR 
      is_admin()
    ) THEN
      RAISE EXCEPTION 'Payment status can only be updated through authorized payment processing';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update the admin role validation function with secure search path
CREATE OR REPLACE FUNCTION public.validate_admin_role_change()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only super admins can change roles
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF NOT is_super_admin() THEN
      RAISE EXCEPTION 'Only super admins can change user roles';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update the audit function with secure search path
CREATE OR REPLACE FUNCTION public.audit_payment_changes()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log payment status changes for audit purposes
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    PERFORM log_admin_action(
      'payment_status_change',
      'bookings',
      NEW.id,
      jsonb_build_object('old_status', OLD.payment_status, 'old_payment_id', OLD.payment_id),
      jsonb_build_object('new_status', NEW.payment_status, 'new_payment_id', NEW.payment_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;