DO $m$ DECLARE d text; BEGIN
 d := pg_get_functiondef('public.room_rate_management_grid'::regproc);
 d := replace(d, 'ORDER BY sort_order,name) FROM room_categories', 'ORDER BY display_order,name) FROM room_categories');
 EXECUTE d;
END $m$;