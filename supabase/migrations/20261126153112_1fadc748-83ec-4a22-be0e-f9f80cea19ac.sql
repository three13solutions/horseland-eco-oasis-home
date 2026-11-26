ALTER TABLE distribution_private.payment_intents ADD COLUMN abandoned_at timestamptz, ADD COLUMN abandoned_payment jsonb;

CREATE FUNCTION public.distribution_abandon_unpaid_checkout(p_request_id uuid,p_owner_scope text,p_order jsonb,p_payments jsonb) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p distribution_private.payment_intents%ROWTYPE; r distribution_private.reservations%ROWTYPE;
BEGIN
 PERFORM pg_advisory_xact_lock(823116,1);
 SELECT * INTO p FROM distribution_private.payment_intents WHERE request_id=p_request_id FOR UPDATE;
 IF NOT FOUND OR p.owner_scope IS DISTINCT FROM p_owner_scope THEN RETURN false; END IF;
 IF p.abandoned_at IS NOT NULL AND p.state='released' THEN RETURN true; END IF;
 IF p.state NOT IN('ready','review_required') OR p.provider_order_id IS NULL OR p_order->>'id' IS DISTINCT FROM p.provider_order_id OR p_order->>'receipt' IS DISTINCT FROM p.receipt OR p_order->>'currency' IS DISTINCT FROM p.currency OR jsonb_typeof(p_order->'amount') IS DISTINCT FROM 'number' OR (p_order->>'amount')::numeric<>p.amount_paise OR p_order->>'status' NOT IN('created','attempted') OR jsonb_typeof(p_order->'amount_paid') IS DISTINCT FROM 'number' OR (p_order->>'amount_paid')::numeric<>0 THEN RETURN false; END IF;
 IF jsonb_typeof(p_payments) IS DISTINCT FROM 'array' THEN RETURN false; END IF;
 IF jsonb_array_length(p_payments)>=100 OR EXISTS(SELECT FROM jsonb_array_elements(p_payments) x WHERE x->>'order_id' IS DISTINCT FROM p.provider_order_id OR x->>'status' IS DISTINCT FROM 'failed') THEN RETURN false; END IF;
 SELECT * INTO r FROM distribution_private.reservations WHERE id=p.hold_id FOR UPDATE;
 IF NOT FOUND OR r.state<>'held' OR r.booking_id IS NOT NULL OR r.provider_order_id IS DISTINCT FROM p.provider_order_id OR EXISTS(SELECT FROM distribution_private.captured_payments WHERE order_id=p.provider_order_id) OR EXISTS(SELECT FROM public.bookings WHERE payment_order_id=p.provider_order_id) THEN RETURN false; END IF;
 INSERT INTO distribution_private.closed_checkout_requests(request_id,owner_scope) VALUES(p_request_id,p_owner_scope) ON CONFLICT(request_id) DO NOTHING;
 IF NOT EXISTS(SELECT FROM distribution_private.closed_checkout_requests WHERE request_id=p_request_id AND owner_scope=p_owner_scope) THEN RETURN false; END IF;
 UPDATE distribution_private.payment_intents SET state='released',abandoned_at=now(),review_reason='abandoned_unpaid_order',updated_at=now() WHERE request_id=p_request_id;
 UPDATE distribution_private.reservations SET state='released',released_at=now(),release_reason='owner_cleared_verified_unpaid_checkout' WHERE id=p.hold_id;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.distribution_abandon_unpaid_checkout(uuid,text,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.distribution_abandon_unpaid_checkout(uuid,text,jsonb,jsonb) TO service_role;

ALTER FUNCTION public.distribution_confirm_captured_payment(jsonb,jsonb) SET SCHEMA distribution_private;
ALTER FUNCTION distribution_private.distribution_confirm_captured_payment(jsonb,jsonb) RENAME TO confirm_active_captured_payment;
REVOKE ALL ON FUNCTION distribution_private.confirm_active_captured_payment(jsonb,jsonb) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.distribution_confirm_captured_payment(p_record jsonb,p_payment jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p distribution_private.payment_intents%ROWTYPE;
BEGIN
 PERFORM pg_advisory_xact_lock(823116,1);
 SELECT * INTO p FROM distribution_private.payment_intents WHERE provider_order_id=p_record->>'orderId' FOR UPDATE;
 IF FOUND AND p.abandoned_at IS NOT NULL THEN
  IF distribution_private.intent_record(p)||jsonb_build_object('orderId',p.provider_order_id) IS DISTINCT FROM p_record OR p_payment->>'order_id' IS DISTINCT FROM p.provider_order_id OR p_payment->>'status' IS DISTINCT FROM 'captured' OR p_payment->>'currency' IS DISTINCT FROM p.currency OR jsonb_typeof(p_payment->'amount') IS DISTINCT FROM 'number' OR (p_payment->>'amount')::numeric<>p.amount_paise OR coalesce(p_payment->>'id','') !~ '^pay_[A-Za-z0-9]+$' THEN RAISE EXCEPTION 'Abandoned payment mismatch'; END IF;
  UPDATE distribution_private.payment_intents SET state='review_required',abandoned_payment=p_payment,review_reason='payment_received_after_checkout_cleared',updated_at=now() WHERE request_id=p.request_id;
  RETURN jsonb_build_object('review_required',true,'code','CLEARED_CHECKOUT_PAYMENT_REVIEW');
 END IF;
 RETURN distribution_private.confirm_active_captured_payment(p_record,p_payment);
END $$;
REVOKE ALL ON FUNCTION public.distribution_confirm_captured_payment(jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.distribution_confirm_captured_payment(jsonb,jsonb) TO service_role;

CREATE FUNCTION distribution_private.prevent_abandoned_booking() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(823116,1);
 IF EXISTS(SELECT FROM distribution_private.payment_intents WHERE provider_order_id=NEW.payment_order_id AND abandoned_at IS NOT NULL) THEN RAISE EXCEPTION 'Cleared checkout payment requires hotel review'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER prevent_abandoned_checkout_booking BEFORE INSERT OR UPDATE OF payment_order_id ON public.bookings FOR EACH ROW EXECUTE FUNCTION distribution_private.prevent_abandoned_booking();

CREATE OR REPLACE FUNCTION public.distribution_pending_holds() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin_new() THEN RAISE EXCEPTION 'Admin authorization required' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('hold_id',r.id,'state',r.state,'payment_state',p.state,'category_name',c.name,'room_type_name',t.name,'unit_number',u.unit_number,'check_in',r.check_in,'check_out',r.check_out,'created_at',r.created_at,'provider_order_id',r.provider_order_id,'review_reason',p.review_reason,'abandoned_at',p.abandoned_at,'payment_reference',p.abandoned_payment->>'id') ORDER BY r.created_at),'[]') INTO result
 FROM distribution_private.reservations r LEFT JOIN distribution_private.payment_intents p ON p.hold_id=r.id
 JOIN public.room_units u ON u.id=r.room_unit_id JOIN public.room_types t ON t.id=r.room_type_id JOIN public.room_categories c ON c.id=t.category_id
 WHERE r.state IN('held','review_required') OR p.abandoned_at IS NOT NULL;
 RETURN result;
END $$;

CREATE FUNCTION public.distribution_lookup_webhook_order(p_order_id text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p distribution_private.payment_intents%ROWTYPE;
BEGIN
 SELECT * INTO p FROM distribution_private.payment_intents WHERE provider_order_id=p_order_id;
 IF NOT FOUND THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('record',distribution_private.intent_record(p)||jsonb_build_object('orderId',p.provider_order_id),'provider_order_id',p.provider_order_id,'state',p.state);
END $$;
REVOKE ALL ON FUNCTION public.distribution_lookup_webhook_order(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.distribution_lookup_webhook_order(text) TO service_role;