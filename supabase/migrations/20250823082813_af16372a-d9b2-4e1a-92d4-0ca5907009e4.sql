
-- 1) Base table for integration registrations
CREATE TABLE public.api_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_key text UNIQUE NOT NULL,      -- e.g., 'razorpay', 'mapbox'
  name text NOT NULL,                        -- Display name
  category text NOT NULL,                    -- e.g., 'payments', 'maps', 'ota', 'messaging', 'analytics', 'other'
  description text,
  is_enabled boolean NOT NULL DEFAULT false,
  -- secret_keys: map of field_key -> label the UI should render (no values here)
  secret_keys jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- config_keys: map of non-sensitive config field_key -> label (optional)
  config_keys jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- public_config: actual non-sensitive config values (e.g., mode, region)
  public_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'not_configured',  -- 'not_configured' | 'ok' | 'error'
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_integrations ENABLE ROW LEVEL SECURITY;

-- Admins can do everything on api_integrations
CREATE POLICY "Admins manage integrations"
  ON public.api_integrations
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- keep updated_at current
CREATE TRIGGER trg_api_integrations_updated
  BEFORE UPDATE ON public.api_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 2) Table for encrypted secret storage
CREATE TABLE public.api_integration_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES public.api_integrations(id) ON DELETE CASCADE,
  key text NOT NULL,                 -- e.g., 'RAZORPAY_KEY_ID'
  value_encrypted text NOT NULL,     -- base64-encoded JSON blob produced by edge function (AES-GCM)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (integration_id, key)
);

ALTER TABLE public.api_integration_secrets ENABLE ROW LEVEL SECURITY;

-- Admins can do everything on secrets
CREATE POLICY "Admins manage integration secrets"
  ON public.api_integration_secrets
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- keep updated_at current
CREATE TRIGGER trg_api_integration_secrets_updated
  BEFORE UPDATE ON public.api_integration_secrets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 3) Seed initial integrations (idempotent)
INSERT INTO public.api_integrations (integration_key, name, category, description, secret_keys, config_keys, status)
VALUES
  (
    'razorpay',
    'Razorpay',
    'payments',
    'Payment gateway for India.',
    '{"RAZORPAY_KEY_ID":"Key ID","RAZORPAY_SECRET":"Secret"}'::jsonb,
    '{}'::jsonb,
    'not_configured'
  ),
  (
    'mapbox',
    'Mapbox',
    'maps',
    'Maps, geocoding and visualization.',
    '{"MAPBOX_PUBLIC_TOKEN":"Public token"}'::jsonb,
    '{}'::jsonb,
    'not_configured'
  ),
  (
    'booking_com',
    'Booking.com',
    'ota',
    'OTA connection (placeholder for future API).',
    '{"BOOKING_COM_API_KEY":"API Key"}'::jsonb,
    '{}'::jsonb,
    'not_configured'
  ),
  (
    'expedia',
    'Expedia',
    'ota',
    'OTA connection (placeholder for future API).',
    '{"EXPEDIA_API_KEY":"API Key","EXPEDIA_API_SECRET":"API Secret"}'::jsonb,
    '{}'::jsonb,
    'not_configured'
  )
ON CONFLICT (integration_key) DO NOTHING;
