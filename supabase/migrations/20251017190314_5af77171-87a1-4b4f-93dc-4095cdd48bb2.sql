-- Add file hash and metadata columns for duplicate detection
ALTER TABLE gallery_images 
ADD COLUMN IF NOT EXISTS file_hash TEXT,
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS original_filename TEXT,
ADD COLUMN IF NOT EXISTS width INTEGER,
ADD COLUMN IF NOT EXISTS height INTEGER;

-- Add index on file_hash for fast duplicate lookups
CREATE INDEX IF NOT EXISTS idx_gallery_images_file_hash ON gallery_images(file_hash) 
WHERE file_hash IS NOT NULL;

-- Add comment explaining the columns
COMMENT ON COLUMN gallery_images.file_hash IS 'SHA-256 hash of file content for duplicate detection';
COMMENT ON COLUMN gallery_images.file_size IS 'File size in bytes';
COMMENT ON COLUMN gallery_images.original_filename IS 'Original filename when uploaded';
COMMENT ON COLUMN gallery_images.width IS 'Image width in pixels';
COMMENT ON COLUMN gallery_images.height IS 'Image height in pixels';