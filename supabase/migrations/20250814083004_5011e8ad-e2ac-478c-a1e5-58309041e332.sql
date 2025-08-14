-- Insert remaining room units (Bamboo Cabins, Courtside Quarters, Playside Nooks)
WITH room_type_mapping AS (
  SELECT id, name FROM public.room_types
)
INSERT INTO public.room_units (
  unit_number, unit_name, floor_number, room_type_id, bed_configuration, max_occupancy, notes, status
) VALUES 
-- Bamboo Cabins
('F1', 'Hidalgo''s Haven', 0, (SELECT id FROM room_type_mapping WHERE name = 'Bamboo Cabins'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located around the activity area, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('F2', 'Red Rum Retreat', 0, (SELECT id FROM room_type_mapping WHERE name = 'Bamboo Cabins'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located around the activity area, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('F3', 'Man o'' War Lodge', 0, (SELECT id FROM room_type_mapping WHERE name = 'Bamboo Cabins'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located around the activity area, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('F4', 'Phar Lap Pavilion', 0, (SELECT id FROM room_type_mapping WHERE name = 'Bamboo Cabins'), '[{"type": "Double Bed", "count": 2}]'::jsonb, 4, 'Tent accommodation with double beds.', 'available'),
('F5', 'Zenyatta Nook', 0, (SELECT id FROM room_type_mapping WHERE name = 'Bamboo Cabins'), '[{"type": "Double Bed", "count": 2}]'::jsonb, 4, 'Tent accommodation with double beds.', 'available'),
('F6', 'Seabiscuit Suite', 0, (SELECT id FROM room_type_mapping WHERE name = 'Bamboo Cabins'), '[{"type": "Double Bed", "count": 2}]'::jsonb, 4, 'Tent accommodation with double beds.', 'available'),
-- Courtside Quarters
('G1', 'Northern Light Quarters', 0, (SELECT id FROM room_type_mapping WHERE name = 'Courtside Quarters'), '[{"type": "Double Bed", "count": 1}, {"type": "Sofa Cum Bed", "count": 1}]'::jsonb, 3, 'Located near recreational areas, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('G2', 'Beau Regard Quarters', 0, (SELECT id FROM room_type_mapping WHERE name = 'Courtside Quarters'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located near recreational areas, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('G3', 'Sir Barton Quarters', 0, (SELECT id FROM room_type_mapping WHERE name = 'Courtside Quarters'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located near recreational areas, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('G4', 'Bayardo Quarters', 0, (SELECT id FROM room_type_mapping WHERE name = 'Courtside Quarters'), '[{"type": "Double Bed", "count": 2}]'::jsonb, 4, 'Located near recreational areas, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('G5', 'Ormonde Quarters', 0, (SELECT id FROM room_type_mapping WHERE name = 'Courtside Quarters'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located near recreational areas, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('G6', 'Moifaa Quarters', 0, (SELECT id FROM room_type_mapping WHERE name = 'Courtside Quarters'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located near recreational areas, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('G7', 'Glencoe Quarters', 0, (SELECT id FROM room_type_mapping WHERE name = 'Courtside Quarters'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located near recreational areas, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
-- Playside Nooks
('007', 'Comanche Nook', 0, (SELECT id FROM room_type_mapping WHERE name = 'Playside Nooks'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located near play areas, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('008', 'Ruffian Nook', 0, (SELECT id FROM room_type_mapping WHERE name = 'Playside Nooks'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located near play areas, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('009', 'Hidalgo Nook', 0, (SELECT id FROM room_type_mapping WHERE name = 'Playside Nooks'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located near play areas, well furnished with double bed, TV, telephone and air conditioner.', 'available');