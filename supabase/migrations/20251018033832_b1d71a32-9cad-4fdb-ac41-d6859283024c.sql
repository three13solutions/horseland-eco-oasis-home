-- Update day_types to only have weekday and weekend
-- Delete existing pricing records first
DELETE FROM public.seasonal_pricing;

-- Update day_types to only keep weekday and weekend
DELETE FROM public.day_types WHERE slug NOT IN ('weekday', 'weekend');

-- Update weekend description to include holidays
UPDATE public.day_types 
SET description = 'Friday to Sunday, including all holidays and long weekends'
WHERE slug = 'weekend';