-- Add settings for spa and activities visibility in booking flow
INSERT INTO site_settings (setting_key, setting_value)
VALUES 
  ('show_spa_in_booking', 'false'),
  ('show_activities_in_booking', 'false')
ON CONFLICT (setting_key) DO NOTHING;