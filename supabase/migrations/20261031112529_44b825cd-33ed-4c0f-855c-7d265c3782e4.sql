CREATE OR REPLACE FUNCTION public.prepare_guest_email_reminders() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
INSERT INTO public.guest_email_events(booking_id,template_key,event_key,event_type,due_at)
SELECT b.id,t.template_key,'reminder:'||b.id||':'||t.template_key||':'||b.check_in||':'||b.check_out,t.trigger_event,
CASE t.trigger_event WHEN 'before_check_in' THEN (b.check_in::timestamp AT TIME ZONE 'Asia/Kolkata')-make_interval(hours=>t.offset_hours)
WHEN 'before_check_out' THEN (b.check_out::timestamp AT TIME ZONE 'Asia/Kolkata')-make_interval(hours=>t.offset_hours)
ELSE (b.check_out::timestamp AT TIME ZONE 'Asia/Kolkata')+make_interval(hours=>t.offset_hours) END
FROM public.bookings b CROSS JOIN public.email_templates t WHERE b.payment_status IN ('confirmed','completed','paid') AND t.is_active AND t.trigger_enabled AND t.trigger_event IN ('before_check_in','before_check_out','after_check_out')
AND CASE t.trigger_event WHEN 'before_check_in' THEN (b.check_in::timestamp AT TIME ZONE 'Asia/Kolkata')-make_interval(hours=>t.offset_hours) WHEN 'before_check_out' THEN (b.check_out::timestamp AT TIME ZONE 'Asia/Kolkata')-make_interval(hours=>t.offset_hours) ELSE (b.check_out::timestamp AT TIME ZONE 'Asia/Kolkata')+make_interval(hours=>t.offset_hours) END BETWEEN now()-interval '1 hour' AND now()
ON CONFLICT(event_key) DO NOTHING;
END $$;