-- Insert room units batch 3 (Plateau Pods and some Cave Hideouts)
WITH room_type_mapping AS (
  SELECT id, name FROM public.room_types
)
INSERT INTO public.room_units (
  unit_number, unit_name, floor_number, room_type_id, bed_configuration, max_occupancy, notes, status
) VALUES 
-- Plateau Pods
('216', 'Bucephalus Nook', 2, (SELECT id FROM room_type_mapping WHERE name = 'Plateau Pods'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located around the activity area, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('217', 'Man o'' Peace Hideaway', 1, (SELECT id FROM room_type_mapping WHERE name = 'Plateau Pods'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located around the activity area, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('G.View', 'Copenhagen Corner', 2, (SELECT id FROM room_type_mapping WHERE name = 'Plateau Pods'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located around the activity area, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('302', 'Snowman Snug', 2, (SELECT id FROM room_type_mapping WHERE name = 'Plateau Pods'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located around the activity area, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('307', 'Trigger Retreat', 2, (SELECT id FROM room_type_mapping WHERE name = 'Plateau Pods'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located around the activity area, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('308', 'Misty Nest', 2, (SELECT id FROM room_type_mapping WHERE name = 'Plateau Pods'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located around the activity area, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('309', 'Buoyant Boy Alcove', 2, (SELECT id FROM room_type_mapping WHERE name = 'Plateau Pods'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located around the activity area, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('200', 'Smoky Sanctuary', 1, (SELECT id FROM room_type_mapping WHERE name = 'Plateau Pods'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located around the activity area, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
-- Cave Hideouts (Basement = -1)
('110', 'Comanche''s Den', -1, (SELECT id FROM room_type_mapping WHERE name = 'Cave Hideouts'), '[{"type": "Double Bed", "count": 1}, {"type": "Sofa Cum Bed", "count": 1}]'::jsonb, 3, 'Located in basement, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('111 A/B', 'Bucephalus Barracks', -1, (SELECT id FROM room_type_mapping WHERE name = 'Cave Hideouts'), '[{"type": "Double Bed", "count": 3}, {"type": "Mattress", "count": 2}]'::jsonb, 8, 'Located in basement, well furnished with beds, TV, telephone and air conditioner.', 'available'),
('112', 'Marengo''s Rest', -1, (SELECT id FROM room_type_mapping WHERE name = 'Cave Hideouts'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located in basement, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('113', 'Traveller''s Shelter', -1, (SELECT id FROM room_type_mapping WHERE name = 'Cave Hideouts'), '[{"type": "Double Bed", "count": 2}]'::jsonb, 4, 'Located in basement, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('114', 'Chetak''s Stronghold', -1, (SELECT id FROM room_type_mapping WHERE name = 'Cave Hideouts'), '[{"type": "Double Bed", "count": 3}]'::jsonb, 6, 'Located in basement, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('115', 'Reckless Quarters', -1, (SELECT id FROM room_type_mapping WHERE name = 'Cave Hideouts'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located in basement, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('116', 'Kasztanka Haven', -1, (SELECT id FROM room_type_mapping WHERE name = 'Cave Hideouts'), '[{"type": "Double Bed", "count": 2}]'::jsonb, 4, 'Located in basement, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('117', 'Warrior''s Retreat', -1, (SELECT id FROM room_type_mapping WHERE name = 'Cave Hideouts'), '[{"type": "Double Bed", "count": 1}, {"type": "Sofa Cum Bed", "count": 1}]'::jsonb, 3, 'Located in basement, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('C-Hall', 'The Battle Herd Hall', -1, (SELECT id FROM room_type_mapping WHERE name = 'Cave Hideouts'), '[{"type": "Double Bed", "count": 4}]'::jsonb, 12, 'Large hall located in basement, well furnished with multiple beds, TV, telephone and air conditioner.', 'available');