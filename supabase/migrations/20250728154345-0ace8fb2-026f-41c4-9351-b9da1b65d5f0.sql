-- Update copyright text in site_settings to remove Mountain Spa
UPDATE site_settings 
SET setting_value = '"© 2024 Horseland Hotel. All rights reserved."'::jsonb
WHERE setting_key = 'copyright_text' AND setting_value::text LIKE '%Mountain Spa%';