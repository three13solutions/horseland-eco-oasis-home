-- Add category_id to room_units for overrides
ALTER TABLE public.room_units ADD COLUMN category_id uuid REFERENCES public.room_categories(id);

-- Update room_types with their categories
-- Superior: Pool Deck Rooms, Loft Rooms
UPDATE public.room_types SET category_id = 'fbdc10eb-eac1-4287-bc94-ba03671753f4' WHERE name = 'Pool Deck Rooms';
UPDATE public.room_types SET category_id = 'fbdc10eb-eac1-4287-bc94-ba03671753f4' WHERE name = 'Loft Rooms';

-- Deluxe: Balcony Rooms
UPDATE public.room_types SET category_id = '6e27f1db-c287-4735-b16b-1e045c291905' WHERE name = 'Balcony Rooms';

-- Standard: Poolview Rooms, Classic Pods, Bamboo Cabins, Gameside Quarters, Playside Rooms
UPDATE public.room_types SET category_id = '807d3dfa-e428-4c57-86fd-191cd7093a8e' WHERE name = 'Poolview Rooms';
UPDATE public.room_types SET category_id = '807d3dfa-e428-4c57-86fd-191cd7093a8e' WHERE name = 'Classic Pods';
UPDATE public.room_types SET category_id = '807d3dfa-e428-4c57-86fd-191cd7093a8e' WHERE name = 'Bamboo Cabins';
UPDATE public.room_types SET category_id = '807d3dfa-e428-4c57-86fd-191cd7093a8e' WHERE name = 'Gameside Quarters';
UPDATE public.room_types SET category_id = '807d3dfa-e428-4c57-86fd-191cd7093a8e' WHERE name = 'Playside Rooms';

-- Standard (Basement): Basement Hideouts - already set

-- Override for Room Units 210 and 211 to be Deluxe instead of Standard
UPDATE public.room_units SET category_id = '6e27f1db-c287-4735-b16b-1e045c291905' WHERE unit_number IN ('210', '211');