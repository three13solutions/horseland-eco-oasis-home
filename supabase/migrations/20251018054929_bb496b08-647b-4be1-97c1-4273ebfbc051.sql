-- Populate About page with structured content from hardcoded values
UPDATE public.pages
SET structured_content = jsonb_build_object(
  'legacy', jsonb_build_object(
    'heading', 'A Legacy of Hospitality',
    'paragraph1', 'Since our founding in 1987, Horseland has been a sanctuary for those seeking respite from urban life. Nestled in the pristine hills of Matheran, we''ve cultivated an experience that honors both heritage and sustainability.',
    'paragraph2', 'Our commitment to eco-conscious hospitality and authentic wellness has made us a cherished destination for families, couples, and conscious travelers from around the world.',
    'buttonText', 'Our Values',
    'image', 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  'founder', jsonb_build_object(
    'heading', 'Meet Our Founder',
    'name', 'Adi Bharucha',
    'role', 'Founder & Visionary',
    'bio1', 'A visionary hotelier with over 30 years of experience in sustainable tourism, Adi founded Horseland in 1987 with a simple dream: to create a sanctuary where guests could reconnect with nature without compromising on comfort.',
    'bio2', 'His passion for eco-conscious hospitality and deep respect for Matheran''s natural heritage has shaped every aspect of Horseland''s philosophy. Under his leadership, the hotel has become a pioneering example of sustainable comfort in India''s hospitality industry.',
    'quote', 'Hospitality is not just about providing comfort—it''s about creating memories that last a lifetime while preserving the beauty that surrounds us.',
    'image', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  'team', jsonb_build_object(
    'heading', 'The Heart of Horseland',
    'description', 'Our dedicated team brings together decades of hospitality experience, local expertise, and a shared passion for creating unforgettable experiences.',
    'items', jsonb_build_array(
      jsonb_build_object(
        'name', 'Mahesh',
        'role', 'General Manager',
        'description', '15 years of hospitality excellence, ensuring every guest feels like family. Mahesh''s attention to detail and warm leadership style sets the tone for our service culture.',
        'image', 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
      ),
      jsonb_build_object(
        'name', 'Anai Bharucha',
        'role', 'Marketing Director',
        'description', 'Creative marketing strategist with a passion for storytelling. Anai brings Horseland''s unique experiences to life through compelling campaigns and authentic brand connections.',
        'image', 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
      ),
      jsonb_build_object(
        'name', 'Arjun Kulkarni',
        'role', 'Executive Chef',
        'description', 'Master of farm-to-table cuisine, Arjun creates culinary experiences using fresh, local ingredients. His innovative approach celebrates traditional flavors with a modern twist.',
        'image', 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
      ),
      jsonb_build_object(
        'name', 'Vikram Thakur',
        'role', 'Adventure Activities Coordinator',
        'description', 'Born and raised in Matheran, Vikram knows every trail and secret spot. His guided experiences reveal the hidden gems of this magical hill station.',
        'image', 'https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
      ),
      jsonb_build_object(
        'name', 'Ravi Desai',
        'role', 'Sustainability Manager',
        'description', 'Environmental scientist turned hospitality expert, Ravi ensures our operations maintain harmony with nature while delivering exceptional guest experiences.',
        'image', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
      )
    ),
    'quote', 'Together, we don''t just work at Horseland—we live and breathe its values, creating a home away from home for every guest who walks through our doors.'
  ),
  'matheran', jsonb_build_object(
    'heading', 'Discover Matheran',
    'description', 'India''s only vehicle-free hill station, where red mud trails wind through ancient forests and clean mountain air fills your lungs.',
    'feature1', jsonb_build_object(
      'title', 'Vehicle-Free Zone',
      'description', 'Pure air, peaceful walks, and the symphony of nature undisturbed by engines.'
    ),
    'feature2', jsonb_build_object(
      'title', 'Red Mud Trails',
      'description', 'Distinctive rust-colored paths that lead to breathtaking viewpoints and hidden groves.'
    ),
    'feature3', jsonb_build_object(
      'title', 'Forest Living',
      'description', 'Immerse yourself in nature where ancient trees create natural sanctuaries of calm.'
    )
  ),
  'recognition', jsonb_build_object(
    'heading', 'Recognition & Awards',
    'award1', jsonb_build_object(
      'title', 'Eco-Tourism Excellence',
      'source', 'Maharashtra Tourism Board, 2023'
    ),
    'award2', jsonb_build_object(
      'title', 'Sustainable Hospitality',
      'source', 'India Hospitality Awards, 2022'
    ),
    'testimonial', 'A perfect blend of comfort and sustainability in the heart of nature.',
    'testimonialSource', '— Travel + Leisure India'
  )
)
WHERE slug = 'about';

-- If about page doesn't exist, create it
INSERT INTO public.pages (slug, title, subtitle, hero_image, is_published, template_type, structured_content)
SELECT 
  'about',
  'Our Story Began in the Hills',
  'Where time slows down and nature whispers its ancient secrets. Welcome to Horseland Hotel.',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
  true,
  'full-width',
  jsonb_build_object(
    'legacy', jsonb_build_object(
      'heading', 'A Legacy of Hospitality',
      'paragraph1', 'Since our founding in 1987, Horseland has been a sanctuary for those seeking respite from urban life. Nestled in the pristine hills of Matheran, we''ve cultivated an experience that honors both heritage and sustainability.',
      'paragraph2', 'Our commitment to eco-conscious hospitality and authentic wellness has made us a cherished destination for families, couples, and conscious travelers from around the world.',
      'buttonText', 'Our Values',
      'image', 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    ),
    'founder', jsonb_build_object(
      'heading', 'Meet Our Founder',
      'name', 'Adi Bharucha',
      'role', 'Founder & Visionary',
      'bio1', 'A visionary hotelier with over 30 years of experience in sustainable tourism, Adi founded Horseland in 1987 with a simple dream: to create a sanctuary where guests could reconnect with nature without compromising on comfort.',
      'bio2', 'His passion for eco-conscious hospitality and deep respect for Matheran''s natural heritage has shaped every aspect of Horseland''s philosophy. Under his leadership, the hotel has become a pioneering example of sustainable comfort in India''s hospitality industry.',
      'quote', 'Hospitality is not just about providing comfort—it''s about creating memories that last a lifetime while preserving the beauty that surrounds us.',
      'image', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    ),
    'team', jsonb_build_object(
      'heading', 'The Heart of Horseland',
      'description', 'Our dedicated team brings together decades of hospitality experience, local expertise, and a shared passion for creating unforgettable experiences.',
      'items', jsonb_build_array(
        jsonb_build_object(
          'name', 'Mahesh',
          'role', 'General Manager',
          'description', '15 years of hospitality excellence, ensuring every guest feels like family. Mahesh''s attention to detail and warm leadership style sets the tone for our service culture.',
          'image', 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
        ),
        jsonb_build_object(
          'name', 'Anai Bharucha',
          'role', 'Marketing Director',
          'description', 'Creative marketing strategist with a passion for storytelling. Anai brings Horseland''s unique experiences to life through compelling campaigns and authentic brand connections.',
          'image', 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
        ),
        jsonb_build_object(
          'name', 'Arjun Kulkarni',
          'role', 'Executive Chef',
          'description', 'Master of farm-to-table cuisine, Arjun creates culinary experiences using fresh, local ingredients. His innovative approach celebrates traditional flavors with a modern twist.',
          'image', 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
        ),
        jsonb_build_object(
          'name', 'Vikram Thakur',
          'role', 'Adventure Activities Coordinator',
          'description', 'Born and raised in Matheran, Vikram knows every trail and secret spot. His guided experiences reveal the hidden gems of this magical hill station.',
          'image', 'https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
        ),
        jsonb_build_object(
          'name', 'Ravi Desai',
          'role', 'Sustainability Manager',
          'description', 'Environmental scientist turned hospitality expert, Ravi ensures our operations maintain harmony with nature while delivering exceptional guest experiences.',
          'image', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
        )
      ),
      'quote', 'Together, we don''t just work at Horseland—we live and breathe its values, creating a home away from home for every guest who walks through our doors.'
    ),
    'matheran', jsonb_build_object(
      'heading', 'Discover Matheran',
      'description', 'India''s only vehicle-free hill station, where red mud trails wind through ancient forests and clean mountain air fills your lungs.',
      'feature1', jsonb_build_object(
        'title', 'Vehicle-Free Zone',
        'description', 'Pure air, peaceful walks, and the symphony of nature undisturbed by engines.'
      ),
      'feature2', jsonb_build_object(
        'title', 'Red Mud Trails',
        'description', 'Distinctive rust-colored paths that lead to breathtaking viewpoints and hidden groves.'
      ),
      'feature3', jsonb_build_object(
        'title', 'Forest Living',
        'description', 'Immerse yourself in nature where ancient trees create natural sanctuaries of calm.'
      )
    ),
    'recognition', jsonb_build_object(
      'heading', 'Recognition & Awards',
      'award1', jsonb_build_object(
        'title', 'Eco-Tourism Excellence',
        'source', 'Maharashtra Tourism Board, 2023'
      ),
      'award2', jsonb_build_object(
        'title', 'Sustainable Hospitality',
        'source', 'India Hospitality Awards, 2022'
      ),
      'testimonial', 'A perfect blend of comfort and sustainability in the heart of nature.',
      'testimonialSource', '— Travel + Leisure India'
    )
  )
WHERE NOT EXISTS (SELECT 1 FROM public.pages WHERE slug = 'about');