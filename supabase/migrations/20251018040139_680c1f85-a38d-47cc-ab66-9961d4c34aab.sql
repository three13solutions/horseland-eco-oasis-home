-- Add year column to season_periods table
ALTER TABLE public.season_periods 
ADD COLUMN IF NOT EXISTS year INTEGER;

-- Set default year to current year for existing records
UPDATE public.season_periods 
SET year = EXTRACT(YEAR FROM CURRENT_DATE)
WHERE year IS NULL;

-- Make year NOT NULL after setting defaults
ALTER TABLE public.season_periods 
ALTER COLUMN year SET NOT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_season_periods_year ON public.season_periods(year);