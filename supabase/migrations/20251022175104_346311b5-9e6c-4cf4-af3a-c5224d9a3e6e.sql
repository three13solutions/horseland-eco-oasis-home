-- Update the calculate_dynamic_price function to make tactical override prices FINAL
-- When an override_price is set, it should bypass all other adjustments including ceiling/floor constraints

CREATE OR REPLACE FUNCTION public.calculate_dynamic_price(
  p_room_type_id uuid,
  p_room_unit_id uuid DEFAULT NULL,
  p_date date DEFAULT CURRENT_DATE,
  p_guests_count integer DEFAULT 2,
  p_booking_channel text DEFAULT 'direct',
  p_current_occupancy integer DEFAULT 0
)
RETURNS TABLE(final_price numeric, base_price numeric, adjustments jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_base_price NUMERIC;
  v_final_price NUMERIC;
  v_season_id UUID;
  v_day_type_id UUID;
  v_adjustments JSONB := '[]'::jsonb;
  v_floor_price NUMERIC;
  v_ceiling_price NUMERIC;
  v_days_until_checkin INTEGER;
  v_adjustment NUMERIC;
  v_adjustment_type TEXT;
  v_adjustment_value NUMERIC;
  v_rule_name TEXT;
  v_is_tactical_override BOOLEAN := false;
BEGIN
  -- Get base price
  SELECT * INTO v_base_price, v_season_id, v_day_type_id
  FROM get_base_price_for_date(p_room_type_id, p_date);
  
  v_final_price := COALESCE(v_base_price, 0);

  -- Check for tactical override first (highest priority)
  SELECT 
    COALESCE(override_price, 0),
    adjustment_type,
    adjustment_value,
    reason
  INTO v_adjustment, v_adjustment_type, v_adjustment_value, v_rule_name
  FROM tactical_overrides
  WHERE is_active = true
    AND p_date BETWEEN start_date AND end_date
    AND (room_type_id = p_room_type_id OR room_type_id IS NULL)
    AND (room_unit_id = p_room_unit_id OR room_unit_id IS NULL)
  ORDER BY 
    CASE WHEN room_unit_id IS NOT NULL THEN 1 
         WHEN room_type_id IS NOT NULL THEN 2 
         ELSE 3 END,
    created_at DESC
  LIMIT 1;

  -- If override_price is set, this is a FINAL PRICE - skip all other adjustments
  IF v_adjustment IS NOT NULL AND v_adjustment > 0 THEN
    v_is_tactical_override := true;
    v_final_price := v_adjustment;
    v_adjustments := v_adjustments || jsonb_build_object(
      'type', 'tactical_override',
      'from', v_base_price,
      'to', v_final_price,
      'reason', v_rule_name
    );
    v_base_price := v_final_price;
    
    -- Return immediately - no further adjustments for tactical overrides with fixed price
    RETURN QUERY SELECT v_final_price, v_base_price, v_adjustments;
    RETURN;
  ELSIF v_adjustment_type IS NOT NULL THEN
    -- Only percentage/fixed adjustments continue through the pricing pipeline
    IF v_adjustment_type = 'percentage' THEN
      v_adjustment := v_final_price * (v_adjustment_value / 100);
    ELSE
      v_adjustment := v_adjustment_value;
    END IF;
    v_final_price := v_final_price + v_adjustment;
    v_adjustments := v_adjustments || jsonb_build_object(
      'type', 'tactical_override_adjustment',
      'adjustment', v_adjustment,
      'new_price', v_final_price,
      'reason', v_rule_name
    );
  END IF;

  -- Continue with normal pricing rules only if no tactical override was applied
  
  -- Apply occupancy yield rules
  SELECT 
    CASE 
      WHEN price_adjustment_type = 'percentage' THEN v_final_price * (price_adjustment / 100)
      ELSE price_adjustment
    END,
    rule_name
  INTO v_adjustment, v_rule_name
  FROM occupancy_yield_rules
  WHERE is_active = true
    AND p_current_occupancy >= occupancy_threshold
    AND (
      applies_to = 'all' OR 
      (applies_to = 'category' AND room_type_id = p_room_type_id) OR 
      (applies_to = 'season' AND season_id = v_season_id)
    )
  ORDER BY priority DESC, occupancy_threshold DESC
  LIMIT 1;

  IF v_adjustment IS NOT NULL THEN
    v_final_price := v_final_price + v_adjustment;
    v_adjustments := v_adjustments || jsonb_build_object(
      'type', 'occupancy_yield',
      'rule', v_rule_name,
      'adjustment', v_adjustment,
      'new_price', v_final_price
    );
  END IF;

  -- Apply lead time rules
  v_days_until_checkin := p_date - CURRENT_DATE;
  
  SELECT 
    CASE 
      WHEN price_adjustment_type = 'percentage' THEN v_final_price * (price_adjustment / 100)
      ELSE price_adjustment
    END,
    rule_name
  INTO v_adjustment, v_rule_name
  FROM lead_time_rules
  WHERE is_active = true
    AND v_days_until_checkin BETWEEN days_before_checkin_min AND days_before_checkin_max
    AND (
      applies_to = 'all' OR 
      (applies_to = 'season' AND season_id = v_season_id) OR
      (applies_to = 'category' AND room_type_id = p_room_type_id)
    )
  ORDER BY priority DESC
  LIMIT 1;

  IF v_adjustment IS NOT NULL THEN
    v_final_price := v_final_price + v_adjustment;
    v_adjustments := v_adjustments || jsonb_build_object(
      'type', 'lead_time',
      'rule', v_rule_name,
      'adjustment', v_adjustment,
      'new_price', v_final_price
    );
  END IF;

  -- Apply guest composition charges
  IF p_guests_count > 2 THEN
    SELECT 
      GREATEST(0, (p_guests_count - base_guests_count)) * extra_adult_charge
    INTO v_adjustment
    FROM guest_composition_rules
    WHERE is_active = true
      AND (room_type_id = p_room_type_id OR room_type_id IS NULL)
      AND (p_guests_count - base_guests_count) <= max_extra_guests
    ORDER BY room_type_id NULLS LAST
    LIMIT 1;

    IF v_adjustment IS NOT NULL AND v_adjustment > 0 THEN
      v_final_price := v_final_price + v_adjustment;
      v_adjustments := v_adjustments || jsonb_build_object(
        'type', 'extra_guest',
        'guests', p_guests_count,
        'adjustment', v_adjustment,
        'new_price', v_final_price
      );
    END IF;
  END IF;

  -- Apply channel adjustment
  SELECT 
    CASE 
      WHEN adjustment_type = 'percentage' THEN v_final_price * (adjustment_value / 100)
      ELSE adjustment_value
    END,
    channel_name
  INTO v_adjustment, v_rule_name
  FROM channel_rules
  WHERE is_active = true
    AND channel_name = p_booking_channel
    AND (
      applies_to = 'all' OR 
      (applies_to = 'category' AND room_type_id = p_room_type_id) OR 
      (applies_to = 'season' AND season_id = v_season_id)
    )
  LIMIT 1;

  IF v_adjustment IS NOT NULL THEN
    v_final_price := v_final_price + v_adjustment;
    v_adjustments := v_adjustments || jsonb_build_object(
      'type', 'channel_adjustment',
      'channel', p_booking_channel,
      'adjustment', v_adjustment,
      'new_price', v_final_price
    );
  END IF;

  -- Enforce floor and ceiling prices
  SELECT floor_price, ceiling_price INTO v_floor_price, v_ceiling_price
  FROM pricing_constraints
  WHERE is_active = true
    AND (
      (room_unit_id = p_room_unit_id AND p_room_unit_id IS NOT NULL) OR 
      (room_type_id = p_room_type_id AND room_unit_id IS NULL)
    )
  ORDER BY 
    CASE WHEN room_unit_id IS NOT NULL THEN 1 ELSE 2 END
  LIMIT 1;

  IF v_floor_price IS NOT NULL AND v_final_price < v_floor_price THEN
    v_adjustments := v_adjustments || jsonb_build_object(
      'type', 'floor_constraint',
      'from', v_final_price,
      'to', v_floor_price
    );
    v_final_price := v_floor_price;
  END IF;

  IF v_ceiling_price IS NOT NULL AND v_final_price > v_ceiling_price THEN
    v_adjustments := v_adjustments || jsonb_build_object(
      'type', 'ceiling_constraint',
      'from', v_final_price,
      'to', v_ceiling_price
    );
    v_final_price := v_ceiling_price;
  END IF;

  RETURN QUERY SELECT v_final_price, v_base_price, v_adjustments;
END;
$$;