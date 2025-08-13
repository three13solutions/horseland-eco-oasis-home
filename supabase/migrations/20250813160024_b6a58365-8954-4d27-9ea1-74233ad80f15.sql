-- Add payment tracking fields to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS payment_id text,
ADD COLUMN IF NOT EXISTS payment_order_id text;