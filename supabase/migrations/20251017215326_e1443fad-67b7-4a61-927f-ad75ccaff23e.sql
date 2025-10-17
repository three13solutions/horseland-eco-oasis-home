-- Add category column to spa_services table
ALTER TABLE public.spa_services 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'massage';

-- Add check constraint for valid categories
ALTER TABLE public.spa_services 
ADD CONSTRAINT spa_services_category_check 
CHECK (category IN ('massage', 'therapy', 'facials', 'workouts'));

COMMENT ON COLUMN public.spa_services.category IS 'Category of spa service: massage, therapy, facials, or workouts';