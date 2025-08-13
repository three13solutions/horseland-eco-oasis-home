-- Add fields to store multiple contact methods for guests
ALTER TABLE public.guests 
ADD COLUMN IF NOT EXISTS contact_emails jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS contact_phones jsonb DEFAULT '[]'::jsonb;

-- Migrate existing email and phone data to the new JSON fields
UPDATE public.guests 
SET 
  contact_emails = CASE 
    WHEN email IS NOT NULL THEN jsonb_build_array(email)
    ELSE '[]'::jsonb
  END,
  contact_phones = CASE 
    WHEN phone IS NOT NULL THEN jsonb_build_array(phone)
    ELSE '[]'::jsonb
  END
WHERE contact_emails IS NULL OR contact_phones IS NULL;