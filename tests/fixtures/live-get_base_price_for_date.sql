CREATE OR REPLACE FUNCTION public.get_base_price_for_date(p_room_type_id uuid, p_date date)
 RETURNS TABLE(price numeric, season_id uuid, day_type_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_season_id UUID;
  v_day_type_id UUID;
  v_price NUMERIC;
  v_month INTEGER;
  v_day INTEGER;
BEGIN

  IF NOT EXISTS (SELECT 1 FROM public.room_types r WHERE r.id=p_room_type_id AND r.pricing_status<>'configuration_required' AND EXISTS(SELECT 1 FROM public.room_units u WHERE u.room_type_id=r.id)) THEN RETURN; END IF;
 IF EXISTS(SELECT 1 FROM public.room_types WHERE id=p_room_type_id AND pricing_status='ready') THEN RETURN; END IF;

  v_month := EXTRACT(MONTH FROM p_date)::INTEGER;
  v_day := EXTRACT(DAY FROM p_date)::INTEGER;

  -- Determine season from season_periods
  SELECT s.id INTO v_season_id
  FROM seasons s
  JOIN season_periods sp ON sp.season_id = s.id
  WHERE s.is_active = true
    AND sp.year = EXTRACT(YEAR FROM p_date)
    AND (
      (sp.start_month < sp.end_month AND
       ((v_month = sp.start_month AND v_day >= sp.start_day) OR
        (v_month > sp.start_month AND v_month < sp.end_month) OR
        (v_month = sp.end_month AND v_day <= sp.end_day)))
      OR
      (sp.start_month > sp.end_month AND
       ((v_month = sp.start_month AND v_day >= sp.start_day) OR
        (v_month > sp.start_month) OR
        (v_month < sp.end_month) OR
        (v_month = sp.end_month AND v_day <= sp.end_day)))
      OR
      (sp.start_month = sp.end_month AND v_month = sp.start_month AND v_day BETWEEN sp.start_day AND sp.end_day)
    )
  LIMIT 1;

  -- Determine day type (weekday vs weekend + holidays)
  SELECT CASE
    WHEN EXTRACT(DOW FROM p_date) IN (0, 6) THEN 
      (SELECT id FROM day_types WHERE slug = 'weekend' AND is_active = true LIMIT 1)
    WHEN EXISTS(SELECT 1 FROM holidays WHERE date = p_date) THEN 
      (SELECT id FROM day_types WHERE slug = 'weekend' AND is_active = true LIMIT 1)
    ELSE 
      (SELECT id FROM day_types WHERE slug = 'weekday' AND is_active = true LIMIT 1)
  END INTO v_day_type_id;

  -- Get price from seasonal_pricing
  IF v_season_id IS NOT NULL AND v_day_type_id IS NOT NULL THEN
    SELECT sp.price INTO v_price
    FROM seasonal_pricing sp
    WHERE sp.room_type_id = p_room_type_id
      AND sp.season_id = v_season_id
      AND sp.day_type_id = v_day_type_id;
  END IF;

  -- Fallback to base_price if not found
  IF v_price IS NULL THEN
    SELECT rt.base_price INTO v_price
    FROM room_types rt
    WHERE rt.id = p_room_type_id;
  END IF;

  RETURN QUERY SELECT v_price, v_season_id, v_day_type_id;
END;
$function$
