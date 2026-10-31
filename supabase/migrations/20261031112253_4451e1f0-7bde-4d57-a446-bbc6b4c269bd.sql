CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
ALTER TABLE public.email_templates ADD COLUMN trigger_event text NOT NULL DEFAULT 'booking_confirmed', ADD COLUMN trigger_enabled boolean NOT NULL DEFAULT true, ADD COLUMN offset_hours integer NOT NULL DEFAULT 0;
UPDATE public.email_templates SET name='Booking Confirmation' WHERE template_key='booking_confirmation';
INSERT INTO public.email_templates(template_key,name,subject,html_body,is_active,trigger_event,trigger_enabled,offset_hours)
SELECT k,n,n||' — Horseland Hotel — {{booking_id}}', '<html><body><h1>Horseland Hotel</h1><h2>'||n||'</h2><p>Dear {{guest_name}},</p><p>'||message||'</p><p>Booking: {{booking_id}}<br>Room: {{room_type}}<br>Check-in: {{check_in}}<br>Check-out: {{check_out}}<br>Amount: {{total_amount}}<br>Payment: {{payment_amount}}<br>Payment reference: {{payment_id}}</p><p>Warm regards,<br>Horseland Hotel</p></body></html>',false,e,true,h
FROM (VALUES
('booking_cancellation','Booking Cancellation','booking_cancelled',0,'Your booking has been cancelled. Please contact us with any questions.'),
('booking_reminder','Booking Reminder','before_check_in',72,'Your stay is coming up. We look forward to welcoming you.'),
('payment_confirmation','Payment Confirmation','payment_completed',0,'Your payment has been recorded successfully.'),
('payment_failed','Payment Failed','payment_failed',0,'Your payment was unsuccessful. Please contact us before making another payment.'),
('payment_pending','Payment Pending','payment_pending',0,'Payment for your booking is pending. Please contact us for assistance.'),
('refund_confirmation','Refund Confirmation','payment_refunded',0,'Your refund has been recorded. Your bank may take additional time to credit it.'),
('check_in_reminder','Check-in Reminder','before_check_in',24,'We look forward to welcoming you for check-in.'),
('check_out_reminder','Check-out Reminder','before_check_out',24,'Your check-out is approaching. Thank you for staying with us.'),
('post_stay_feedback','Post-Stay Thank You / Feedback Request','after_check_out',24,'Thank you for staying with us. Please reply to this email to share your feedback.')
) AS v(k,n,e,h,message) ON CONFLICT(template_key) DO NOTHING;
CREATE TABLE public.guest_email_runtime (id boolean PRIMARY KEY DEFAULT true, endpoint text NOT NULL, publishable_key text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.guest_email_runtime TO service_role;
ALTER TABLE public.guest_email_runtime ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.guest_email_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE, template_key text NOT NULL, event_key text NOT NULL UNIQUE, event_type text NOT NULL, event_data jsonb NOT NULL DEFAULT '{}', due_at timestamptz NOT NULL DEFAULT now(), status text NOT NULL DEFAULT 'pending', attempts integer NOT NULL DEFAULT 0, provider_id text, last_error text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.guest_email_events TO authenticated;
GRANT ALL ON public.guest_email_events TO service_role;
ALTER TABLE public.guest_email_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view guest email deliveries" ON public.guest_email_events FOR SELECT TO authenticated USING(public.is_admin_new());
CREATE INDEX guest_email_events_due ON public.guest_email_events(status,due_at);
CREATE FUNCTION public.validate_guest_email_template() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
IF NEW.trigger_event NOT IN ('booking_confirmed','booking_cancelled','payment_completed','payment_failed','payment_pending','payment_refunded','before_check_in','before_check_out','after_check_out') OR NEW.offset_hours < 0 OR NEW.offset_hours > 8760 THEN RAISE EXCEPTION 'Invalid email trigger or timing'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER validate_guest_email_template BEFORE INSERT OR UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION public.validate_guest_email_template();
CREATE FUNCTION public.record_guest_email_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e text; b uuid; key text; payload jsonb; s text;
BEGIN
IF TG_TABLE_NAME='bookings' THEN
s:=NEW.payment_status; b:=NEW.id;
IF TG_OP='UPDATE' AND NEW.payment_status IS NOT DISTINCT FROM OLD.payment_status THEN RETURN NEW; END IF;
e:=CASE s WHEN 'confirmed' THEN 'booking_confirmed' WHEN 'completed' THEN 'booking_confirmed' WHEN 'paid' THEN 'booking_confirmed' WHEN 'cancelled' THEN 'booking_cancelled' WHEN 'failed' THEN 'payment_failed' WHEN 'pending' THEN 'payment_pending' WHEN 'refunded' THEN 'payment_refunded' ELSE NULL END;
key:='booking:'||b||':'||coalesce(e,''); payload:=jsonb_build_object('payment_id',NEW.payment_id);
ELSE
IF TG_OP='UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
b:=NEW.booking_id; s:=NEW.status;
e:=CASE s WHEN 'completed' THEN 'payment_completed' WHEN 'failed' THEN 'payment_failed' WHEN 'pending' THEN 'payment_pending' WHEN 'refunded' THEN 'payment_refunded' ELSE NULL END;
key:='payment:'||NEW.id||':'||coalesce(e,''); payload:=jsonb_build_object('payment_amount',NEW.amount,'payment_id',coalesce(NEW.razorpay_payment_id,NEW.transaction_reference));
END IF;
IF b IS NOT NULL AND e IS NOT NULL THEN
INSERT INTO public.guest_email_events(booking_id,template_key,event_key,event_type,event_data,due_at)
SELECT b,t.template_key,key||':'||t.template_key,e,payload,now()+make_interval(hours=>t.offset_hours) FROM public.email_templates t WHERE t.trigger_event=e AND t.trigger_enabled AND t.is_active ON CONFLICT(event_key) DO NOTHING;
END IF;
RETURN NEW; END $$;
CREATE TRIGGER guest_email_booking_events AFTER INSERT OR UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.record_guest_email_event();
CREATE TRIGGER guest_email_payment_events AFTER INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.record_guest_email_event();
CREATE FUNCTION public.wake_guest_email_delivery() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$ DECLARE r public.guest_email_runtime; BEGIN
SELECT * INTO r FROM public.guest_email_runtime LIMIT 1;
IF r.endpoint IS NOT NULL THEN PERFORM net.http_post(url:=r.endpoint,headers:=jsonb_build_object('Content-Type','application/json','apikey',r.publishable_key),body:='{}'::jsonb); END IF;
RETURN NEW; END $$;
CREATE TRIGGER wake_guest_email_delivery AFTER INSERT ON public.guest_email_events FOR EACH STATEMENT EXECUTE FUNCTION public.wake_guest_email_delivery();
CREATE FUNCTION public.claim_guest_email_events() RETURNS SETOF public.guest_email_events LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
RETURN QUERY WITH due AS (SELECT id FROM public.guest_email_events WHERE ((status IN ('pending','failed') AND due_at<=now()) OR (status='sending' AND updated_at<now()-interval '10 minutes')) AND attempts<3 ORDER BY due_at LIMIT 20 FOR UPDATE SKIP LOCKED)
UPDATE public.guest_email_events e SET status='sending',attempts=e.attempts+1,updated_at=now() FROM due WHERE e.id=due.id RETURNING e.*;
END $$;
CREATE FUNCTION public.prepare_guest_email_reminders() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
INSERT INTO public.guest_email_events(booking_id,template_key,event_key,event_type,due_at)
SELECT b.id,t.template_key,'reminder:'||b.id||':'||t.template_key||':'||b.check_in||':'||b.check_out,t.trigger_event,
CASE t.trigger_event WHEN 'before_check_in' THEN ((b.check_in::timestamp+interval '12 hours') AT TIME ZONE 'Asia/Kolkata')-make_interval(hours=>t.offset_hours)
WHEN 'before_check_out' THEN ((b.check_out::timestamp+interval '10 hours') AT TIME ZONE 'Asia/Kolkata')-make_interval(hours=>t.offset_hours)
ELSE ((b.check_out::timestamp+interval '10 hours') AT TIME ZONE 'Asia/Kolkata')+make_interval(hours=>t.offset_hours) END
FROM public.bookings b CROSS JOIN public.email_templates t WHERE b.payment_status IN ('confirmed','completed','paid') AND t.is_active AND t.trigger_enabled AND t.trigger_event IN ('before_check_in','before_check_out','after_check_out')
AND CASE t.trigger_event WHEN 'before_check_in' THEN ((b.check_in::timestamp+interval '12 hours') AT TIME ZONE 'Asia/Kolkata')-make_interval(hours=>t.offset_hours) WHEN 'before_check_out' THEN ((b.check_out::timestamp+interval '10 hours') AT TIME ZONE 'Asia/Kolkata')-make_interval(hours=>t.offset_hours) ELSE ((b.check_out::timestamp+interval '10 hours') AT TIME ZONE 'Asia/Kolkata')+make_interval(hours=>t.offset_hours) END BETWEEN now()-interval '1 hour' AND now()
ON CONFLICT(event_key) DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.validate_guest_email_template(),public.record_guest_email_event(),public.wake_guest_email_delivery(),public.claim_guest_email_events(),public.prepare_guest_email_reminders() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_guest_email_events(),public.prepare_guest_email_reminders() TO service_role;
CREATE TRIGGER guest_email_events_updated_at BEFORE UPDATE ON public.guest_email_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();