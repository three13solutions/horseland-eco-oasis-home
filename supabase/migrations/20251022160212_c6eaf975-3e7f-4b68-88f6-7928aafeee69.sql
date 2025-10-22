-- Populate sample pricing rules with correct constraint values

-- 1. PRICING CONSTRAINTS (Floor and Ceiling Prices)
INSERT INTO pricing_constraints (room_type_id, floor_price, ceiling_price, is_active)
SELECT 
  id as room_type_id,
  base_price * 0.7 as floor_price,
  base_price * 2.5 as ceiling_price,
  true as is_active
FROM room_types 
WHERE is_published = true
ON CONFLICT DO NOTHING;

-- 2. OCCUPANCY YIELD RULES
INSERT INTO occupancy_yield_rules (
  rule_name, occupancy_threshold, price_adjustment_type, price_adjustment, applies_to, priority, is_active
) VALUES 
('High Demand Premium', 80, 'percentage', 15, 'all', 10, true),
('Very High Demand', 90, 'percentage', 25, 'all', 20, true),
('Low Occupancy Discount', 30, 'percentage', -10, 'all', 5, true)
ON CONFLICT DO NOTHING;

-- 3. LEAD TIME RULES  
INSERT INTO lead_time_rules (
  rule_name, days_before_checkin_min, days_before_checkin_max, 
  price_adjustment_type, price_adjustment, applies_to, priority, is_active
) VALUES
('Early Bird 60+ Days', 60, 365, 'percentage', -15, 'all', 10, true),
('Early Bird 30-59 Days', 30, 59, 'percentage', -10, 'all', 15, true),
('Standard Booking', 7, 29, 'percentage', 0, 'all', 20, true),
('Last Minute Premium', 0, 6, 'percentage', 20, 'all', 25, true)
ON CONFLICT DO NOTHING;

-- 4. GUEST COMPOSITION RULES
INSERT INTO guest_composition_rules (
  room_type_id, base_guests_count, extra_adult_charge, 
  extra_child_charge, extra_infant_charge, max_extra_guests, is_active
)
SELECT 
  id as room_type_id, 2 as base_guests_count, 1500 as extra_adult_charge,
  800 as extra_child_charge, 0 as extra_infant_charge, 2 as max_extra_guests, true as is_active
FROM room_types WHERE is_published = true
ON CONFLICT DO NOTHING;

-- 5. CHANNEL RULES (using valid channel names: direct, ota, travel_agent, corporate, other)
INSERT INTO channel_rules (channel_name, adjustment_type, adjustment_value, applies_to, is_active) VALUES
('direct', 'percentage', -5, 'all', true),
('ota', 'percentage', 15, 'all', true),
('travel_agent', 'percentage', 12, 'all', true),
('corporate', 'percentage', -12, 'all', true),
('other', 'percentage', 5, 'all', true)
ON CONFLICT DO NOTHING;

-- 6. COMPETITOR RATES
INSERT INTO competitor_rates (competitor_name, rate_date, competitor_price, room_category_comparable, source, notes) VALUES
('Mountain View Resort', CURRENT_DATE, 4500, 'Deluxe', 'manual', 'Weekend rate'),
('Mountain View Resort', CURRENT_DATE + 1, 4200, 'Deluxe', 'manual', 'Weekday rate'),
('Valley Heights Hotel', CURRENT_DATE, 3800, 'Standard', 'manual', 'Peak season'),
('Valley Heights Hotel', CURRENT_DATE + 7, 3500, 'Standard', 'manual', 'Mid-week'),
('Hillside Retreat', CURRENT_DATE, 5200, 'Premium Suite', 'manual', 'Holiday weekend')
ON CONFLICT DO NOTHING;
