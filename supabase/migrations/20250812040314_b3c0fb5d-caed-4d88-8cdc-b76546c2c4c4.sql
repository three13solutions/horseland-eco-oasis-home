-- Fix function search path security issue
CREATE OR REPLACE FUNCTION public.check_room_availability(
  p_room_type_id UUID,
  p_check_in DATE,
  p_check_out DATE
)
RETURNS TABLE(
  available_units INTEGER,
  unit_ids UUID[]
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;