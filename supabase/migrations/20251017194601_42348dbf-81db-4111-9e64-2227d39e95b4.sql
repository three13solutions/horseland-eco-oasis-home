-- Update the failed external image with a new working Unsplash URL
UPDATE gallery_images 
SET image_url = 'https://images.unsplash.com/photo-1691453044034-f7d6d3c93998?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
WHERE id = '8c049a5a-d1d5-4b87-bece-8fcc074d5fcf';