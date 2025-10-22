-- Create meal_plan_rules table
CREATE TABLE meal_plan_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code TEXT NOT NULL UNIQUE,
  plan_name TEXT NOT NULL,
  description TEXT,
  included_meal_types JSONB NOT NULL DEFAULT '[]',
  preferred_variant TEXT DEFAULT 'veg',
  applies_to TEXT NOT NULL DEFAULT 'all',
  room_type_id UUID REFERENCES room_types(id),
  season_id UUID REFERENCES seasons(id),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE meal_plan_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active meal plans"
  ON meal_plan_rules FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin users can manage meal plans"
  ON meal_plan_rules FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE admin_profiles.user_id = auth.uid()));

INSERT INTO meal_plan_rules (plan_code, plan_name, description, included_meal_types, display_order, is_featured) VALUES
('room_only', 'Room Only', 'Room accommodation without any meals included', '[]', 1, false),
('breakfast_included', 'Breakfast Included', 'Room with daily breakfast for all guests', '["breakfast"]', 2, true),
('breakfast_and_dinner', 'Breakfast and Dinner', 'Room with breakfast and dinner daily', '["breakfast", "dinner"]', 3, false),
('breakfast_and_lunch', 'Breakfast and Lunch', 'Room with breakfast and lunch daily', '["breakfast", "lunch"]', 4, false),
('all_meals_inclusive', 'All Meals Inclusive', 'Room with breakfast, lunch, and dinner', '["breakfast", "lunch", "dinner"]', 5, false);

-- Create cancellation_policy_rules table
CREATE TABLE cancellation_policy_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_code TEXT NOT NULL UNIQUE,
  policy_name TEXT NOT NULL,
  description TEXT,
  adjustment_type TEXT NOT NULL,
  adjustment_value NUMERIC NOT NULL DEFAULT 0,
  cancellation_terms JSONB NOT NULL DEFAULT '{}',
  applies_to TEXT NOT NULL DEFAULT 'all',
  room_type_id UUID REFERENCES room_types(id),
  season_id UUID REFERENCES seasons(id),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE cancellation_policy_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active cancellation policies"
  ON cancellation_policy_rules FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin users can manage cancellation policies"
  ON cancellation_policy_rules FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE admin_profiles.user_id = auth.uid()));

INSERT INTO cancellation_policy_rules (policy_code, policy_name, description, adjustment_type, adjustment_value, cancellation_terms, display_order, is_featured) VALUES
('non_refundable', 'Non-Refundable Rate', 'Save 15% with our non-refundable rate', 'percentage', -15, '{"refund_percentage": 0, "notice_hours": 0, "terms": "No refund on cancellation"}', 1, false),
('flexible', 'Flexible Rate', 'Free cancellation up to 24 hours before check-in', 'percentage', 0, '{"refund_percentage": 100, "notice_hours": 24, "terms": "Full refund if cancelled 24+ hours before check-in"}', 2, true),
('moderate', 'Standard Rate', 'Free cancellation up to 7 days before check-in', 'percentage', 0, '{"refund_percentage": 100, "notice_days": 7, "terms": "Full refund if cancelled 7+ days before check-in"}', 3, false);

-- Update bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS meal_plan_code TEXT DEFAULT 'room_only';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_policy_code TEXT DEFAULT 'flexible';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rate_breakdown JSONB DEFAULT '{}';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS meal_cost NUMERIC DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS room_cost NUMERIC DEFAULT 0;

-- Create calculate_meal_plan_cost function
CREATE OR REPLACE FUNCTION calculate_meal_plan_cost(
  p_meal_plan_code TEXT,
  p_guests_count INTEGER,
  p_nights INTEGER,
  p_preferred_variant TEXT DEFAULT 'veg'
)
RETURNS TABLE(
  meal_cost NUMERIC,
  included_meals JSONB,
  meal_breakdown JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_included_meal_types JSONB;
  v_meal_type TEXT;
  v_meal_price NUMERIC;
  v_total_cost NUMERIC := 0;
  v_breakdown JSONB := '[]'::jsonb;
  v_included_list JSONB := '[]'::jsonb;
BEGIN
  SELECT included_meal_types INTO v_included_meal_types
  FROM meal_plan_rules
  WHERE plan_code = p_meal_plan_code AND is_active = true;
  
  IF v_included_meal_types IS NULL OR jsonb_array_length(v_included_meal_types) = 0 THEN
    RETURN QUERY SELECT 0::NUMERIC, '[]'::JSONB, '[]'::JSONB;
    RETURN;
  END IF;
  
  FOR v_meal_type IN SELECT jsonb_array_elements_text(v_included_meal_types)
  LOOP
    SELECT price INTO v_meal_price
    FROM meals
    WHERE meal_type = v_meal_type
      AND variant = p_preferred_variant
      AND is_active = true
    LIMIT 1;
    
    IF v_meal_price IS NULL THEN
      SELECT price INTO v_meal_price
      FROM meals
      WHERE meal_type = v_meal_type
        AND variant = 'veg'
        AND is_active = true
      LIMIT 1;
    END IF;
    
    IF v_meal_price IS NOT NULL THEN
      v_total_cost := v_total_cost + (v_meal_price * p_guests_count * p_nights);
      v_breakdown := v_breakdown || jsonb_build_object(
        'meal_type', v_meal_type,
        'price_per_person', v_meal_price,
        'guests', p_guests_count,
        'nights', p_nights,
        'total', v_meal_price * p_guests_count * p_nights
      );
      v_included_list := v_included_list || to_jsonb(v_meal_type);
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT v_total_cost, v_included_list, v_breakdown;
END;
$$;

-- Create calculate_rate_variants function with proper parameter ordering
CREATE OR REPLACE FUNCTION calculate_rate_variants(
  p_room_type_id UUID,
  p_check_in DATE,
  p_check_out DATE,
  p_room_unit_id UUID DEFAULT NULL,
  p_guests_count INTEGER DEFAULT 2,
  p_booking_channel TEXT DEFAULT 'direct'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_nights INTEGER;
  v_variants JSONB := '[]'::jsonb;
  v_meal_plan RECORD;
  v_cancellation_policy RECORD;
  v_base_price NUMERIC;
  v_meal_cost NUMERIC;
  v_policy_adjustment NUMERIC;
  v_final_price NUMERIC;
  v_variant JSONB;
  v_meal_details RECORD;
  v_current_date DATE;
  v_night_price NUMERIC;
BEGIN
  v_nights := p_check_out - p_check_in;
  
  IF v_nights <= 0 THEN
    RETURN '[]'::jsonb;
  END IF;
  
  v_base_price := 0;
  v_current_date := p_check_in;
  
  FOR i IN 1..v_nights LOOP
    SELECT final_price INTO v_night_price
    FROM calculate_dynamic_price(
      p_room_type_id,
      p_room_unit_id,
      v_current_date,
      p_guests_count,
      p_booking_channel,
      50
    );
    
    v_base_price := v_base_price + COALESCE(v_night_price, 0);
    v_current_date := v_current_date + 1;
  END LOOP;
  
  FOR v_meal_plan IN 
    SELECT * FROM meal_plan_rules 
    WHERE is_active = true 
    ORDER BY display_order
  LOOP
    FOR v_cancellation_policy IN
      SELECT * FROM cancellation_policy_rules
      WHERE is_active = true
      ORDER BY display_order
    LOOP
      SELECT * INTO v_meal_details
      FROM calculate_meal_plan_cost(
        v_meal_plan.plan_code,
        p_guests_count,
        v_nights,
        v_meal_plan.preferred_variant
      );
      
      v_meal_cost := v_meal_details.meal_cost;
      
      IF v_cancellation_policy.adjustment_type = 'percentage' THEN
        v_policy_adjustment := (v_base_price + v_meal_cost) * (v_cancellation_policy.adjustment_value / 100);
      ELSE
        v_policy_adjustment := v_cancellation_policy.adjustment_value;
      END IF;
      
      v_final_price := v_base_price + v_meal_cost + v_policy_adjustment;
      
      v_variant := jsonb_build_object(
        'meal_plan_code', v_meal_plan.plan_code,
        'meal_plan_name', v_meal_plan.plan_name,
        'meal_plan_description', v_meal_plan.description,
        'included_meals', v_meal_details.included_meals,
        'meal_breakdown', v_meal_details.meal_breakdown,
        'cancellation_policy_code', v_cancellation_policy.policy_code,
        'cancellation_policy_name', v_cancellation_policy.policy_name,
        'cancellation_terms', v_cancellation_policy.cancellation_terms,
        'room_rate', v_base_price,
        'meal_cost', v_meal_cost,
        'policy_adjustment', v_policy_adjustment,
        'total_price', v_final_price,
        'price_per_night', v_final_price / v_nights,
        'is_featured', v_meal_plan.is_featured OR v_cancellation_policy.is_featured,
        'savings', CASE WHEN v_policy_adjustment < 0 THEN ABS(v_policy_adjustment) ELSE 0 END,
        'discount_percentage', CASE WHEN v_policy_adjustment < 0 THEN ABS(v_cancellation_policy.adjustment_value) ELSE 0 END
      );
      
      v_variants := v_variants || v_variant;
    END LOOP;
  END LOOP;
  
  RETURN v_variants;
END;
$$;