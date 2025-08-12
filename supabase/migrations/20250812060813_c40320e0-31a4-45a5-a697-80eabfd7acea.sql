-- Add new columns to activities table for enhanced activity management
ALTER TABLE public.activities 
ADD COLUMN audience_tags jsonb DEFAULT '[]'::jsonb,
ADD COLUMN location_name text,
ADD COLUMN is_on_property boolean DEFAULT true,
ADD COLUMN price_type text DEFAULT 'free' CHECK (price_type IN ('free', 'fixed', 'range')),
ADD COLUMN price_amount numeric DEFAULT 0,
ADD COLUMN price_range_min numeric,
ADD COLUMN price_range_max numeric,
ADD COLUMN duration_hours integer,
ADD COLUMN duration_minutes integer,
ADD COLUMN timings jsonb DEFAULT '{"type": "24_7"}'::jsonb,
ADD COLUMN available_days jsonb DEFAULT '[]'::jsonb,
ADD COLUMN available_seasons jsonb DEFAULT '[]'::jsonb,
ADD COLUMN disclaimer text,
ADD COLUMN rules_regulations text,
ADD COLUMN activity_tags jsonb DEFAULT '[]'::jsonb,
ADD COLUMN media_urls jsonb DEFAULT '[]'::jsonb,
ADD COLUMN booking_type text DEFAULT 'reception' CHECK (booking_type IN ('online', 'reception', 'both'));

-- Add comments for clarity
COMMENT ON COLUMN public.activities.audience_tags IS 'Array of audience types: families, couples, solo, kids, adults, seniors, etc.';
COMMENT ON COLUMN public.activities.location_name IS 'Name/description of where activity takes place';
COMMENT ON COLUMN public.activities.is_on_property IS 'Whether activity is on hotel property or off-site';
COMMENT ON COLUMN public.activities.price_type IS 'Type of pricing: free, fixed price, or price range';
COMMENT ON COLUMN public.activities.timings IS 'JSON object with timing info: {type: "24_7"} or {type: "specific", times: ["9:00-17:00"]}';
COMMENT ON COLUMN public.activities.available_days IS 'Array of available days: ["monday", "tuesday", etc.] or empty for all days';
COMMENT ON COLUMN public.activities.available_seasons IS 'Array of seasons: ["spring", "summer", "monsoon", "winter"]';
COMMENT ON COLUMN public.activities.activity_tags IS 'Array of activity tags: adventure, relaxing, cultural, etc.';
COMMENT ON COLUMN public.activities.media_urls IS 'Array of image/video URLs for the activity';
COMMENT ON COLUMN public.activities.booking_type IS 'How activity can be booked: online, reception, or both';