-- Create invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Amounts
  subtotal_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  gst_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  due_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partially_paid', 'paid', 'cancelled')),
  
  -- Invoice details
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Create index on booking_id for faster queries
  CONSTRAINT unique_booking_invoice UNIQUE(booking_id)
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  
  -- Payment details
  amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'upi', 'net_banking', 'razorpay')),
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Transaction details
  transaction_reference TEXT,
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  
  -- Admin details
  received_by UUID REFERENCES auth.users(id),
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create policies for invoices
CREATE POLICY "Admin users can manage all invoices" 
ON public.invoices 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM admin_profiles 
  WHERE admin_profiles.user_id = auth.uid()
));

-- Create policies for payments
CREATE POLICY "Admin users can manage all payments" 
ON public.payments 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM admin_profiles 
  WHERE admin_profiles.user_id = auth.uid()
));

-- Add triggers for updated_at
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate GST and totals
CREATE OR REPLACE FUNCTION public.calculate_invoice_totals(
  p_subtotal NUMERIC
)
RETURNS TABLE(
  subtotal NUMERIC,
  gst_amount NUMERIC,
  total_amount NUMERIC
) AS $$
DECLARE
  gst_rate NUMERIC := 0.18; -- 18% GST
BEGIN
  RETURN QUERY
  SELECT 
    p_subtotal as subtotal,
    ROUND(p_subtotal * gst_rate, 2) as gst_amount,
    ROUND(p_subtotal + (p_subtotal * gst_rate), 2) as total_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update invoice paid amount and status
CREATE OR REPLACE FUNCTION public.update_invoice_payment_status()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update invoice status when payment is made
CREATE TRIGGER update_invoice_on_payment
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invoice_payment_status();