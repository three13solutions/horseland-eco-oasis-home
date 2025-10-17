-- Add custom pricing support to room_units table
ALTER TABLE room_units 
ADD COLUMN IF NOT EXISTS custom_pricing jsonb DEFAULT NULL;

COMMENT ON COLUMN room_units.custom_pricing IS 'Custom pricing overrides for this unit. Structure: {"peak": 5000, "shoulder": 4000, "monsoon": 3000, "off_peak": 2500}';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_room_units_custom_pricing ON room_units USING gin(custom_pricing) WHERE custom_pricing IS NOT NULL;