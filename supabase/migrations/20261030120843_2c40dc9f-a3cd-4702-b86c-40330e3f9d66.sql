CREATE TABLE public.email_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_name text NOT NULL DEFAULT 'Horseland Hotel',
  from_email text NOT NULL DEFAULT 'onboarding@resend.dev',
  reply_to text,
  admin_notification_email text,
  send_booking_confirmation boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.email_settings TO authenticated;
GRANT ALL ON public.email_settings TO service_role;
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage email settings" ON public.email_settings FOR ALL TO authenticated
  USING (public.is_admin_new()) WITH CHECK (public.is_admin_new());

CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL UNIQUE,
  name text NOT NULL,
  subject text NOT NULL,
  html_body text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage email templates" ON public.email_templates FOR ALL TO authenticated
  USING (public.is_admin_new()) WITH CHECK (public.is_admin_new());

INSERT INTO public.email_settings (from_name) VALUES ('Horseland Hotel');

INSERT INTO public.email_templates (template_key, name, subject, html_body) VALUES (
'booking_confirmation', 'Room Booking Confirmed',
'Your stay at Horseland Hotel is confirmed – {{booking_id}}',
$html$<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f4efe6;font-family:Georgia,'Times New Roman',serif;color:#2d2a26;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4efe6;padding:24px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;">
<tr><td style="background:#2f4a3a;padding:32px;text-align:center;color:#f4efe6;">
<div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;opacity:.8;">Matheran</div>
<div style="font-size:28px;margin-top:6px;">Horseland Hotel &amp; Mountain Spa</div>
<div style="font-size:15px;margin-top:14px;color:#d9c18f;">Your booking is confirmed</div>
</td></tr>
<tr><td style="padding:32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;">
<p>Dear {{guest_name}},</p>
<p>Thank you for choosing Horseland Hotel. We are delighted to confirm your reservation and look forward to welcoming you to the hills of Matheran.</p>
<table width="100%" cellpadding="8" cellspacing="0" style="border:1px solid #e8e1d4;border-radius:8px;margin:20px 0;font-size:14px;">
<tr style="background:#faf7f1;"><td><b>Booking ID</b></td><td align="right">{{booking_id}}</td></tr>
<tr><td><b>Room</b></td><td align="right">{{room_type}}</td></tr>
<tr style="background:#faf7f1;"><td><b>Check-in</b></td><td align="right">{{check_in}}</td></tr>
<tr><td><b>Check-out</b></td><td align="right">{{check_out}}</td></tr>
<tr style="background:#faf7f1;"><td><b>Nights</b></td><td align="right">{{nights}}</td></tr>
<tr><td><b>Guests</b></td><td align="right">{{guests}}</td></tr>
<tr style="background:#faf7f1;"><td><b>Meal Plan</b></td><td align="right">{{meal_plan}}</td></tr>
<tr><td><b>GST</b></td><td align="right">{{gst_amount}}</td></tr>
<tr style="background:#2f4a3a;color:#ffffff;"><td><b>Total Paid</b></td><td align="right"><b>{{total_amount}}</b></td></tr>
<tr><td style="font-size:12px;color:#777;">Payment Reference</td><td align="right" style="font-size:12px;color:#777;">{{payment_id}}</td></tr>
</table>
<p style="margin:0 0 6px;"><b>Good to know</b></p>
<ul style="margin:0 0 16px;padding-left:20px;">
<li>Breakfast 8:30–10:30 AM · Lunch 1:00–2:30 PM · High Tea 4:30–6:00 PM · Dinner 8:30–10:30 PM</li>
<li>Swimming pool open 9:00 AM–6:00 PM (nylon swimwear compulsory)</li>
<li>Hot water: 8:00–11:00 AM and 5:00–7:00 PM</li>
</ul>
<p>If you have any questions, simply reply to this email or call us on +91 79775 38460, quoting your booking ID.</p>
<p>Warm regards,<br><b>Team Horseland Hotel</b></p>
</td></tr>
<tr><td style="background:#faf7f1;padding:18px;text-align:center;font-family:Arial,sans-serif;font-size:12px;color:#888;">Horseland Hotel &amp; Mountain Spa, Matheran, Maharashtra</td></tr>
</table></td></tr></table></body></html>$html$
);