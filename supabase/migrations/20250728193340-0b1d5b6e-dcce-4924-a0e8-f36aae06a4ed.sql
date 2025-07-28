-- Add missing translation sections
INSERT INTO translation_sections (section_key, section_name, description, sort_order) VALUES 
('experiences', 'Experiences & Activities', 'Activities, experiences, and things to do', 9),
('reviews', 'Guest Reviews', 'Guest testimonials and review content', 10)
ON CONFLICT (section_key) DO NOTHING;