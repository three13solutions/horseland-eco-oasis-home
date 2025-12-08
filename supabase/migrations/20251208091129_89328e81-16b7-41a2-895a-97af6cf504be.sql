
-- Force complete recompilation with unique identifier
-- Timestamp: 2025-12-07T15:00:00Z
DROP FUNCTION IF EXISTS public.calculate_rate_variants(uuid, date, date, uuid, integer, integer, integer, text);

CREATE FUNCTION public.calculate_rate_variants(
  p_room_type_id uuid, 
  p_check_in date, 
  p_check_out date, 
  p_room_unit_id uuid DEFAULT NULL, 
  p_adults_count integer DEFAULT 2, 
  p_children_count integer DEFAULT 0, 
  p_infants_count integer DEFAULT 0, 
  p_booking_channel text DEFAULT 'direct'
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_nights INTEGER;
  v_variants JSONB;
  v_meal_plan RECORD;
  v_cancellation_policy RECORD;
  v_total_room_cost NUMERIC;
  v_room_category_id UUID;
  v_day_of_week INTEGER;
  v_day_type TEXT;
  v_override RECORD;
  v_date DATE;
  v_daily_room_rate NUMERIC;
  v_extra_adult_charge NUMERIC;
  v_extra_child_charge NUMERIC;
  v_extra_adults INTEGER;
  v_extra_children INTEGER;
  v_policy_adjustment NUMERIC;
  v_total_price NUMERIC;
  v_price_per_night NUMERIC;
BEGIN
  -- Version 2025-12-07-v3
  v_nights := p_check_out - p_check_in;
  IF v_nights <= 0 THEN RETURN '[]'::JSONB; END IF;
  
  v_variants := '[]'::JSONB;

  SELECT category_id INTO v_room_category_id FROM room_types WHERE id = p_room_type_id;
  v_extra_adults := GREATEST(0, p_adults_count - 2);
  v_extra_children := p_children_count;

  FOR v_meal_plan IN SELECT * FROM meal_plan_rules WHERE is_active = true ORDER BY display_order
  LOOP
    FOR v_cancellation_policy IN SELECT * FROM cancellation_policy_rules WHERE is_active = true ORDER BY display_order
    LOOP
      v_total_room_cost := 0;
      
      FOR v_date IN SELECT generate_series(p_check_in, p_check_out - 1, '1 day'::interval)::DATE
      LOOP
        v_day_of_week := EXTRACT(DOW FROM v_date);
        IF v_day_of_week IN (0, 5, 6) THEN
          v_day_type := 'weekend';
        ELSE
          v_day_type := 'weekday';
        END IF;

        -- Get tactical override matching the room category
        SELECT * INTO v_override 
        FROM tactical_overrides
        WHERE is_active = true 
          AND start_date <= v_date 
          AND end_date >= v_date
          AND override_price IS NOT NULL
          AND (occupancy_type IS NULL OR occupancy_type = 'double')
          AND (day_type IS NULL OR day_type = v_day_type)
          AND (min_nights IS NULL OR v_nights >= min_nights)
          AND (max_nights IS NULL OR v_nights <= max_nights)
          AND (min_adults IS NULL OR p_adults_count >= min_adults)
          AND (max_adults IS NULL OR p_adults_count <= max_adults)
          AND (
            (room_unit_id IS NOT NULL AND room_unit_id = p_room_unit_id)
            OR (room_type_id IS NOT NULL AND room_type_id = p_room_type_id AND room_unit_id IS NULL)
            OR (room_category_id IS NOT NULL AND room_category_id = v_room_category_id AND room_type_id IS NULL AND room_unit_id IS NULL)
          )
        ORDER BY 
          CASE WHEN room_unit_id IS NOT NULL THEN 1 WHEN room_type_id IS NOT NULL THEN 2 ELSE 3 END,
          min_nights DESC NULLS LAST, 
          created_at DESC
        LIMIT 1;

        IF v_override.override_price IS NOT NULL THEN
          v_daily_room_rate := v_override.override_price;
          
          -- Extra adult charges
          IF v_extra_adults > 0 THEN
            SELECT adjustment_value INTO v_extra_adult_charge 
            FROM tactical_overrides
            WHERE is_active = true 
              AND start_date <= v_date 
              AND end_date >= v_date
              AND occupancy_type = 'extra_adult' 
              AND adjustment_value IS NOT NULL
              AND (day_type IS NULL OR day_type = v_day_type)
              AND (min_nights IS NULL OR v_nights >= min_nights)
              AND (
                (room_unit_id IS NOT NULL AND room_unit_id = p_room_unit_id)
                OR (room_type_id IS NOT NULL AND room_type_id = p_room_type_id AND room_unit_id IS NULL)
                OR (room_category_id IS NOT NULL AND room_category_id = v_room_category_id AND room_type_id IS NULL AND room_unit_id IS NULL)
              )
            ORDER BY CASE WHEN room_unit_id IS NOT NULL THEN 1 WHEN room_type_id IS NOT NULL THEN 2 ELSE 3 END,
              min_nights DESC NULLS LAST, created_at DESC 
            LIMIT 1;
            v_daily_room_rate := v_daily_room_rate + COALESCE(v_extra_adult_charge, 0) * v_extra_adults;
          END IF;
          
          -- Extra child charges
          IF v_extra_children > 0 THEN
            SELECT adjustment_value INTO v_extra_child_charge 
            FROM tactical_overrides
            WHERE is_active = true 
              AND start_date <= v_date 
              AND end_date >= v_date
              AND occupancy_type = 'extra_child' 
              AND adjustment_value IS NOT NULL
              AND (day_type IS NULL OR day_type = v_day_type)
              AND (min_nights IS NULL OR v_nights >= min_nights)
              AND (
                (room_unit_id IS NOT NULL AND room_unit_id = p_room_unit_id)
                OR (room_type_id IS NOT NULL AND room_type_id = p_room_type_id AND room_unit_id IS NULL)
                OR (room_category_id IS NOT NULL AND room_category_id = v_room_category_id AND room_type_id IS NULL AND room_unit_id IS NULL)
              )
            ORDER BY CASE WHEN room_unit_id IS NOT NULL THEN 1 WHEN room_type_id IS NOT NULL THEN 2 ELSE 3 END,
              min_nights DESC NULLS LAST, created_at DESC 
            LIMIT 1;
            v_daily_room_rate := v_daily_room_rate + COALESCE(v_extra_child_charge, 0) * v_extra_children;
          END IF;
        ELSE
          -- Fallback to dynamic pricing if no override found
          SELECT final_price INTO v_daily_room_rate 
          FROM calculate_dynamic_price(
            p_room_type_id, p_room_unit_id, v_date, p_adults_count, p_children_count, p_infants_count, p_booking_channel
          );
        END IF;
        
        v_total_room_cost := v_total_room_cost + COALESCE(v_daily_room_rate, 0);
      END LOOP;
      
      -- Calculate policy adjustment
      v_policy_adjustment := 0;
      IF v_cancellation_policy.adjustment_type = 'percentage' THEN
        v_policy_adjustment := v_total_room_cost * (v_cancellation_policy.adjustment_value / 100);
      ELSIF v_cancellation_policy.adjustment_type = 'fixed' THEN
        v_policy_adjustment := v_cancellation_policy.adjustment_value;
      END IF;
      
      v_total_price := v_total_room_cost + v_policy_adjustment;
      v_price_per_night := v_total_price / v_nights;
      
      v_variants := v_variants || jsonb_build_object(
        'meal_plan_code', v_meal_plan.plan_code,
        'meal_plan_name', v_meal_plan.plan_name,
        'meal_plan_description', v_meal_plan.description,
        'included_meals', v_meal_plan.included_meal_types,
        'meal_breakdown', '[]'::jsonb,
        'cancellation_policy_code', v_cancellation_policy.policy_code,
        'cancellation_policy_name', v_cancellation_policy.policy_name,
        'cancellation_terms', v_cancellation_policy.cancellation_terms,
        'room_rate', v_total_room_cost,
        'meal_cost', 0,
        'policy_adjustment', v_policy_adjustment,
        'total_price', v_total_price,
        'price_per_night', v_price_per_night,
        'is_featured', COALESCE(v_meal_plan.is_featured, false) OR COALESCE(v_cancellation_policy.is_featured, false),
        'savings', CASE WHEN v_cancellation_policy.adjustment_value < 0 THEN ABS(v_policy_adjustment) ELSE 0 END,
        'discount_percentage', CASE WHEN v_cancellation_policy.adjustment_type = 'percentage' AND v_cancellation_policy.adjustment_value < 0 
          THEN ABS(v_cancellation_policy.adjustment_value) ELSE 0 END
      );
    END LOOP;
  END LOOP;
  
  RETURN v_variants;
END;
$$;
