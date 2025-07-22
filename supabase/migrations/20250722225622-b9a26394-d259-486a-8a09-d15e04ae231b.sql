-- Update the policies section links to point to the policies page with proper anchors
UPDATE footer_sections 
SET content = jsonb_build_object(
  'links', jsonb_build_array(
    jsonb_build_object('title', 'Terms & Conditions', 'href', '/policies#terms'),
    jsonb_build_object('title', 'Privacy Policy', 'href', '/policies#privacy'),
    jsonb_build_object('title', 'Refund Policy', 'href', '/policies#refund'),
    jsonb_build_object('title', 'Cancellation Policy', 'href', '/policies#cancellation')
  )
)
WHERE section_key = 'policies';