-- Fix security warnings by setting search_path for all functions
CREATE OR REPLACE FUNCTION public.update_guest_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.calculate_credit_expiry(original_booking_date DATE)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
  RETURN (original_booking_date + INTERVAL '6 months')::TIMESTAMP WITH TIME ZONE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.get_guest_available_credit(p_guest_id UUID)
RETURNS NUMERIC AS $$
BEGIN
  RETURN COALESCE((
    SELECT SUM(amount - redeemed_amount)
    FROM public.guest_credit_notes
    WHERE guest_id = p_guest_id
      AND is_redeemed = false
      AND expires_at > now()
  ), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.create_or_link_guest_from_booking()
RETURNS TRIGGER AS $$
DECLARE
  existing_guest_id UUID;
  new_guest_id UUID;
BEGIN
  -- Skip if guest_id is already set
  IF NEW.guest_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Try to find existing guest by email first, then phone
  IF NEW.guest_email IS NOT NULL THEN
    SELECT id INTO existing_guest_id 
    FROM public.guests 
    WHERE email = NEW.guest_email 
    LIMIT 1;
  END IF;

  -- If not found by email, try phone
  IF existing_guest_id IS NULL AND NEW.guest_phone IS NOT NULL THEN
    SELECT id INTO existing_guest_id 
    FROM public.guests 
    WHERE phone = NEW.guest_phone 
    LIMIT 1;
  END IF;

  -- If guest exists, link to booking
  IF existing_guest_id IS NOT NULL THEN
    NEW.guest_id = existing_guest_id;
  ELSE
    -- Create new guest if we have enough information
    IF NEW.guest_email IS NOT NULL OR NEW.guest_phone IS NOT NULL THEN
      INSERT INTO public.guests (
        first_name,
        last_name,
        email,
        phone
      ) VALUES (
        COALESCE(split_part(NEW.guest_name, ' ', 1), NEW.guest_name),
        NULLIF(substring(NEW.guest_name from position(' ' in NEW.guest_name) + 1), ''),
        NEW.guest_email,
        NEW.guest_phone
      ) RETURNING id INTO new_guest_id;
      
      NEW.guest_id = new_guest_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';