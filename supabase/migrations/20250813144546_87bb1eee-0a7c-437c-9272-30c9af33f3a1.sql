-- Fix the immediate room conflict by moving John k to an available room
UPDATE bookings 
SET room_unit_id = '010104e1-5390-4ab2-a5d9-828d68304e1e', -- Move to room 110 (Comanche's Den)
    updated_at = now()
WHERE booking_id = 'BK232120' 
AND guest_name = 'John k';