-- Update Google Maps API key with user's actual key
UPDATE public.api_integrations
SET public_config = jsonb_set(public_config, '{api_key}', '"AIzaSyA8704uuYTZC8gKSoovX5Ox5o4SGK9q-W8"')
WHERE integration_key = 'google_maps';