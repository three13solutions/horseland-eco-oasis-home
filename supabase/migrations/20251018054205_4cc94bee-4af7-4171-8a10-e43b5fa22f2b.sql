-- Add structured_content jsonb field to pages table for comprehensive page content
ALTER TABLE public.pages 
ADD COLUMN IF NOT EXISTS structured_content jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.pages.structured_content IS 'Structured JSON content for all page sections, features, team members, etc. Each page can define its own structure.';
