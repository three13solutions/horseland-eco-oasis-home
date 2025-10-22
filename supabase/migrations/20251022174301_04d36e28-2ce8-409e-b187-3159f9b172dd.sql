-- Enable RLS on tactical_overrides if not already enabled
ALTER TABLE tactical_overrides ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admin users can manage tactical overrides" ON tactical_overrides;
DROP POLICY IF EXISTS "Anyone can view active tactical overrides" ON tactical_overrides;

-- Create policies for tactical_overrides
CREATE POLICY "Admin users can manage tactical overrides"
ON tactical_overrides
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM admin_profiles 
    WHERE admin_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can view active tactical overrides"
ON tactical_overrides
FOR SELECT
USING (is_active = true);

-- Delete any existing Diwali overrides first
DELETE FROM tactical_overrides 
WHERE reason LIKE 'Diwali Package 2025%';

-- Insert Diwali Package pricing overrides for all room categories
INSERT INTO tactical_overrides (override_type, room_type_id, start_date, end_date, override_price, reason, is_active) VALUES
-- Superior Ac (Pool Side) - ₹22,000/night (Pool Deck Rooms, Poolview Rooms)
('special_event', 'fc95322a-43f2-46ba-9052-470525b091cf', '2025-10-17', '2025-11-02', 22000, 'Diwali Package 2025 - Superior Ac (Pool Side) with All Meals', true),
('special_event', 'bf4ddd1f-82a9-4e6a-ae04-fd99d5e74443', '2025-10-17', '2025-11-02', 22000, 'Diwali Package 2025 - Superior Ac (Pool Side) with All Meals', true),

-- Deluxe Ac (Pool View) - ₹12,000/night (Balcony Rooms, Loft Rooms)
('special_event', 'dd402abc-04b8-473c-aa0f-de571cf4e68c', '2025-10-17', '2025-11-02', 12000, 'Diwali Package 2025 - Deluxe Ac (Pool View) with All Meals', true),
('special_event', '696dd24b-eedc-44dc-9907-9f81918abdc3', '2025-10-17', '2025-11-02', 12000, 'Diwali Package 2025 - Deluxe Ac (Pool View) with All Meals', true),

-- Standard Ac - ₹10,000/night (Classic Pods, Playside, Gameside, Bamboo)
('special_event', '674b9511-7240-48ba-83bd-b16f50e148e1', '2025-10-17', '2025-11-02', 10000, 'Diwali Package 2025 - Standard Ac with All Meals', true),
('special_event', 'c5391431-7bdf-4cf1-977e-c696480fcdda', '2025-10-17', '2025-11-02', 10000, 'Diwali Package 2025 - Standard Ac with All Meals', true),
('special_event', '47bdf1a3-751f-4ce9-afaa-7cb337151c16', '2025-10-17', '2025-11-02', 10000, 'Diwali Package 2025 - Standard Ac with All Meals', true),
('special_event', '74c89770-8f04-4a4b-b061-b85743725b88', '2025-10-17', '2025-11-02', 10000, 'Diwali Package 2025 - Standard Ac with All Meals', true),

-- Standard Ac (Basement) - ₹8,000/night (Basement Hideouts)
('special_event', '8d3f3742-4c4d-4d2e-b25f-a50ed807dbf5', '2025-10-17', '2025-11-02', 8000, 'Diwali Package 2025 - Standard Ac (Basement) with All Meals', true);