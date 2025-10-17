-- Rename site_settings keys to match admin panel labels
-- Update site_title to brand_name
UPDATE site_settings 
SET setting_key = 'brand_name' 
WHERE setting_key = 'site_title';

-- Update site_logo to brand_monogram
UPDATE site_settings 
SET setting_key = 'brand_monogram' 
WHERE setting_key = 'site_logo';

-- Update tagline to credits
UPDATE site_settings 
SET setting_key = 'credits' 
WHERE setting_key = 'tagline';