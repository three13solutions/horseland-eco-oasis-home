-- Add missing translations for experiences, packages, gallery, journal, and hero sections
INSERT INTO translations (key, value, language_code, section) VALUES
-- Hero section translations
('hero.title', 'Escape to Nature''s Embrace', 'en', 'hero'),
('hero.subtitle', 'A mindful retreat in Matheran''s car-free eco zone', 'en', 'hero'),
('hero.checkIn', 'Check-in', 'en', 'hero'),
('hero.checkOut', 'Check-out', 'en', 'hero'),
('hero.guests', 'Guests', 'en', 'hero'),
('hero.exploreStay', 'Explore Stay', 'en', 'hero'),

-- Experiences section translations
('experiences.title', 'Curated', 'en', 'experiences'),
('experiences.titleHighlight', 'Experiences', 'en', 'experiences'),
('experiences.subtitle', 'Discover the essence of Matheran through thoughtfully designed experiences that connect you with nature, culture, and wellness.', 'en', 'experiences'),
('experiences.explore', 'Explore', 'en', 'experiences'),
('experiences.premiumExperience', 'Premium Experience', 'en', 'experiences'),

('experiences.activities.title', 'Mountain Adventures', 'en', 'experiences'),
('experiences.activities.subtitle', 'Embrace the Wild', 'en', 'experiences'),
('experiences.activities.description', 'From horseback rides along red-earth trails to guided forest walks and heritage toy train journeys, discover Matheran''s natural wonders through curated adventures.', 'en', 'experiences'),

('experiences.dining.title', 'Culinary Excellence', 'en', 'experiences'),
('experiences.dining.subtitle', 'Buffet Only, Cooked with Purpose', 'en', 'experiences'),
('experiences.dining.description', 'Our zero-waste kitchen philosophy meets gourmet excellence. Savor locally-sourced ingredients transformed into memorable dining experiences with panoramic mountain views.', 'en', 'experiences'),

('experiences.wellness.title', 'Spa & Wellness', 'en', 'experiences'),
('experiences.wellness.subtitle', 'Rejuvenate Your Soul', 'en', 'experiences'),
('experiences.wellness.description', 'Ancient Ayurvedic traditions meet modern wellness techniques in our mountain spa. Experience therapeutic treatments designed to restore balance and vitality.', 'en', 'experiences'),

-- Packages section translations
('packages.title', 'Tailored Experiences for Every Journey', 'en', 'packages'),
('packages.subtitle', 'Choose from our thoughtfully curated packages designed to create unforgettable memories in Matheran''s pristine wilderness.', 'en', 'packages'),

('packages.romantic.tag', 'Romantic', 'en', 'packages'),
('packages.romantic.title', 'Romantic Getaway', 'en', 'packages'),
('packages.romantic.description', 'Perfect for couples seeking intimate moments amidst breathtaking mountain landscapes.', 'en', 'packages'),

('packages.family.tag', 'Family', 'en', 'packages'),
('packages.family.title', 'Family Adventure', 'en', 'packages'),
('packages.family.description', 'Create lasting memories with activities designed for every member of your family.', 'en', 'packages'),

('packages.corporate.tag', 'Corporate', 'en', 'packages'),
('packages.corporate.title', 'Corporate Retreat', 'en', 'packages'),
('packages.corporate.description', 'Inspire your team with unique team-building experiences in nature''s tranquil setting.', 'en', 'packages'),

('packages.adventure.tag', 'Adventure', 'en', 'packages'),
('packages.adventure.title', 'Adventure Package', 'en', 'packages'),
('packages.adventure.description', 'For thrill-seekers who want to explore Matheran''s wilderness through exciting outdoor activities.', 'en', 'packages');