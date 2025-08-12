-- Assign room units to bookings that don't have them
UPDATE bookings 
SET room_unit_id = CASE 
  WHEN booking_id = 'BK232120' THEN '68110ef8-c32b-4e81-b860-ccf072c7c95c' -- Assign to Traveller (unit 113)
  WHEN booking_id = 'BK005' THEN 'd4997c84-cb8e-4b0a-9424-64ed59e7fdaa' -- Assign to Bucephalus Barracks (unit 111 A/B)  
  ELSE room_unit_id
END
WHERE booking_id IN ('BK232120', 'BK005') AND room_unit_id IS NULL;