-- Run a targeted update for the specific guest to ensure contact arrays are populated
UPDATE guests 
SET 
  contact_phones = CASE 
    WHEN contact_phones IS NULL OR jsonb_array_length(contact_phones) = 0 THEN
      CASE WHEN phone IS NOT NULL THEN jsonb_build_array(phone) ELSE '[]'::jsonb END
    ELSE contact_phones
  END,
  contact_emails = CASE 
    WHEN contact_emails IS NULL OR jsonb_array_length(contact_emails) = 0 THEN
      CASE WHEN email IS NOT NULL THEN jsonb_build_array(email) ELSE '[]'::jsonb END
    ELSE contact_emails
  END,
  updated_at = now()
WHERE id = '112f97c8-b5b7-4099-82d9-67f48c9a3767';

-- Also check for any bookings that might not be linked properly
UPDATE bookings 
SET guest_id = '112f97c8-b5b7-4099-82d9-67f48c9a3767'
WHERE guest_phone = '9876543220' 
AND (guest_id IS NULL OR guest_id != '112f97c8-b5b7-4099-82d9-67f48c9a3767');