-- Add Google Maps integration
INSERT INTO api_integrations (
  integration_key,
  name,
  category,
  description,
  secret_keys,
  config_keys,
  public_config,
  is_enabled,
  status
) VALUES (
  'google_maps',
  'Google Maps',
  'maps',
  'Display interactive maps and location markers using Google Maps API',
  '{}',
  '{"GOOGLE_MAPS_API_KEY": {"label": "Google Maps API Key", "description": "Get your API key from Google Cloud Console", "type": "text", "required": true}}',
  '{}',
  false,
  'not_configured'
) ON CONFLICT (integration_key) DO NOTHING;