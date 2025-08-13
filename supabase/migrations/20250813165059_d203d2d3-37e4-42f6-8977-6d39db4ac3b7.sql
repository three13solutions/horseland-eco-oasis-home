-- Fix function search path issues
DROP FUNCTION IF EXISTS public.generate_invoice_number();
DROP FUNCTION IF EXISTS public.calculate_invoice_totals(NUMERIC);
DROP FUNCTION IF EXISTS public.update_invoice_payment_status();

-- Recreate functions with proper search path
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_number INTEGER;
  invoice_num TEXT;
BEGIN
  -- Get the next invoice number (simple sequential)
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'INV-(\d+)') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.invoices
  WHERE invoice_number ~ '^INV-\d+$';
  
  -- Format as INV-00001
  invoice_num := 'INV-' || LPAD(next_number::TEXT, 5, '0');
  
  RETURN invoice_num;
END;
$$;

-- Function to calculate GST and totals
CREATE OR REPLACE FUNCTION public.calculate_invoice_totals(
  p_subtotal NUMERIC
)
RETURNS TABLE(
  subtotal NUMERIC,
  gst_amount NUMERIC,
  total_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  gst_rate NUMERIC := 0.18; -- 18% GST
BEGIN
  RETURN QUERY
  SELECT 
    p_subtotal as subtotal,
    ROUND(p_subtotal * gst_rate, 2) as gst_amount,
    ROUND(p_subtotal + (p_subtotal * gst_rate), 2) as total_amount;
END;
$$;

-- Function to update invoice paid amount and status
CREATE OR REPLACE FUNCTION public.update_invoice_payment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  invoice_total NUMERIC;
  invoice_paid NUMERIC;
BEGIN
  -- Get invoice totals
  SELECT total_amount INTO invoice_total
  FROM public.invoices 
  WHERE id = NEW.invoice_id;
  
  -- Calculate total paid amount for this invoice
  SELECT COALESCE(SUM(amount), 0) INTO invoice_paid
  FROM public.payments 
  WHERE invoice_id = NEW.invoice_id AND status = 'completed';
  
  -- Update invoice
  UPDATE public.invoices 
  SET 
    paid_amount = invoice_paid,
    due_amount = invoice_total - invoice_paid,
    status = CASE 
      WHEN invoice_paid = 0 THEN 'pending'
      WHEN invoice_paid < invoice_total THEN 'partially_paid'
      WHEN invoice_paid >= invoice_total THEN 'paid'
    END,
    updated_at = now()
  WHERE id = NEW.invoice_id;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS update_invoice_on_payment ON public.payments;
CREATE TRIGGER update_invoice_on_payment
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invoice_payment_status();