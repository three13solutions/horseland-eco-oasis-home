CREATE OR REPLACE FUNCTION public.distribution_confirm_captured_payment(p_record jsonb, p_payment jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE p distribution_private.payment_intents%ROWTYPE; r distribution_private.reservations%ROWTYPE;
 proof distribution_private.captured_payments%ROWTYPE; q jsonb; g jsonb; req jsonb; v jsonb; gid uuid; bid uuid; inv uuid; public_id text; v_email text; v_phone text; b public.bookings%ROWTYPE;
BEGIN
 PERFORM pg_advisory_xact_lock(823116,1);
 SELECT * INTO p FROM distribution_private.payment_intents WHERE provider_order_id=p_record->>'orderId' FOR UPDATE;
 IF NOT FOUND OR distribution_private.intent_record(p)||jsonb_build_object('orderId',p.provider_order_id) IS DISTINCT FROM p_record THEN RAISE EXCEPTION 'Bound payment checkout mismatch'; END IF;
 IF p_payment IS NULL OR p_payment->>'status' IS DISTINCT FROM 'captured' OR p_payment->>'order_id' IS DISTINCT FROM p.provider_order_id OR p_payment->>'currency' IS DISTINCT FROM p.currency
  OR coalesce(p_payment->>'id','') !~ '^pay_[A-Za-z0-9]+$' OR jsonb_typeof(p_payment->'amount') IS DISTINCT FROM 'number' OR (p_payment->>'amount')::numeric<>p.amount_paise OR coalesce((p_payment->>'amount_refunded')::numeric,0)<>0 THEN RAISE EXCEPTION 'Captured payment mismatch'; END IF;
 SELECT * INTO proof FROM distribution_private.captured_payments WHERE payment_id=p_payment->>'id' OR order_id=p.provider_order_id FOR UPDATE;
 IF FOUND THEN
  IF proof.payment_id<>p_payment->>'id' OR proof.order_id<>p.provider_order_id OR proof.hold_id<>p.hold_id THEN RAISE EXCEPTION 'Payment already allocated to another booking'; END IF;
  SELECT * INTO b FROM public.bookings WHERE id=proof.booking_id;
  IF NOT FOUND OR b.payment_status<>'confirmed' THEN RAISE EXCEPTION 'Previously confirmed payment requires staff reconciliation'; END IF;
  RETURN jsonb_build_object('bookingId',b.booking_id,'unitId',b.room_unit_id,'invoiceId',proof.invoice_id,'reused',true);
 END IF;
 IF p.state NOT IN('ready','review_required') THEN RAISE EXCEPTION 'Payment intent requires reconciliation'; END IF;
 SELECT * INTO r FROM distribution_private.reservations WHERE id=p.hold_id FOR UPDATE;
 IF NOT FOUND OR r.state<>'held' OR r.check_out<=(now() AT TIME ZONE 'Asia/Kolkata')::date OR r.provider_order_id IS DISTINCT FROM p.provider_order_id THEN RAISE EXCEPTION 'Payable room hold is missing; do not collect another payment'; END IF;
 q:=p.intent->'quoteSnapshot'; req:=q->'request'; v:=q->'variant';
 g:=coalesce(p.intent#>'{bookingMetadata,guest}',q->'guest');
 IF jsonb_typeof(q) IS DISTINCT FROM 'object' OR jsonb_typeof(g) IS DISTINCT FROM 'object'
  OR q->>'currency' IS DISTINCT FROM 'INR' OR (round((q->>'total_amount')::numeric*100)<>p.amount_paise AND p.amount_paise<>100)
  OR (req->>'room_type_id')::uuid<>r.room_type_id OR (req->>'check_in')::date<>r.check_in OR (req->>'check_out')::date<>r.check_out
  OR coalesce(length(btrim(g->>'first_name')),0) NOT BETWEEN 1 AND 100 OR coalesce(length(g->>'last_name'),0)>100
  OR (q->>'subtotal')::numeric+(q->>'tax_amount')::numeric<>(q->>'total_amount')::numeric THEN RAISE EXCEPTION 'Stored booking snapshot is incomplete or inconsistent'; END IF;
 IF EXISTS(SELECT FROM public.bookings WHERE payment_id=p_payment->>'id' OR payment_order_id=p.provider_order_id) THEN RAISE EXCEPTION 'Payment already has a legacy booking; reconcile instead of duplicating'; END IF;
 v_email:=nullif(btrim(g->>'email'),'');v_phone:=nullif(btrim(g->>'phone'),'');
 SELECT id INTO gid FROM public.guests WHERE (v_email IS NOT NULL AND lower(public.guests.email)=lower(v_email)) OR (v_phone IS NOT NULL AND public.guests.phone=v_phone) ORDER BY created_at,id LIMIT 1;
 IF gid IS NULL THEN
  INSERT INTO public.guests(first_name,last_name,email,phone,gender) VALUES(btrim(g->>'first_name'),coalesce(g->>'last_name',''),v_email,v_phone,nullif(g->>'gender','')) RETURNING id INTO gid;
 END IF;
 bid:=gen_random_uuid();public_id:='HL-'||replace(bid::text,'-','');inv:=gen_random_uuid();
 UPDATE distribution_private.reservations SET booking_id=bid,state='confirmed' WHERE id=r.id;
 INSERT INTO public.bookings(id,booking_id,guest_name,guest_email,guest_phone,room_type_id,room_unit_id,check_in,check_out,guests_count,total_amount,payment_status,notes,guest_id,payment_method,payment_id,payment_order_id,meal_plan_code,cancellation_policy_code,rate_breakdown,room_cost,meal_cost,selected_meals,selected_activities,selected_spa_services,selected_bedding)
 VALUES(bid,public_id,btrim((g->>'first_name')||' '||coalesce(g->>'last_name','')),v_email,v_phone,r.room_type_id,r.room_unit_id,r.check_in,r.check_out,
 (req->>'adults_count')::integer+(req->>'children_count')::integer+(req->>'infants_count')::integer,p.amount_paise::numeric/100,'confirmed',coalesce(p.intent#>>'{bookingMetadata,notes}',q->>'booking_notes'),gid,'razorpay',p_payment->>'id',p.provider_order_id,req->>'meal_plan_code',req->>'cancellation_policy_code',v||jsonb_build_object('adults_count',req->'adults_count','children_count',req->'children_count','infants_count',req->'infants_count','validated_quote',q),(v->>'room_rate')::numeric,(v->>'meal_cost')::numeric,
 coalesce((SELECT jsonb_agg(x) FROM jsonb_array_elements(q->'extras') x WHERE x->>'type'='meal'),'[]'),coalesce((SELECT jsonb_agg(x) FROM jsonb_array_elements(q->'extras') x WHERE x->>'type'='activity'),'[]'),coalesce((SELECT jsonb_agg(x) FROM jsonb_array_elements(q->'extras') x WHERE x->>'type'='spa'),'[]'),coalesce((SELECT jsonb_agg(x) FROM jsonb_array_elements(q->'extras') x WHERE x->>'type'='bedding'),'[]'));
 INSERT INTO public.invoices(id,booking_id,invoice_number,subtotal_amount,gst_amount,total_amount,paid_amount,due_amount,status,line_items)
 VALUES(inv,bid,'INV-WEB-'||replace(inv::text,'-',''),(q->>'subtotal')::numeric,(q->>'tax_amount')::numeric,p.amount_paise::numeric/100,0,p.amount_paise::numeric/100,'pending',jsonb_build_array(jsonb_build_object('description','Accommodation, selected meal plan and extras','amount',q->'subtotal')));
 INSERT INTO public.payments(invoice_id,booking_id,amount,payment_method,transaction_reference,razorpay_payment_id,razorpay_order_id,status)
 VALUES(inv,bid,p.amount_paise::numeric/100,'razorpay',p_payment->>'id',p_payment->>'id',p.provider_order_id,'completed');
 UPDATE public.invoices SET paid_amount=total_amount,due_amount=0,status='paid' WHERE id=inv;
 IF nullif(g->>'id_type','') IS NOT NULL AND nullif(g->>'id_number','') IS NOT NULL THEN
  INSERT INTO public.guest_identity_documents(guest_id,document_type,document_number,is_verified) SELECT gid,g->>'id_type',g->>'id_number',false WHERE NOT EXISTS(SELECT FROM public.guest_identity_documents WHERE guest_id=gid AND document_type=g->>'id_type' AND document_number=g->>'id_number');
 END IF;
 INSERT INTO distribution_private.captured_payments(payment_id,order_id,hold_id,booking_id,invoice_id,amount_paise,currency) VALUES(p_payment->>'id',p.provider_order_id,r.id,bid,inv,p.amount_paise,'INR');
 UPDATE distribution_private.payment_intents SET state='confirmed',updated_at=now() WHERE request_id=p.request_id;
 RETURN jsonb_build_object('bookingId',public_id,'unitId',r.room_unit_id,'invoiceId',inv,'reused',false);
END $function$;