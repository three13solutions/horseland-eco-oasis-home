-- Add occupancy and length of stay conditions to tactical_overrides
ALTER TABLE public.tactical_overrides
ADD COLUMN IF NOT EXISTS min_nights integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS max_nights integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS occupancy_type text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS min_adults integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS max_adults integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS min_children integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS max_children integer DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.tactical_overrides.occupancy_type IS 'Filter by occupancy: single, double, extra_adult, extra_child, or null for all';
COMMENT ON COLUMN public.tactical_overrides.min_nights IS 'Minimum nights for override to apply, null means no minimum';
COMMENT ON COLUMN public.tactical_overrides.max_nights IS 'Maximum nights for override to apply, null means no maximum';