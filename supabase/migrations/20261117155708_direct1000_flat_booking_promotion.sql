ALTER TABLE public.website_promotions DROP CONSTRAINT website_promotions_code_check, DROP CONSTRAINT website_promotions_amount_per_night_check;
ALTER TABLE public.website_promotions ADD COLUMN amount_per_booking numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.website_promotions ADD CONSTRAINT website_promotions_discount_policy_check CHECK ((code='EP300' AND amount_per_night=300 AND amount_per_booking=0) OR (code='DIRECT1000' AND amount_per_night=0 AND amount_per_booking=1000));
INSERT INTO public.website_promotions(code,label,amount_per_night,amount_per_booking,is_active) VALUES ('DIRECT1000','₹1,000 off accommodation per booking',0,1000,false);
