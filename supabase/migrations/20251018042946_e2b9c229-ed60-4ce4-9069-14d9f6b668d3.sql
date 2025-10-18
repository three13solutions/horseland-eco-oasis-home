-- Step 1: Update any gallery_images that reference the old content-type dining category
UPDATE gallery_images 
SET category_id = 'f7b4e3e5-7a90-40d9-9849-1d8a232a7c23'
WHERE category_id = '2c714025-dffc-4fb6-8cf3-7d40596a0d88';

-- Step 2: Update any image_categories links that reference the old category
UPDATE image_categories 
SET category_id = 'f7b4e3e5-7a90-40d9-9849-1d8a232a7c23'
WHERE category_id = '2c714025-dffc-4fb6-8cf3-7d40596a0d88';

-- Step 3: Now delete the old content-type dining category
DELETE FROM gallery_categories 
WHERE id = '2c714025-dffc-4fb6-8cf3-7d40596a0d88' AND category_type = 'content';

-- Step 4: Update the gallery category slug to 'dining'
UPDATE gallery_categories 
SET slug = 'dining'
WHERE id = 'f7b4e3e5-7a90-40d9-9849-1d8a232a7c23';