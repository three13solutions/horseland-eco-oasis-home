-- Merge all bookings with phone number variations to James & Sarah Wilson profile
UPDATE bookings 
SET guest_id = 'f6ef10f8-b55c-4924-a922-56cc94f887ef'
WHERE guest_phone IN ('9876543220', '+91-9876543220', '+919876543220');

-- Update James & Sarah Wilson's contact arrays to include all phone number variations
UPDATE guests 
SET 
  contact_phones = '["9876543220", "+91-9876543220", "+919876543220"]'::jsonb,
  phone = '+91-9876543220',
  updated_at = now()
WHERE id = 'f6ef10f8-b55c-4924-a922-56cc94f887ef';

-- Remove the duplicate guest profiles that were created for the same phone number
DELETE FROM guests 
WHERE id IN ('112f97c8-b5b7-4099-82d9-67f48c9a3767', 'b2fbe195-8178-4e2a-957e-db9a114a3882');