-- Drop the old function with p_guests_count signature
DROP FUNCTION IF EXISTS public.calculate_rate_variants(uuid, date, date, uuid, integer, text);