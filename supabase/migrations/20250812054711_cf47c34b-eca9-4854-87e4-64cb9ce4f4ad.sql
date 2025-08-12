-- First, create activity types
INSERT INTO activity_types (name, description, is_published) VALUES
('Adventure', 'Thrilling outdoor activities for adrenaline seekers', true),
('Nature', 'Peaceful activities to connect with the natural environment', true),
('Relaxation', 'Calming activities for rest and rejuvenation', true);

-- Now insert the activities with their corresponding activity types
INSERT INTO activities (name, description, duration, location, price, rating, image_url, activity_type_id, age_group, is_published) VALUES
(
  'Horse Riding Trails',
  'Explore Matheran''s red mud trails on horseback with experienced guides.',
  '2 hours',
  'On Property',
  1500,
  4.8,
  'https://images.unsplash.com/photo-1544568100-847a948585b9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  (SELECT id FROM activity_types WHERE name = 'Adventure'),
  'family',
  true
),
(
  'Guided Forest Walks',
  'Discover hidden waterfalls and endemic flora with our naturalist guides.',
  '3 hours',
  'Near Property',
  800,
  4.9,
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  (SELECT id FROM activity_types WHERE name = 'Nature'),
  'family',
  true
),
(
  'Sunset Point Trek',
  'Trek to panoramic viewpoints for breathtaking sunset vistas.',
  '4 hours',
  '2 km away',
  1200,
  4.7,
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  (SELECT id FROM activity_types WHERE name = 'Adventure'),
  'adult',
  true
),
(
  'Bonfire & Stargazing',
  'Evening bonfire with traditional stories and stargazing sessions.',
  '2 hours',
  'On Property',
  600,
  4.6,
  'https://images.unsplash.com/photo-1520637836862-4d197d17c86a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  (SELECT id FROM activity_types WHERE name = 'Relaxation'),
  'family',
  true
),
(
  'Bird Watching Tour',
  'Early morning birding sessions to spot endemic Western Ghats species.',
  '3 hours',
  'Near Property',
  900,
  4.5,
  'https://images.unsplash.com/photo-1444927714506-8492d94b5ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  (SELECT id FROM activity_types WHERE name = 'Nature'),
  'family',
  true
),
(
  'Rock Climbing',
  'Beginner-friendly rock climbing with certified instructors and equipment.',
  '4 hours',
  '5 km away',
  2500,
  4.8,
  'https://images.unsplash.com/photo-1522163182402-834f871fd851?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  (SELECT id FROM activity_types WHERE name = 'Adventure'),
  'adult',
  true
),
(
  'Forest Bathing',
  'Mindful immersion in nature using Japanese Shinrin-yoku techniques for wellness and relaxation.',
  '2 hours',
  'Near Property',
  700,
  4.7,
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  (SELECT id FROM activity_types WHERE name = 'Nature'),
  'family',
  true
);