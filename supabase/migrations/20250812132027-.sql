-- Create guests table for comprehensive guest management
CREATE TABLE public.guests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  address TEXT,
  date_of_birth DATE,
  nationality TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  special_requirements TEXT,
  is_blacklisted BOOLEAN NOT NULL DEFAULT false,
  blacklist_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create guest identity documents table
CREATE TABLE public.guest_identity_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('aadhar', 'passport', 'voter_id', 'driving_license', 'pan_card')),
  document_number TEXT NOT NULL,
  document_image_url TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID,
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(guest_id, document_type)
);

-- Create guest credit notes table for cancellation credits/wallet
CREATE TABLE public.guest_credit_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  original_booking_id UUID REFERENCES public.bookings(id),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_redeemed BOOLEAN NOT NULL DEFAULT false,
  redeemed_amount NUMERIC DEFAULT 0,
  redeemed_at TIMESTAMP WITH TIME ZONE,
  redeemed_booking_id UUID REFERENCES public.bookings(id),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add guest_id to bookings table for linking
ALTER TABLE public.bookings ADD COLUMN guest_id UUID REFERENCES public.guests(id);

-- Create indexes for better performance
CREATE INDEX idx_guests_email ON public.guests(email);
CREATE INDEX idx_guests_phone ON public.guests(phone);
CREATE INDEX idx_guests_name ON public.guests(first_name, last_name);
CREATE INDEX idx_guest_identity_documents_guest_id ON public.guest_identity_documents(guest_id);
CREATE INDEX idx_guest_credit_notes_guest_id ON public.guest_credit_notes(guest_id);
CREATE INDEX idx_guest_credit_notes_expires_at ON public.guest_credit_notes(expires_at);
CREATE INDEX idx_bookings_guest_id ON public.bookings(guest_id);

-- Enable RLS on all guest tables
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_identity_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_credit_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for guests table
CREATE POLICY "Admin users can manage all guests" 
ON public.guests 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.admin_profiles 
  WHERE admin_profiles.user_id = auth.uid()
));

-- Create RLS policies for guest identity documents
CREATE POLICY "Admin users can manage all guest identity documents" 
ON public.guest_identity_documents 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.admin_profiles 
  WHERE admin_profiles.user_id = auth.uid()
));

-- Create RLS policies for guest credit notes
CREATE POLICY "Admin users can manage all guest credit notes" 
ON public.guest_credit_notes 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.admin_profiles 
  WHERE admin_profiles.user_id = auth.uid()
));

-- Create function to automatically set updated_at
CREATE OR REPLACE FUNCTION public.update_guest_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_guests_updated_at
  BEFORE UPDATE ON public.guests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_guest_updated_at_column();

CREATE TRIGGER update_guest_identity_documents_updated_at
  BEFORE UPDATE ON public.guest_identity_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_guest_updated_at_column();

CREATE TRIGGER update_guest_credit_notes_updated_at
  BEFORE UPDATE ON public.guest_credit_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_guest_updated_at_column();

-- Create function to calculate credit note expiry (6 months from original booking)
CREATE OR REPLACE FUNCTION public.calculate_credit_expiry(original_booking_date DATE)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
  RETURN (original_booking_date + INTERVAL '6 months')::TIMESTAMP WITH TIME ZONE;
END;
$$ LANGUAGE plpgsql;

-- Create function to get guest's available credit balance
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to automatically create guest from booking if email/phone provided
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create/link guests from bookings
CREATE TRIGGER auto_create_guest_from_booking
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.create_or_link_guest_from_booking();