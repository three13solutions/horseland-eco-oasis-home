-- Update calculate_dynamic_price to handle adults, children, and infants separately
CREATE OR REPLACE FUNCTION public.calculate_dynamic_price(
  p_room_type_id uuid,
  p_room_unit_id uuid DEFAULT NULL::uuid,
  p_date date DEFAULT CURRENT_DATE,
  p_adults_count integer DEFAULT 2,
  p_children_count integer DEFAULT 0,
  p_infants_count integer DEFAULT 0,
  p_booking_channel text DEFAULT 'direct'::text,
  p_current_occupancy integer DEFAULT 0
)
RETURNS TABLE(final_price numeric, base_price numeric, adjustments jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  v_base_guests_count INTEGER;
  v_extra_adults INTEGER;
  v_extra_children INTEGER;
  v_adult_charge NUMERIC;
  v_child_charge NUMERIC;
  v_per_guest_rate NUMERIC;
BEGIN
  -- Get base price (for base occupancy, typically 2 adults)
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

  -- Apply guest composition charges (adults, children, infants)
  -- Get base guest count and charges from guest_composition_rules
  SELECT 
    base_guests_count,
    COALESCE(extra_adult_charge, 0),
    COALESCE(extra_child_charge, 0)
  INTO v_base_guests_count, v_adult_charge, v_child_charge
  FROM guest_composition_rules
  WHERE is_active = true
    AND (room_type_id = p_room_type_id OR room_type_id IS NULL)
  ORDER BY room_type_id NULLS LAST
  LIMIT 1;

  -- Default to 2 base guests if no rule found
  v_base_guests_count := COALESCE(v_base_guests_count, 2);
  
  -- Calculate per-guest rate from base price (base price is for base guests)
  v_per_guest_rate := v_final_price / v_base_guests_count;
  
  -- Use configured charges or calculate defaults
  v_adult_charge := COALESCE(v_adult_charge, v_per_guest_rate);
  -- Children: half adult rate + 100
  v_child_charge := (v_per_guest_rate / 2) + 100;

  -- Calculate extra adults (beyond base count)
  v_extra_adults := GREATEST(0, p_adults_count - v_base_guests_count);
  
  -- All children are charged (no base children included)
  v_extra_children := p_children_count;

  -- Apply charges
  v_adjustment := (v_extra_adults * v_adult_charge) + (v_extra_children * v_child_charge);
  -- Infants: no charge (p_infants_count not used)

  IF v_adjustment > 0 THEN
    v_final_price := v_final_price + v_adjustment;
    v_adjustments := v_adjustments || jsonb_build_object(
      'type', 'guest_composition',
      'adults', p_adults_count,
      'children', p_children_count,
      'infants', p_infants_count,
      'extra_adults', v_extra_adults,
      'extra_children', v_extra_children,
      'adult_charge_per_person', v_adult_charge,
      'child_charge_per_person', v_child_charge,
      'adjustment', v_adjustment,
      'new_price', v_final_price
    );
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
$function$;

-- Update calculate_rate_variants to use separate adult/child/infant counts
CREATE OR REPLACE FUNCTION public.calculate_rate_variants(
  p_room_type_id uuid,
  p_check_in date,
  p_check_out date,
  p_room_unit_id uuid DEFAULT NULL::uuid,
  p_adults_count integer DEFAULT 2,
  p_children_count integer DEFAULT 0,
  p_infants_count integer DEFAULT 0,
  p_booking_channel text DEFAULT 'direct'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_nights INTEGER;
  v_variants JSONB := '[]'::JSONB;
  v_meal_plan RECORD;
  v_cancellation_policy RECORD;
  v_room_rate NUMERIC;
  v_meal_cost NUMERIC;
  v_policy_adjustment NUMERIC;
  v_total_price NUMERIC;
  v_price_per_night NUMERIC;
  v_date DATE;
  v_daily_room_rate NUMERIC;
  v_total_room_cost NUMERIC;
  v_total_meal_cost NUMERIC;
  v_meal_breakdown JSONB;
  v_has_tactical_override BOOLEAN;
  v_tactical_override_price NUMERIC;
BEGIN
  -- Calculate number of nights
  v_nights := p_check_out - p_check_in;
  
  IF v_nights <= 0 THEN
    RETURN '[]'::JSONB;
  END IF;

  -- Check if there's a tactical override for this room type and date range
  SELECT 
    EXISTS(
      SELECT 1 
      FROM tactical_overrides 
      WHERE room_type_id = p_room_type_id 
        AND start_date <= p_check_in 
        AND end_date >= p_check_out - 1
        AND is_active = true 
        AND override_price IS NOT NULL
    ),
    (
      SELECT override_price 
      FROM tactical_overrides 
      WHERE room_type_id = p_room_type_id 
        AND start_date <= p_check_in 
        AND end_date >= p_check_out - 1
        AND is_active = true 
        AND override_price IS NOT NULL
      LIMIT 1
    )
  INTO v_has_tactical_override, v_tactical_override_price;

  -- Loop through all active meal plans
  FOR v_meal_plan IN 
    SELECT * FROM meal_plan_rules 
    WHERE is_active = true 
    ORDER BY display_order
  LOOP
    -- Loop through all active cancellation policies
    FOR v_cancellation_policy IN 
      SELECT * FROM cancellation_policy_rules 
      WHERE is_active = true 
      ORDER BY display_order
    LOOP
      -- If there's a tactical override, use that as the TOTAL price (room + meals included)
      IF v_has_tactical_override THEN
        v_total_room_cost := v_tactical_override_price * v_nights;
        v_total_meal_cost := 0;
        v_policy_adjustment := 0;
        v_meal_breakdown := '[]'::JSONB;
        
        v_total_price := v_total_room_cost;
        v_price_per_night := v_tactical_override_price;
        
      ELSE
        v_total_room_cost := 0;
        
        -- Calculate room rates for each night
        FOR v_date IN 
          SELECT generate_series(p_check_in, p_check_out - 1, '1 day'::interval)::DATE
        LOOP
          SELECT final_price INTO v_daily_room_rate
          FROM calculate_dynamic_price(
            p_room_type_id := p_room_type_id,
            p_room_unit_id := p_room_unit_id,
            p_date := v_date,
            p_adults_count := p_adults_count,
            p_children_count := p_children_count,
            p_infants_count := p_infants_count,
            p_booking_channel := p_booking_channel
          );
          
          v_total_room_cost := v_total_room_cost + COALESCE(v_daily_room_rate, 0);
        END LOOP;
        
        v_total_meal_cost := 0;
        v_meal_breakdown := '[]'::JSONB;
        
        -- Apply cancellation policy adjustment
        v_policy_adjustment := 0;
        IF v_cancellation_policy.adjustment_type = 'percentage' THEN
          v_policy_adjustment := (v_total_room_cost + v_total_meal_cost) * (v_cancellation_policy.adjustment_value / 100);
        ELSIF v_cancellation_policy.adjustment_type = 'fixed' THEN
          v_policy_adjustment := v_cancellation_policy.adjustment_value;
        END IF;
        
        v_total_price := v_total_room_cost + v_total_meal_cost + v_policy_adjustment;
        v_price_per_night := v_total_price / v_nights;
      END IF;
      
      -- Add variant to results
      v_variants := v_variants || jsonb_build_object(
        'meal_plan_code', v_meal_plan.plan_code,
        'meal_plan_name', v_meal_plan.plan_name,
        'meal_plan_description', v_meal_plan.description,
        'included_meals', v_meal_plan.included_meal_types,
        'meal_breakdown', v_meal_breakdown,
        'cancellation_policy_code', v_cancellation_policy.policy_code,
        'cancellation_policy_name', v_cancellation_policy.policy_name,
        'cancellation_terms', v_cancellation_policy.cancellation_terms,
        'room_rate', v_total_room_cost,
        'meal_cost', v_total_meal_cost,
        'policy_adjustment', v_policy_adjustment,
        'total_price', v_total_price,
        'price_per_night', v_price_per_night,
        'is_featured', COALESCE(v_meal_plan.is_featured, false) OR COALESCE(v_cancellation_policy.is_featured, false),
        'savings', CASE 
          WHEN v_cancellation_policy.adjustment_value < 0 THEN ABS(v_policy_adjustment)
          ELSE 0 
        END,
        'discount_percentage', CASE 
          WHEN v_cancellation_policy.adjustment_type = 'percentage' AND v_cancellation_policy.adjustment_value < 0 
          THEN ABS(v_cancellation_policy.adjustment_value)
          ELSE 0 
        END
      );
    END LOOP;
  END LOOP;
  
  RETURN v_variants;
END;
$function$;

-- Update calculate_booking_total to use separate adult/child/infant counts
CREATE OR REPLACE FUNCTION public.calculate_booking_total(
  p_room_type_id uuid,
  p_room_unit_id uuid DEFAULT NULL::uuid,
  p_check_in date DEFAULT CURRENT_DATE,
  p_check_out date DEFAULT (CURRENT_DATE + 1),
  p_adults_count integer DEFAULT 2,
  p_children_count integer DEFAULT 0,
  p_infants_count integer DEFAULT 0,
  p_booking_channel text DEFAULT 'direct'::text
)
RETURNS TABLE(total_nights integer, total_amount numeric, nightly_breakdown jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_current_date DATE;
  v_nights INTEGER;
  v_total NUMERIC := 0;
  v_breakdown JSONB := '[]'::jsonb;
  v_night_price NUMERIC;
  v_night_base NUMERIC;
  v_night_adjustments JSONB;
BEGIN
  v_nights := p_check_out - p_check_in;
  
  IF v_nights <= 0 THEN
    RETURN QUERY SELECT 0, 0::NUMERIC, '[]'::jsonb;
    RETURN;
  END IF;

  v_current_date := p_check_in;

  FOR i IN 1..v_nights LOOP
    SELECT final_price, base_price, adjustments 
    INTO v_night_price, v_night_base, v_night_adjustments
    FROM calculate_dynamic_price(
      p_room_type_id,
      p_room_unit_id,
      v_current_date,
      p_adults_count,
      p_children_count,
      p_infants_count,
      p_booking_channel,
      50 -- TODO: Calculate actual occupancy from bookings table
    );

    v_total := v_total + COALESCE(v_night_price, 0);
    
    v_breakdown := v_breakdown || jsonb_build_object(
      'date', v_current_date,
      'base_price', v_night_base,
      'final_price', v_night_price,
      'adjustments', v_night_adjustments
    );

    v_current_date := v_current_date + 1;
  END LOOP;

  RETURN QUERY SELECT v_nights, v_total, v_breakdown;
END;
$function$;