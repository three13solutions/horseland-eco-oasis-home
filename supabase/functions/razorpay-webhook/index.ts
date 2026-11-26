import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { getDistributionRazorpayCredentials, createDistributionRazorpayProvider } from '../_shared/distributionRazorpay.ts';
import { createDistributionStore } from '../_shared/distributionStore.ts';
import { reconcileCapturedHold, type HoldPaymentLookup } from '../_shared/distributionReconciliation.ts';

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  try {
    if (Number(req.headers.get('content-length') || 0) > 262144) return reply({ error: 'Request too large' }, 413);
    const event = await req.json();
    const orderId = event?.payload?.payment?.entity?.order_id ?? event?.payload?.order?.entity?.id;
    if (typeof orderId !== 'string' || !/^order_[A-Za-z0-9]+$/.test(orderId)) return reply({ ignored: true });
    const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const lookup = await db.rpc('distribution_lookup_webhook_order', { p_order_id: orderId });
    if (lookup.error) throw new Error('Order lookup unavailable');
    if (!lookup.data) return reply({ ignored: true });
    const credentials = await getDistributionRazorpayCredentials(db, name => Deno.env.get(name));
    if (credentials.keyId.startsWith('rzp_test') && Deno.env.get('ALLOW_TEST_BOOKINGS') === 'false') return reply({ ignored: true });
    // Event contents are untrusted: fetch the stored order and payments directly
    // from Razorpay. Only a verified captured payment may change the booking.
    const result = await reconcileCapturedHold(lookup.data as HoldPaymentLookup, createDistributionRazorpayProvider(credentials), createDistributionStore(db).confirmCaptured);
    if (result.status === 'confirmed' && result.reused === false) {
      try { await db.functions.invoke('send-booking-confirmation', { body: { booking_id: result.bookingId } }); } catch { /* Booking remains committed. */ }
    }
    return reply({ status: result.status });
  } catch {
    // Ask Razorpay to retry an unconfirmed provider read or database write.
    return reply({ error: 'Payment check not confirmed. Retry delivery.' }, 503);
  }
});