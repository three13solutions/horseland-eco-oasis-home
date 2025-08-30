-- CRITICAL SECURITY FIXES - Part 2: Payment Security and Database Integrity

-- 1. Add database-level protection for payment status updates
-- Create a trigger to prevent unauthorized payment status changes from client-side
CREATE OR REPLACE FUNCTION public.validate_payment_status_change()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply the trigger to bookings table
DROP TRIGGER IF EXISTS validate_payment_status_trigger ON public.bookings;
CREATE TRIGGER validate_payment_status_trigger
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_payment_status_change();

-- 2. Add additional protection for admin role changes
-- Create a trigger to prevent unauthorized role changes
CREATE OR REPLACE FUNCTION public.validate_admin_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only super admins can change roles
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF NOT is_super_admin() THEN
      RAISE EXCEPTION 'Only super admins can change user roles';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply the trigger to admin_profiles table
DROP TRIGGER IF EXISTS validate_admin_role_trigger ON public.admin_profiles;
CREATE TRIGGER validate_admin_role_trigger
  BEFORE UPDATE ON public.admin_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_admin_role_change();

-- 3. Create audit trigger for payment changes (for monitoring)
CREATE OR REPLACE FUNCTION public.audit_payment_changes()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit trigger
DROP TRIGGER IF EXISTS audit_payment_changes_trigger ON public.bookings;
CREATE TRIGGER audit_payment_changes_trigger
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_payment_changes();