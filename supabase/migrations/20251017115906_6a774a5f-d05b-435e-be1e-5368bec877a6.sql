-- Enable Google Maps with temporary API key
UPDATE api_integrations 
SET 
  public_config = '{"GOOGLE_MAPS_API_KEY": "AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8"}',
  is_enabled = true,
  status = 'ok'
WHERE integration_key = 'google_maps';