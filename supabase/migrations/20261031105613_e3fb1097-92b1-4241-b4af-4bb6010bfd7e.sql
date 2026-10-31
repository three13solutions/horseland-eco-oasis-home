CREATE TABLE public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL CHECK (module IN ('invoice','receipt','whatsapp','sms')),
  name text NOT NULL,
  subject text,
  body text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_templates TO authenticated;
GRANT ALL ON public.message_templates TO service_role;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage message templates" ON public.message_templates FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.template_module_settings (
  module text PRIMARY KEY CHECK (module IN ('invoice','receipt','whatsapp','sms')),
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_module_settings TO authenticated;
GRANT ALL ON public.template_module_settings TO service_role;
ALTER TABLE public.template_module_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage template settings" ON public.template_module_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER zz_activity_log AFTER INSERT OR UPDATE OR DELETE ON public.message_templates FOR EACH ROW EXECUTE FUNCTION public.record_activity_log();
CREATE TRIGGER zz_activity_log AFTER INSERT OR UPDATE OR DELETE ON public.template_module_settings FOR EACH ROW EXECUTE FUNCTION public.record_activity_log();

INSERT INTO public.template_module_settings(module, settings) VALUES
('invoice', '{"prefix":"INV","footer_note":"Thank you for staying at Horseland Hotel & Mountain Spa.","show_gst":true,"show_logo":true}'),
('receipt', '{"prefix":"RCPT","footer_note":"This is a computer-generated receipt.","show_logo":true}'),
('whatsapp', '{"business_number":"+91 88791 92885","enabled":false,"send_on_booking":true}'),
('sms', '{"sender_id":"HRSLND","enabled":false,"send_on_booking":true}');

INSERT INTO public.message_templates(module, name, subject, body, is_default) VALUES
('invoice','Standard Invoice','Tax Invoice','<h2>Tax Invoice {{invoice_number}}</h2><p>Billed to: {{guest_name}} ({{guest_email}})</p><p>Booking: {{booking_id}} — {{room_type}}, {{check_in}} to {{check_out}} ({{nights}} nights)</p><p>Subtotal: {{subtotal}}<br/>GST: {{gst_amount}}<br/><strong>Total: {{total_amount}}</strong></p>', true),
('receipt','Payment Receipt','Payment Receipt','<h2>Payment Receipt</h2><p>Received with thanks from {{guest_name}} the sum of <strong>{{amount_paid}}</strong> towards booking {{booking_id}}.</p><p>Payment ID: {{payment_id}}<br/>Date: {{payment_date}}</p>', true),
('whatsapp','Booking Confirmation',NULL,'Hello {{guest_name}}, your booking {{booking_id}} at Horseland Hotel is confirmed! 🐎
Room: {{room_type}}
Check-in: {{check_in}}
Check-out: {{check_out}}
Total paid: {{total_amount}}
For help call +91 88791 92885.', true),
('sms','Booking Confirmation',NULL,'Horseland Hotel: Hi {{guest_name}}, booking {{booking_id}} confirmed for {{check_in}} - {{check_out}}. Amount {{total_amount}}.', true);