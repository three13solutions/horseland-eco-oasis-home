CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE prefix text := 'INV-' || to_char(now() AT TIME ZONE 'Asia/Kolkata','YYMMDD') || '-'; n integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(prefix));
  SELECT COALESCE(MAX(substring(invoice_number FROM length(prefix)+1)::int),0)+1 INTO n
  FROM public.invoices WHERE invoice_number ~ ('^' || prefix || '\d+$');
  RETURN prefix || lpad(n::text,4,'0');
END $$;

CREATE OR REPLACE FUNCTION public.set_dated_invoice_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number LIKE 'INV-WEB-%' THEN
    NEW.invoice_number := public.generate_invoice_number();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_dated_invoice_number ON public.invoices;
CREATE TRIGGER trg_set_dated_invoice_number BEFORE INSERT ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.set_dated_invoice_number();

DO $$ DECLARE r record; p text; n int;
BEGIN
  FOR r IN SELECT id, created_at FROM public.invoices WHERE invoice_number LIKE 'INV-WEB-%' ORDER BY created_at LOOP
    p := 'INV-' || to_char(r.created_at AT TIME ZONE 'Asia/Kolkata','YYMMDD') || '-';
    SELECT COALESCE(MAX(substring(invoice_number FROM length(p)+1)::int),0)+1 INTO n
    FROM public.invoices WHERE invoice_number ~ ('^' || p || '\d+$');
    UPDATE public.invoices SET invoice_number = p || lpad(n::text,4,'0') WHERE id = r.id;
  END LOOP;
END $$;