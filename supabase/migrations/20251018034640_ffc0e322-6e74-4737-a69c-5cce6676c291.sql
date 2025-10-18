-- Delete all related records first to avoid foreign key violations

-- Delete all payments
DELETE FROM public.payments;

-- Delete all invoices
DELETE FROM public.invoices;

-- Clear guest credit note references to bookings
UPDATE public.guest_credit_notes 
SET original_booking_id = NULL, redeemed_booking_id = NULL
WHERE original_booking_id IS NOT NULL OR redeemed_booking_id IS NOT NULL;

-- Clear booking waitlist references
UPDATE public.booking_waitlist 
SET original_booking_attempt_id = NULL
WHERE original_booking_attempt_id IS NOT NULL;

-- Finally delete all bookings
DELETE FROM public.bookings;