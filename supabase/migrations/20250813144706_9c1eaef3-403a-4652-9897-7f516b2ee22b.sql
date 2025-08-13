-- Create waitlist table for managing booking requests when rooms are unavailable
CREATE TABLE IF NOT EXISTS public.booking_waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  guest_phone TEXT,
  room_type_id UUID REFERENCES public.room_types(id),
  preferred_room_unit_id UUID REFERENCES public.room_units(id),
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests_count INTEGER NOT NULL DEFAULT 1,
  priority_score INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'contacted', 'confirmed', 'expired', 'cancelled')),
  original_booking_attempt_id UUID,
  notify_email BOOLEAN DEFAULT true,
  notify_sms BOOLEAN DEFAULT false,
  special_requests TEXT,
  max_price_willing NUMERIC,
  flexible_dates BOOLEAN DEFAULT false,
  alternative_date_range_start DATE,
  alternative_date_range_end DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '7 days')
);

-- Enable RLS
ALTER TABLE public.booking_waitlist ENABLE ROW LEVEL SECURITY;

-- Create policies for waitlist
CREATE POLICY "Admin users can manage all waitlist entries" 
ON public.booking_waitlist 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.admin_profiles 
  WHERE user_id = auth.uid()
));

-- Create indexes for performance
CREATE INDEX idx_waitlist_dates ON public.booking_waitlist(check_in, check_out);
CREATE INDEX idx_waitlist_room_type ON public.booking_waitlist(room_type_id);
CREATE INDEX idx_waitlist_status ON public.booking_waitlist(status);
CREATE INDEX idx_waitlist_priority ON public.booking_waitlist(priority_score DESC, created_at);

-- Add trigger for updated_at
CREATE TRIGGER update_waitlist_updated_at
BEFORE UPDATE ON public.booking_waitlist
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();