-- Update booking dates to 2025 (July-September) for better visibility in calendar
UPDATE bookings 
SET 
  check_in = CASE 
    WHEN booking_id = 'BK001' THEN '2025-07-15'
    WHEN booking_id = 'BK002' THEN '2025-07-20' 
    WHEN booking_id = 'BK003' THEN '2025-08-05'
    WHEN booking_id = 'BK004' THEN '2025-08-12'
    WHEN booking_id = 'BK005' THEN '2025-08-30'
    WHEN booking_id = 'BK006' THEN '2025-07-10'
    WHEN booking_id = 'BK007' THEN '2025-09-05'
    WHEN booking_id = 'BK232120' THEN '2025-08-13'
    ELSE check_in
  END,
  check_out = CASE 
    WHEN booking_id = 'BK001' THEN '2025-07-18'
    WHEN booking_id = 'BK002' THEN '2025-07-22'
    WHEN booking_id = 'BK003' THEN '2025-08-08'
    WHEN booking_id = 'BK004' THEN '2025-08-14'
    WHEN booking_id = 'BK005' THEN '2025-09-02'
    WHEN booking_id = 'BK006' THEN '2025-07-12'
    WHEN booking_id = 'BK007' THEN '2025-09-08'
    WHEN booking_id = 'BK232120' THEN '2025-08-15'
    ELSE check_out
  END
WHERE booking_id IN ('BK001', 'BK002', 'BK003', 'BK004', 'BK005', 'BK006', 'BK007', 'BK232120');