-- Update calculate_rate_variants function to properly apply meal plan pricing
-- All Meals Inclusive (full board) = base price (no adjustment)
-- Breakfast & Dinner (half board) = -200 per person per night
-- Room Only = -500 per person per night

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
  v_meal_adjustment NUMERIC;
  v_policy_adjustment NUMERIC;
  v_total_price NUMERIC;
  v_price_per_night NUMERIC;
  v_date DATE;
  v_daily_room_rate NUMERIC;
  v_total_room_cost NUMERIC;
  v_meal_breakdown JSONB;
  v_has_tactical_override BOOLEAN;
  v_tactical_override_price NUMERIC;
  v_total_guests INTEGER;
BEGIN
  -- Calculate number of nights
  v_nights := p_check_out - p_check_in;
  
  IF v_nights <= 0 THEN
    RETURN '[]'::JSONB;
  END IF;

  -- Calculate total guests (adults + children, infants don't count for pricing)
  v_total_guests := p_adults_count + p_children_count;

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
        v_meal_adjustment := 0;
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
        
        -- Apply meal plan adjustments per person per night
        -- all_meals_inclusive (Full Board): base price (no adjustment = 0)
        -- breakfast_and_dinner (Half Board): -200 per person per night
        -- room_only: -500 per person per night
        v_meal_adjustment := 0;
        IF v_meal_plan.plan_code = 'breakfast_and_dinner' THEN
          v_meal_adjustment := -200 * v_total_guests * v_nights;
        ELSIF v_meal_plan.plan_code = 'room_only' THEN
          v_meal_adjustment := -500 * v_total_guests * v_nights;
        END IF;
        
        v_meal_breakdown := '[]'::JSONB;
        
        -- Apply cancellation policy adjustment
        v_policy_adjustment := 0;
        IF v_cancellation_policy.adjustment_type = 'percentage' THEN
          v_policy_adjustment := (v_total_room_cost + v_meal_adjustment) * (v_cancellation_policy.adjustment_value / 100);
        ELSIF v_cancellation_policy.adjustment_type = 'fixed' THEN
          v_policy_adjustment := v_cancellation_policy.adjustment_value;
        END IF;
        
        v_total_price := v_total_room_cost + v_meal_adjustment + v_policy_adjustment;
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
        'meal_cost', v_meal_adjustment,
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