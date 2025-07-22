-- Update the brand section description to remove "a luxury eco-treat" and start from "Nestled in..."
UPDATE footer_sections 
SET content = jsonb_set(
  content, 
  '{description}', 
  '"Nestled in the heart of India''s only automobile-free hill station, Horseland offers an unparalleled mountain escape where pristine nature meets sophisticated comfort."'
)
WHERE section_key = 'brand';

-- Update the newsletter section to have a more compact, one-line description
UPDATE footer_sections 
SET content = jsonb_set(
  content, 
  '{description}', 
  '"Exclusive mountain stories, seasonal offers, and insider experiences delivered to your inbox"'
)
WHERE section_key = 'newsletter';