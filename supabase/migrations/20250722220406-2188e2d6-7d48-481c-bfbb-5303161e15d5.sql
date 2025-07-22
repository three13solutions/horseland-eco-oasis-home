-- Update the policies section with the specific order and content
UPDATE footer_sections 
SET content = jsonb_build_object(
  'links', jsonb_build_array(
    jsonb_build_object('title', 'Terms & Conditions', 'href', '/terms'),
    jsonb_build_object('title', 'Privacy Policy', 'href', '/privacy'),
    jsonb_build_object('title', 'Refund Policy', 'href', '/refund'),
    jsonb_build_object('title', 'Cancellation Policy', 'href', '/cancellation')
  )
)
WHERE section_key = 'policies';