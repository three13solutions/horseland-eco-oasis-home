-- Insert sample activities data
INSERT INTO activities (title, description, distance, image, booking_required, tags, is_active) VALUES
(
  'Horse Riding Trails',
  'Explore Matheran''s red mud trails on horseback with experienced guides.',
  'On Property',
  'https://images.unsplash.com/photo-1544568100-847a948585b9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  true,
  '["adventure", "family"]'::jsonb,
  true
),
(
  'Guided Forest Walks',
  'Discover hidden waterfalls and endemic flora with our naturalist guides.',
  'Near Property',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  true,
  '["nature", "family"]'::jsonb,
  true
),
(
  'Sunset Point Trek',
  'Trek to panoramic viewpoints for breathtaking sunset vistas.',
  '2 km away',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  true,
  '["adventure"]'::jsonb,
  true
),
(
  'Bonfire & Stargazing',
  'Evening bonfire with traditional stories and stargazing sessions.',
  'On Property',
  'https://images.unsplash.com/photo-1520637836862-4d197d17c86a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  false,
  '["relaxation", "family"]'::jsonb,
  true
),
(
  'Bird Watching Tour',
  'Early morning birding sessions to spot endemic Western Ghats species.',
  'Near Property',
  'https://images.unsplash.com/photo-1444927714506-8492d94b5ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  true,
  '["nature", "family"]'::jsonb,
  true
),
(
  'Rock Climbing',
  'Beginner-friendly rock climbing with certified instructors and equipment.',
  '5 km away',
  'https://images.unsplash.com/photo-1522163182402-834f871fd851?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  true,
  '["adventure"]'::jsonb,
  true
),
(
  'Forest Bathing',
  'Mindful immersion in nature using Japanese Shinrin-yoku techniques for wellness.',
  'Near Property',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  false,
  '["nature", "family"]'::jsonb,
  true
);