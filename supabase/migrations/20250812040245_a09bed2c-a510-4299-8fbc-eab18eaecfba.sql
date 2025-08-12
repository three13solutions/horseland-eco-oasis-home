-- Create room_units table to track individual room inventory
CREATE TABLE public.room_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_type_id UUID NOT NULL REFERENCES public.room_types(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL,
  unit_name TEXT,
  floor_number INTEGER,
  area_sqft NUMERIC,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'maintenance', 'out_of_order', 'occupied')),
  special_features JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_type_id, unit_number)
);

-- Enable RLS on room_units
ALTER TABLE public.room_units ENABLE ROW LEVEL SECURITY;

-- Create policies for room_units
CREATE POLICY "Admin users can manage all room units" 
ON public.room_units 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM admin_profiles 
  WHERE admin_profiles.user_id = auth.uid()
));

CREATE POLICY "Anyone can view active room units" 
ON public.room_units 
FOR SELECT 
USING (is_active = true);

-- Add room_unit_id to bookings table
ALTER TABLE public.bookings ADD COLUMN room_unit_id UUID REFERENCES public.room_units(id);

-- Create indexes for performance
CREATE INDEX idx_room_units_room_type_id ON public.room_units(room_type_id);
CREATE INDEX idx_room_units_status ON public.room_units(status);
CREATE INDEX idx_bookings_room_unit_dates ON public.bookings(room_unit_id, check_in, check_out);

-- Create trigger for updated_at
CREATE TRIGGER update_room_units_updated_at
  BEFORE UPDATE ON public.room_units
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to check room availability
CREATE OR REPLACE FUNCTION public.check_room_availability(
  p_room_type_id UUID,
  p_check_in DATE,
  p_check_out DATE
)
RETURNS TABLE(
  available_units INTEGER,
  unit_ids UUID[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(ru.id)::INTEGER as available_units,
    ARRAY_AGG(ru.id) as unit_ids
  FROM public.room_units ru
  WHERE ru.room_type_id = p_room_type_id
    AND ru.status = 'available'
    AND ru.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.room_unit_id = ru.id
        AND b.payment_status != 'cancelled'
        AND (
          (b.check_in <= p_check_in AND b.check_out > p_check_in) OR
          (b.check_in < p_check_out AND b.check_out >= p_check_out) OR
          (b.check_in >= p_check_in AND b.check_out <= p_check_out)
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;