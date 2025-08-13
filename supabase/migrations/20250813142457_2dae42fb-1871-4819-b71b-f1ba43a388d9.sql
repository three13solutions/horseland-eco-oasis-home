-- Consolidate all booking contact information into guest contact arrays
WITH booking_contacts AS (
  SELECT 
    g.id as guest_id,
    COALESCE(g.contact_emails, '[]'::jsonb) as current_emails,
    COALESCE(g.contact_phones, '[]'::jsonb) as current_phones,
    ARRAY_AGG(DISTINCT b.guest_email) FILTER (WHERE b.guest_email IS NOT NULL AND b.guest_email != '') as booking_emails,
    ARRAY_AGG(DISTINCT b.guest_phone) FILTER (WHERE b.guest_phone IS NOT NULL AND b.guest_phone != '') as booking_phones
  FROM guests g
  LEFT JOIN bookings b ON g.id = b.guest_id
  GROUP BY g.id, g.contact_emails, g.contact_phones
),
merged_contacts AS (
  SELECT 
    guest_id,
    -- Merge emails: current + booking emails, removing duplicates
    (
      SELECT jsonb_agg(DISTINCT email_val)
      FROM (
        SELECT jsonb_array_elements_text(current_emails) as email_val
        UNION
        SELECT UNNEST(COALESCE(booking_emails, ARRAY[]::text[])) as email_val
      ) all_emails
      WHERE email_val IS NOT NULL AND email_val != ''
    ) as final_emails,
    -- Merge phones: current + booking phones, removing duplicates  
    (
      SELECT jsonb_agg(DISTINCT phone_val)
      FROM (
        SELECT jsonb_array_elements_text(current_phones) as phone_val
        UNION
        SELECT UNNEST(COALESCE(booking_phones, ARRAY[]::text[])) as phone_val
      ) all_phones
      WHERE phone_val IS NOT NULL AND phone_val != ''
    ) as final_phones
  FROM booking_contacts
)
UPDATE guests 
SET 
  contact_emails = COALESCE(merged_contacts.final_emails, '[]'::jsonb),
  contact_phones = COALESCE(merged_contacts.final_phones, '[]'::jsonb),
  updated_at = now()
FROM merged_contacts
WHERE guests.id = merged_contacts.guest_id
AND (
  guests.contact_emails != COALESCE(merged_contacts.final_emails, '[]'::jsonb) OR
  guests.contact_phones != COALESCE(merged_contacts.final_phones, '[]'::jsonb)
);