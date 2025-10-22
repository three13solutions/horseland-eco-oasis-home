
-- Fix calculate_rate_variants to treat tactical override prices as total (room + meals) prices
-- When a tactical override exists, the override_price should be the final price, not have meals added on top

CREATE OR REPLACE FUNCTION calculate_rate_variants(
  p_room_type_id UUID,
  p_check_in DATE,
  p_check_out DATE,
  p_room_unit_id UUID DEFAULT NULL,
  p_guests_count INTEGER DEFAULT 2,
  p_booking_channel TEXT DEFAULT 'direct'
)
RETURNS JSONB AS $$
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
        v_total_meal_cost := 0; -- Meals are included in the override price
        v_policy_adjustment := 0; -- No policy adjustments on tactical overrides
        v_meal_breakdown := '[]'::JSONB;
        
        -- Calculate total and per-night prices
        v_total_price := v_total_room_cost;
        v_price_per_night := v_tactical_override_price;
        
      ELSE
        -- Original logic when there's no tactical override
        v_total_room_cost := 0;
        
        -- Calculate room rates for each night
        FOR v_date IN 
          SELECT generate_series(p_check_in, p_check_out - 1, '1 day'::interval)::DATE
        LOOP
          v_daily_room_rate := calculate_dynamic_price(
            p_check_date := v_date,
            p_room_type_id := p_room_type_id,
            p_room_unit_id := p_room_unit_id,
            p_guests_count := p_guests_count,
            p_booking_channel := p_booking_channel
          );
          
          v_total_room_cost := v_total_room_cost + v_daily_room_rate;
        END LOOP;
        
        -- Calculate meal costs for the stay
        SELECT 
          COALESCE(SUM(total_cost), 0),
          COALESCE(jsonb_agg(
            jsonb_build_object(
              'date', day,
              'breakfast', breakfast_cost,
              'lunch', lunch_cost,
              'dinner', dinner_cost,
              'total', total_cost
            )
          ), '[]'::JSONB)
        INTO v_total_meal_cost, v_meal_breakdown
        FROM calculate_meal_cost_breakdown(
          p_room_type_id := p_room_type_id,
          p_check_in := p_check_in,
          p_check_out := p_check_out,
          p_guests_count := p_guests_count,
          p_meal_plan_code := v_meal_plan.plan_code
        );
        
        -- Apply cancellation policy adjustment
        v_policy_adjustment := 0;
        IF v_cancellation_policy.adjustment_type = 'percentage' THEN
          v_policy_adjustment := (v_total_room_cost + v_total_meal_cost) * (v_cancellation_policy.adjustment_value / 100);
        ELSIF v_cancellation_policy.adjustment_type = 'fixed' THEN
          v_policy_adjustment := v_cancellation_policy.adjustment_value;
        END IF;
        
        -- Calculate total and per-night prices
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
$$ LANGUAGE plpgsql;
