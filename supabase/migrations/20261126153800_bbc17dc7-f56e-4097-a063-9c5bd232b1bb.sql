CREATE OR REPLACE FUNCTION public.distribution_abandon_unpaid_checkout(p_request_id uuid,p_owner_scope text,p_order jsonb,p_payments jsonb) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p distribution_private.payment_intents%ROWTYPE; r distribution_private.reservations%ROWTYPE;
BEGIN
 PERFORM pg_advisory_xact_lock(823116,1);
 SELECT * INTO p FROM distribution_private.payment_intents WHERE request_id=p_request_id FOR UPDATE;
 IF NOT FOUND OR p.owner_scope IS DISTINCT FROM p_owner_scope THEN RETURN false; END IF;
 IF p.abandoned_at IS NOT NULL AND p.state='released' THEN RETURN true; END IF;
 IF p.state NOT IN('ready','review_required') OR p.provider_order_id IS NULL OR p_order->>'id' IS DISTINCT FROM p.provider_order_id OR p_order->>'receipt' IS DISTINCT FROM p.receipt OR p_order->>'currency' IS DISTINCT FROM p.currency OR jsonb_typeof(p_order->'amount') IS DISTINCT FROM 'number' OR (p_order->>'amount')::numeric<>p.amount_paise OR coalesce(p_order->>'status','') NOT IN('created','attempted') OR jsonb_typeof(p_order->'amount_paid') IS DISTINCT FROM 'number' OR (p_order->>'amount_paid')::numeric<>0 THEN RETURN false; END IF;
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
CREATE OR REPLACE FUNCTION public.distribution_find_bound_order(p_order_id text,p_owner_scope text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p distribution_private.payment_intents%ROWTYPE;
BEGIN
 SELECT * INTO p FROM distribution_private.payment_intents WHERE provider_order_id=p_order_id AND owner_scope=p_owner_scope;
 IF NOT FOUND OR (p.state NOT IN('ready','confirmed') AND p.abandoned_at IS NULL) THEN RAISE EXCEPTION 'Bound order not available for this checkout'; END IF;
 RETURN distribution_private.intent_record(p)||jsonb_build_object('orderId',p.provider_order_id);
END $$;
CREATE FUNCTION public.distribution_checkout_session_available(p_request_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF p_request_id IS NULL THEN RETURN false; END IF;
 PERFORM pg_advisory_xact_lock(823116,1);
 RETURN NOT EXISTS(SELECT FROM distribution_private.payment_intents WHERE request_id=p_request_id) AND NOT EXISTS(SELECT FROM distribution_private.reservations WHERE request_id=p_request_id) AND NOT EXISTS(SELECT FROM distribution_private.closed_checkout_requests WHERE request_id=p_request_id);
END $$;
REVOKE ALL ON FUNCTION public.distribution_checkout_session_available(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.distribution_checkout_session_available(uuid) TO service_role;