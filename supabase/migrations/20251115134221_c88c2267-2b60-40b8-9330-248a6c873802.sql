-- Add gender column to guests table
ALTER TABLE public.guests 
ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));

-- Add comment for clarity
COMMENT ON COLUMN public.guests.gender IS 'Guest gender: male, female, other, or prefer_not_to_say';