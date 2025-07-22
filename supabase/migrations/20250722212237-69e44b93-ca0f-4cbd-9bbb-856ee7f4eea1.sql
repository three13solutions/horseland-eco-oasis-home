UPDATE footer_sections 
SET content = jsonb_set(
  jsonb_set(content, '{title}', '"Mountain Mailers"'),
  '{description}', '"Musings from the mountains, delivered monthly"'
)
WHERE section_key = 'newsletter';