-- Update all room units to include the safety deposit note
UPDATE public.room_units
SET notes = CASE
  WHEN notes IS NULL OR notes = '' THEN 'No In-Room Safes; Generally Safety Deposit is available at Reception with Receipt.'
  WHEN notes NOT LIKE '%Safety Deposit%' THEN notes || E'\n\nNo In-Room Safes; Generally Safety Deposit is available at Reception with Receipt.'
  ELSE notes
END
WHERE notes IS NULL 
   OR notes = '' 
   OR notes NOT LIKE '%Safety Deposit%';