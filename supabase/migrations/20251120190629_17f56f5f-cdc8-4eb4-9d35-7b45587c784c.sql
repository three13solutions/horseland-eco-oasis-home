-- Create GST configuration table
CREATE TABLE public.gst_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tier_name TEXT NOT NULL,
  min_amount NUMERIC NOT NULL DEFAULT 0,
  max_amount NUMERIC,
  gst_percentage NUMERIC NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gst_tiers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active GST tiers"
ON public.gst_tiers
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admin users can manage GST tiers"
ON public.gst_tiers
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Add trigger for updated_at
CREATE TRIGGER update_gst_tiers_updated_at
BEFORE UPDATE ON public.gst_tiers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default GST tiers
INSERT INTO public.gst_tiers (tier_name, min_amount, max_amount, gst_percentage, display_order) VALUES
('Standard Rate (≤ ₹7,500)', 0, 7500, 5, 1),
('Premium Rate (> ₹7,500)', 7500.01, NULL, 18, 2);

-- Create function to get applicable GST rate
CREATE OR REPLACE FUNCTION public.get_gst_rate_for_amount(p_amount NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_gst_rate NUMERIC;
BEGIN
  SELECT gst_percentage INTO v_gst_rate
  FROM gst_tiers
  WHERE is_active = true
    AND p_amount >= min_amount
    AND (max_amount IS NULL OR p_amount <= max_amount)
  ORDER BY display_order
  LIMIT 1;
  
  -- Default to 18% if no tier found
  RETURN COALESCE(v_gst_rate, 18);
END;
$$;

-- Update the calculate_invoice_totals function to use tiered GST
CREATE OR REPLACE FUNCTION public.calculate_invoice_totals(
  p_subtotal NUMERIC,
  p_per_night_rate NUMERIC DEFAULT NULL
)
RETURNS TABLE(subtotal NUMERIC, gst_amount NUMERIC, total_amount NUMERIC, gst_rate NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_gst_rate NUMERIC;
  v_rate_for_calculation NUMERIC;
BEGIN
  -- Use per_night_rate if provided, otherwise use subtotal
  v_rate_for_calculation := COALESCE(p_per_night_rate, p_subtotal);
  
  -- Get the applicable GST rate based on the per-night rate
  v_gst_rate := get_gst_rate_for_amount(v_rate_for_calculation) / 100;
  
  RETURN QUERY
  SELECT 
    p_subtotal as subtotal,
    ROUND(p_subtotal * v_gst_rate, 2) as gst_amount,
    ROUND(p_subtotal + (p_subtotal * v_gst_rate), 2) as total_amount,
    (v_gst_rate * 100) as gst_rate;
END;
$$;