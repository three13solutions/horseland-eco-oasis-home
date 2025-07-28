-- Add missing package translations
INSERT INTO translations (key, value, language_code, section) VALUES
('packages.corporate.tag', 'Corporate', 'en', 'packages'),
('packages.corporate.title', 'Corporate Retreat', 'en', 'packages'),
('packages.corporate.description', 'Inspire your team with unique team-building experiences in nature''s tranquil setting.', 'en', 'packages'),
('packages.adventure.tag', 'Adventure', 'en', 'packages'),
('packages.adventure.title', 'Adventure Package', 'en', 'packages'),
('packages.adventure.description', 'For thrill-seekers who want to explore Matheran''s wilderness through exciting outdoor activities.', 'en', 'packages')
ON CONFLICT (language_code, section, key) DO NOTHING;