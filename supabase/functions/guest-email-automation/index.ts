import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { fillEmail, maySendEmail } from '../_shared/guestEmail.ts';

serve(async (req) => {
  const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return respond({});
  if (req.method !== 'POST') return respond({ error: 'Method not allowed' }, 405);
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !serviceKey || !apiKey || !anonKey) return respond({ error: 'Email service is not configured' }, 503);
  // Public scheduler credential only wakes delivery of database-owned events; no recipient/content input is accepted.
  if (req.headers.get('apikey') !== anonKey) return respond({ error: 'Unauthorized' }, 401);
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length) return respond({ error: 'No request parameters are accepted' }, 400);
    const db = createClient(url, serviceKey);
    const { error: reminderError } = await db.rpc('prepare_guest_email_reminders');
    if (reminderError) throw reminderError;
    const { data: events, error } = await db.rpc('claim_guest_email_events');
    if (error) throw error;
    const { data: settings, error: settingsError } = await db.from('email_settings').select('*').limit(1).maybeSingle();
    if (settingsError) throw settingsError;
    let sent = 0;
    for (const event of events ?? []) {
      try {
        const [{ data: template, error: templateError }, { data: booking, error: bookingError }] = await Promise.all([
          db.from('email_templates').select('*').eq('template_key', event.template_key).maybeSingle(),
          db.from('bookings').select('*,room_type:room_types(name)').eq('id', event.booking_id).maybeSingle(),
        ]);
        if (templateError || bookingError) throw templateError ?? bookingError;
        if (!booking || !maySendEmail(event, template, booking, settings)) {
          const { error } = await db.from('guest_email_events').update({ status: 'skipped', last_error: 'Disabled or event no longer applicable' }).eq('id', event.id);
          if (error) throw error;
          continue;
        }
        if (!booking.guest_email) throw new Error('Guest email is missing');
        const currency = (v: unknown) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(v ?? 0));
        const date = (v: string) => new Date(`${v}T00:00:00Z`).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });
        const values: Record<string, string> = {
          guest_name: booking.guest_name || 'Guest', guest_email: booking.guest_email, guest_phone: booking.guest_phone || '',
          booking_id: booking.booking_id, room_type: booking.room_type?.name || '', check_in: date(booking.check_in), check_out: date(booking.check_out),
          nights: String(Math.round((Date.parse(booking.check_out) - Date.parse(booking.check_in)) / 86400000)), guests: String(booking.guests_count),
          meal_plan: booking.meal_plan_code?.replaceAll('_', ' ').toUpperCase() || '', total_amount: currency(booking.total_amount),
          gst_amount: currency(booking.rate_breakdown?.validated_quote?.tax_amount),
          payment_amount: event.event_data.payment_amount == null ? '' : currency(event.event_data.payment_amount),
          refund_amount: event.event_type === 'payment_refunded' ? currency(event.event_data.payment_amount) : '',
          payment_id: event.event_data.payment_id || booking.payment_id || '', payment_order_id: booking.payment_order_id || '',
        };
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': event.id },
          body: JSON.stringify({ from: `${settings?.from_name || 'Horseland Hotel'} <${settings?.from_email || 'onboarding@resend.dev'}>`,
            to: [booking.guest_email], ...(settings?.reply_to ? { reply_to: settings.reply_to } : {}),
            ...(settings?.admin_notification_email ? { bcc: [settings.admin_notification_email] } : {}),
            subject: fillEmail(template.subject, values), html: fillEmail(template.html_body, values, true) }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Email provider rejected the message');
        const { error: saveError } = await db.from('guest_email_events').update({ status: 'sent', provider_id: result.id, last_error: null }).eq('id', event.id);
        if (saveError) throw saveError;
        sent++;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Email delivery failed';
        await db.from('guest_email_events').update({ status: 'failed', last_error: message, due_at: new Date(Date.now() + 3600000).toISOString() }).eq('id', event.id);
      }
    }
    return respond({ success: true, processed: events?.length ?? 0, sent });
  } catch {
    return respond({ error: 'Could not process guest emails' }, 500);
  }
});