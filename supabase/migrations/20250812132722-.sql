-- Migrate existing booking data to create guest profiles and link them
DO $$
DECLARE
    booking_record RECORD;
    existing_guest_id UUID;
    new_guest_id UUID;
BEGIN
    -- Loop through all bookings that don't have a guest_id yet
    FOR booking_record IN 
        SELECT * FROM public.bookings 
        WHERE guest_id IS NULL 
        AND (guest_email IS NOT NULL OR guest_phone IS NOT NULL)
    LOOP
        existing_guest_id := NULL;
        
        -- Try to find existing guest by email first
        IF booking_record.guest_email IS NOT NULL THEN
            SELECT id INTO existing_guest_id 
            FROM public.guests 
            WHERE email = booking_record.guest_email 
            LIMIT 1;
        END IF;
        
        -- If not found by email, try by phone
        IF existing_guest_id IS NULL AND booking_record.guest_phone IS NOT NULL THEN
            SELECT id INTO existing_guest_id 
            FROM public.guests 
            WHERE phone = booking_record.guest_phone 
            LIMIT 1;
        END IF;
        
        -- If guest exists, link the booking
        IF existing_guest_id IS NOT NULL THEN
            UPDATE public.bookings 
            SET guest_id = existing_guest_id 
            WHERE id = booking_record.id;
        ELSE
            -- Create new guest profile
            INSERT INTO public.guests (
                first_name,
                last_name,
                email,
                phone
            ) VALUES (
                COALESCE(split_part(booking_record.guest_name, ' ', 1), booking_record.guest_name),
                NULLIF(substring(booking_record.guest_name from position(' ' in booking_record.guest_name) + 1), ''),
                booking_record.guest_email,
                booking_record.guest_phone
            ) RETURNING id INTO new_guest_id;
            
            -- Link the booking to the new guest
            UPDATE public.bookings 
            SET guest_id = new_guest_id 
            WHERE id = booking_record.id;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Migration completed: Existing bookings have been linked to guest profiles';
END $$;