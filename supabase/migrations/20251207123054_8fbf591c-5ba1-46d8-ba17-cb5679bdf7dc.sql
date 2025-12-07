-- Add day_type column to tactical_overrides table for weekday/weekend distinction
ALTER TABLE tactical_overrides 
ADD COLUMN IF NOT EXISTS day_type text DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN tactical_overrides.day_type IS 'Indicates if override applies to weekday, weekend, or both (NULL = all days)';