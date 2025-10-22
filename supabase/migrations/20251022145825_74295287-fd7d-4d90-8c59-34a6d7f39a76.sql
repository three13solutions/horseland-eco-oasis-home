-- Phase 1: Database Schema Enhancement for Revenue Management System

-- 1. Pricing constraints (floor/ceiling prices)
CREATE TABLE public.pricing_constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type_id UUID REFERENCES public.room_types(id) ON DELETE CASCADE,
  room_unit_id UUID REFERENCES public.room_units(id) ON DELETE CASCADE,
  floor_price NUMERIC NOT NULL,
  ceiling_price NUMERIC,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT check_floor_ceiling CHECK (ceiling_price IS NULL OR ceiling_price >= floor_price)
);

ALTER TABLE public.pricing_constraints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin users can manage pricing constraints"
  ON public.pricing_constraints
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can view active pricing constraints"
  ON public.pricing_constraints
  FOR SELECT
  USING (is_active = true);

-- 2. Occupancy yield rules
CREATE TABLE public.occupancy_yield_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  occupancy_threshold INTEGER NOT NULL CHECK (occupancy_threshold >= 0 AND occupancy_threshold <= 100),
  price_adjustment_type TEXT NOT NULL CHECK (price_adjustment_type IN ('percentage', 'fixed')),
  price_adjustment NUMERIC NOT NULL,
  applies_to TEXT NOT NULL CHECK (applies_to IN ('all', 'category', 'season')),
  room_type_id UUID REFERENCES public.room_types(id) ON DELETE CASCADE,
  season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.occupancy_yield_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin users can manage occupancy yield rules"
  ON public.occupancy_yield_rules
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can view active occupancy yield rules"
  ON public.occupancy_yield_rules
  FOR SELECT
  USING (is_active = true);

-- 3. Lead time (pace) rules
CREATE TABLE public.lead_time_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  days_before_checkin_min INTEGER NOT NULL CHECK (days_before_checkin_min >= 0),
  days_before_checkin_max INTEGER NOT NULL,
  price_adjustment_type TEXT NOT NULL CHECK (price_adjustment_type IN ('percentage', 'fixed')),
  price_adjustment NUMERIC NOT NULL,
  applies_to TEXT NOT NULL CHECK (applies_to IN ('all', 'season', 'category')),
  season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE,
  room_type_id UUID REFERENCES public.room_types(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT check_lead_time_range CHECK (days_before_checkin_max >= days_before_checkin_min)
);

ALTER TABLE public.lead_time_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin users can manage lead time rules"
  ON public.lead_time_rules
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can view active lead time rules"
  ON public.lead_time_rules
  FOR SELECT
  USING (is_active = true);

-- 4. Guest composition rules
CREATE TABLE public.guest_composition_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type_id UUID REFERENCES public.room_types(id) ON DELETE CASCADE,
  base_guests_count INTEGER NOT NULL DEFAULT 2,
  extra_adult_charge NUMERIC DEFAULT 0,
  extra_child_charge NUMERIC DEFAULT 0,
  extra_infant_charge NUMERIC DEFAULT 0,
  max_extra_guests INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.guest_composition_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin users can manage guest composition rules"
  ON public.guest_composition_rules
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can view active guest composition rules"
  ON public.guest_composition_rules
  FOR SELECT
  USING (is_active = true);

-- 5. Channel adjustment rules
CREATE TABLE public.channel_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_name TEXT NOT NULL CHECK (channel_name IN ('direct', 'ota', 'travel_agent', 'corporate', 'other')),
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('percentage', 'fixed')),
  adjustment_value NUMERIC NOT NULL,
  applies_to TEXT NOT NULL CHECK (applies_to IN ('all', 'category', 'season')),
  room_type_id UUID REFERENCES public.room_types(id) ON DELETE CASCADE,
  season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.channel_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin users can manage channel rules"
  ON public.channel_rules
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can view active channel rules"
  ON public.channel_rules
  FOR SELECT
  USING (is_active = true);

-- 6. Tactical overrides (manual price overrides)
CREATE TABLE public.tactical_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  override_type TEXT NOT NULL CHECK (override_type IN ('date_range', 'specific_unit', 'promotion', 'maintenance', 'special_event')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  room_type_id UUID REFERENCES public.room_types(id) ON DELETE CASCADE,
  room_unit_id UUID REFERENCES public.room_units(id) ON DELETE CASCADE,
  override_price NUMERIC,
  adjustment_type TEXT CHECK (adjustment_type IN ('percentage', 'fixed')),
  adjustment_value NUMERIC,
  reason TEXT NOT NULL,
  created_by UUID REFERENCES public.admin_profiles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT check_tactical_override_dates CHECK (end_date >= start_date),
  CONSTRAINT check_tactical_override_values CHECK (
    (override_price IS NOT NULL) OR 
    (adjustment_type IS NOT NULL AND adjustment_value IS NOT NULL)
  )
);

ALTER TABLE public.tactical_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin users can manage tactical overrides"
  ON public.tactical_overrides
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can view active tactical overrides"
  ON public.tactical_overrides
  FOR SELECT
  USING (is_active = true);

-- 7. Competitor parity tracking (for reference)
CREATE TABLE public.competitor_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_name TEXT NOT NULL,
  room_category_comparable TEXT,
  our_room_type_id UUID REFERENCES public.room_types(id) ON DELETE CASCADE,
  rate_date DATE NOT NULL,
  competitor_price NUMERIC NOT NULL,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'scraper', 'api')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.competitor_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin users can manage competitor rates"
  ON public.competitor_rates
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()));

-- 8. Final rate card cache (computed prices)
CREATE TABLE public.rate_card_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type_id UUID NOT NULL REFERENCES public.room_types(id) ON DELETE CASCADE,
  room_unit_id UUID REFERENCES public.room_units(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  day_type_id UUID REFERENCES public.day_types(id),
  season_id UUID REFERENCES public.seasons(id),
  base_price NUMERIC NOT NULL,
  final_price NUMERIC NOT NULL,
  rules_applied JSONB DEFAULT '[]'::jsonb,
  computed_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '24 hours'),
  UNIQUE(room_type_id, room_unit_id, date)
);

ALTER TABLE public.rate_card_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin users can manage rate card cache"
  ON public.rate_card_cache
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can view active rate card cache"
  ON public.rate_card_cache
  FOR SELECT
  USING (true);

-- Create indexes for performance
CREATE INDEX idx_pricing_constraints_room_type ON public.pricing_constraints(room_type_id);
CREATE INDEX idx_pricing_constraints_room_unit ON public.pricing_constraints(room_unit_id);
CREATE INDEX idx_occupancy_yield_rules_active ON public.occupancy_yield_rules(is_active, priority);
CREATE INDEX idx_lead_time_rules_active ON public.lead_time_rules(is_active, priority);
CREATE INDEX idx_tactical_overrides_dates ON public.tactical_overrides(start_date, end_date, is_active);
CREATE INDEX idx_rate_card_cache_lookup ON public.rate_card_cache(room_type_id, date, room_unit_id);
CREATE INDEX idx_competitor_rates_date ON public.competitor_rates(rate_date, our_room_type_id);

-- Add update triggers
CREATE TRIGGER update_pricing_constraints_updated_at
  BEFORE UPDATE ON public.pricing_constraints
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_occupancy_yield_rules_updated_at
  BEFORE UPDATE ON public.occupancy_yield_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lead_time_rules_updated_at
  BEFORE UPDATE ON public.lead_time_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_guest_composition_rules_updated_at
  BEFORE UPDATE ON public.guest_composition_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_channel_rules_updated_at
  BEFORE UPDATE ON public.channel_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tactical_overrides_updated_at
  BEFORE UPDATE ON public.tactical_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Phase 2: Pricing Calculation Engine Functions

-- Function 1: Get base price for a date
CREATE OR REPLACE FUNCTION public.get_base_price_for_date(
  p_room_type_id UUID,
  p_date DATE
) RETURNS TABLE(
  price NUMERIC,
  season_id UUID,
  day_type_id UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_season_id UUID;
  v_day_type_id UUID;
  v_price NUMERIC;
  v_month INTEGER;
  v_day INTEGER;
BEGIN
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
$$;

-- Function 2: Calculate dynamic price with all rules applied
CREATE OR REPLACE FUNCTION public.calculate_dynamic_price(
  p_room_type_id UUID,
  p_room_unit_id UUID DEFAULT NULL,
  p_date DATE DEFAULT CURRENT_DATE,
  p_guests_count INTEGER DEFAULT 2,
  p_booking_channel TEXT DEFAULT 'direct',
  p_current_occupancy INTEGER DEFAULT 0
) RETURNS TABLE(
  final_price NUMERIC,
  base_price NUMERIC,
  adjustments JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  IF v_adjustment IS NOT NULL AND v_adjustment > 0 THEN
    v_final_price := v_adjustment;
    v_adjustments := v_adjustments || jsonb_build_object(
      'type', 'tactical_override',
      'from', v_base_price,
      'to', v_final_price,
      'reason', v_rule_name
    );
    v_base_price := v_final_price;
  ELSIF v_adjustment_type IS NOT NULL THEN
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

-- Function 3: Calculate total booking price
CREATE OR REPLACE FUNCTION public.calculate_booking_total(
  p_room_type_id UUID,
  p_room_unit_id UUID DEFAULT NULL,
  p_check_in DATE DEFAULT CURRENT_DATE,
  p_check_out DATE DEFAULT CURRENT_DATE + 1,
  p_guests_count INTEGER DEFAULT 2,
  p_booking_channel TEXT DEFAULT 'direct'
) RETURNS TABLE(
  total_nights INTEGER,
  total_amount NUMERIC,
  nightly_breakdown JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      p_guests_count,
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
$$;