-- Update gallery_images with working bonfire image
UPDATE gallery_images 
SET image_url = 'https://images.unsplash.com/photo-1729203264988-8bdcf2dd8da8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
WHERE id = '8c049a5a-d1d5-4b87-bece-8fcc074d5fcf';

-- Update activities table with the same image
UPDATE activities
SET image = 'https://images.unsplash.com/photo-1729203264988-8bdcf2dd8da8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    media_urls = '["https://images.unsplash.com/photo-1729203264988-8bdcf2dd8da8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"]'::jsonb
WHERE title = 'Bonfire & Stargazing';