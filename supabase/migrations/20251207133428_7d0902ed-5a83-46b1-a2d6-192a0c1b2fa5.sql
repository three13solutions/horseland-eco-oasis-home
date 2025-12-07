-- Add room_category_id column to tactical_overrides for category-level overrides
ALTER TABLE public.tactical_overrides ADD COLUMN room_category_id uuid REFERENCES public.room_categories(id);

-- Add comment for clarity
COMMENT ON COLUMN public.tactical_overrides.room_category_id IS 'When set, applies override to all room types in this category';