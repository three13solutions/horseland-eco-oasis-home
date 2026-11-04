CREATE OR REPLACE FUNCTION pg_temp.hl_email(tag text, heading text, intro text, extra text, total_label text) RETURNS text LANGUAGE sql AS $f$
SELECT '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4efe6;font-family:Georgia,''Times New Roman'',serif;color:#2d2a26;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4efe6;padding:24px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;">
<tr><td style="background:#2f4a3a;padding:28px 32px;text-align:center;color:#f4efe6;">
<img src="https://horseland.three13.solutions/lovable-uploads/24f5ee9b-ce5a-4b86-a2d8-7ca42e0a78cf.png" alt="Horseland Hotel" width="96" style="display:block;margin:0 auto 12px;width:96px;height:auto;border:0;">
<div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;opacity:.8;">Matheran</div>
<div style="font-size:26px;margin-top:6px;">Horseland Hotel &amp; Mountain Spa</div>
<div style="font-size:15px;margin-top:12px;color:#d9c18f;">' || tag || '</div>
</td></tr>
<tr><td style="padding:32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;">
<h2 style="font-family:Georgia,serif;font-weight:normal;color:#2f4a3a;margin:0 0 16px;">' || heading || '</h2>
<p>Dear {{guest_name}},</p>
<p>' || intro || '</p>
<table width="100%" cellpadding="8" cellspacing="0" style="border:1px solid #e8e1d4;border-radius:8px;margin:20px 0;font-size:14px;">
<tr style="background:#faf7f1;"><td><b>Booking ID</b></td><td align="right">{{booking_id}}</td></tr>
<tr><td><b>Room</b></td><td align="right">{{room_type}}</td></tr>
<tr style="background:#faf7f1;"><td><b>Check-in</b></td><td align="right">{{check_in}}</td></tr>
<tr><td><b>Check-out</b></td><td align="right">{{check_out}}</td></tr>
<tr style="background:#faf7f1;"><td><b>Nights</b></td><td align="right">{{nights}}</td></tr>
<tr><td><b>Guests</b></td><td align="right">{{guests}}</td></tr>
<tr style="background:#2f4a3a;color:#ffffff;"><td><b>' || total_label || '</b></td><td align="right"><b>{{total_amount}}</b></td></tr>
<tr><td style="font-size:12px;color:#777;">Payment Reference</td><td align="right" style="font-size:12px;color:#777;">{{payment_id}}</td></tr>
</table>' || extra || '
<p>If you have any questions, simply reply to this email or call us on +91 88791 92885, quoting your booking ID.</p>
<p>Warm regards,<br><b>Team Horseland Hotel</b></p>
</td></tr>
<tr><td style="background:#faf7f1;padding:18px;text-align:center;font-family:Arial,sans-serif;font-size:12px;color:#888;">Horseland Hotel &amp; Mountain Spa · Vitthalrao Kotwal Road, Matheran, Maharashtra 410102<br>+91 88791 92885</td></tr>
</table></td></tr></table></body></html>'
$f$;

CREATE OR REPLACE FUNCTION pg_temp.hl_tips() RETURNS text LANGUAGE sql AS $f$
SELECT '<p style="margin:0 0 6px;"><b>Good to know</b></p><ul style="margin:0 0 16px;padding-left:20px;">
<li>Breakfast 8:30–10:30 AM · Lunch 1:00–2:30 PM · High Tea 4:30–6:00 PM · Dinner 8:30–10:30 PM</li>
<li>Swimming pool open 9:00 AM–6:00 PM (nylon swimwear compulsory)</li>
<li>Hot water: 8:00–11:00 AM and 5:00–7:00 PM</li></ul>'
$f$;

UPDATE public.email_templates t SET subject = v.subject, html_body = pg_temp.hl_email(v.tag, v.heading, v.intro, CASE WHEN v.tips THEN pg_temp.hl_tips() ELSE '' END, v.total_label)
FROM (VALUES
('booking_confirmation','Your stay at Horseland Hotel is confirmed – {{booking_id}}','Your booking is confirmed','We can''t wait to welcome you','Thank you for choosing Horseland Hotel. We are delighted to confirm your reservation and look forward to welcoming you to the peaceful hills of Matheran.',true,'Total Paid'),
('booking_cancellation','Your Horseland Hotel booking has been cancelled – {{booking_id}}','Booking cancelled','We''re sorry to miss you','Your reservation with us has been cancelled. We hope to have the pleasure of welcoming you to Matheran another time — our team is always happy to help you plan a future stay.',false,'Booking Amount'),
('booking_reminder','Your Matheran getaway is almost here – {{booking_id}}','Your stay is coming up','The hills are waiting','Your stay at Horseland Hotel is just around the corner. Matheran is a vehicle-free hill station, so plan a little extra time for the final stretch — and bring comfortable shoes for the red-earth trails.',true,'Booking Amount'),
('payment_confirmation','Payment received – Horseland Hotel – {{booking_id}}','Payment received','Thank you for your payment','We have received your payment successfully. Your reservation is secure and our team is preparing for your arrival.',false,'Amount Paid'),
('payment_failed','Payment unsuccessful – Horseland Hotel – {{booking_id}}','Payment unsuccessful','Let us help you complete your booking','Unfortunately your payment could not be completed and no booking has been confirmed. Please contact us before trying again so we can make sure you are not charged twice.',false,'Amount Due'),
('payment_pending','Your payment is pending – Horseland Hotel – {{booking_id}}','Payment pending','Your booking is on hold','We are still waiting for confirmation of your payment. Once it is received, your stay will be confirmed. If you need any help, our team is just a call away.',false,'Amount Due'),
('refund_confirmation','Your refund has been processed – Horseland Hotel – {{booking_id}}','Refund processed','Your refund is on its way','We have processed your refund. Depending on your bank, it may take a few business days to reflect in your account.',false,'Refund Amount'),
('check_in_reminder','See you tomorrow at Horseland Hotel – {{booking_id}}','Check-in tomorrow','Welcome to Matheran','We look forward to welcoming you tomorrow. Please carry a valid photo ID for every guest at check-in. Our team will be ready to help you settle in.',true,'Booking Amount'),
('check_out_reminder','Your check-out from Horseland Hotel – {{booking_id}}','Check-out reminder','We hope you enjoyed your stay','Your check-out is approaching. Thank you for spending your time in Matheran with us — please let our front desk know if you need help with luggage or onward travel.',false,'Booking Amount'),
('post_stay_feedback','Thank you for staying at Horseland Hotel','Thank you','Until we meet again','Thank you for choosing Horseland Hotel & Mountain Spa. It was a pleasure hosting you. We would love to hear about your experience — simply reply to this email to share your feedback.',false,'Booking Amount')
) AS v(k,subject,tag,heading,intro,tips,total_label)
WHERE t.template_key = v.k;