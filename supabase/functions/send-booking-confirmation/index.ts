import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

// Compatibility endpoint. Database event triggers own confirmation creation and deduplication.
serve(async (req) => {
  const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return respond({});
  if (req.method !== 'POST') return respond({ error: 'Method not allowed' }, 405);
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !serviceKey || !anonKey) return respond({ error: 'Email service not configured' }, 503);
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  const db = createClient(url, serviceKey);
  if (token !== serviceKey) {
    const { data: { user }, error } = await db.auth.getUser(token);
    if (error || !user) return respond({ error: 'Unauthorized' }, 401);
    const caller = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: admin } = await caller.rpc('is_admin_new');
    if (!admin) return respond({ error: 'Administrator access required' }, 403);
  }
  try {
    const { booking_id } = await req.json();
    if (typeof booking_id !== 'string' || !booking_id || booking_id.length > 128) return respond({ error: 'Booking ID required' }, 400);
    const { data: booking, error } = await db.from('bookings').select('id').eq(/^[0-9a-f-]{36}$/i.test(booking_id) ? 'id' : 'booking_id', booking_id).maybeSingle();
    if (error || !booking) return respond({ error: 'Booking not found' }, 404);
    const result = await fetch(`${url}/functions/v1/guest-email-automation`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: anonKey }, body: '{}' });
    if (!result.ok) return respond({ error: 'Email processing unavailable' }, 502);
    return respond({ success: true, queued: true });
  } catch { return respond({ error: 'Could not process confirmation' }, 500); }
});
