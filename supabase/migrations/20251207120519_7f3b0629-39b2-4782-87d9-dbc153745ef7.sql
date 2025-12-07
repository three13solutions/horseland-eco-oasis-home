-- Add meal plan condition to tactical_overrides
ALTER TABLE public.tactical_overrides
ADD COLUMN IF NOT EXISTS meal_plan_code text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.tactical_overrides.meal_plan_code IS 'Meal plan this override applies to (all_meals_inclusive, breakfast_and_dinner, room_only, or null for all)';