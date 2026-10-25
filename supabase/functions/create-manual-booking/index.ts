import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { calculateBookingQuote, assertQuoteMatches, snapshotBookingFields, QuoteError } from '../_shared/bookingQuote.ts'
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const caller = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
    const { data: user, error: authError } = await caller.auth.getUser()
    const { data: admin, error: roleError } = await caller.rpc('is_admin_new')
    if (authError || !user.user || roleError || admin !== true) throw new QuoteError('ADMIN_REQUIRED', 'Staff authentication is required.', 403)
    const { quote_request, quote_fingerprint, expected_amount, booking } = await req.json()
    if (!booking || typeof booking.guest_name !== 'string' || !booking.guest_name.trim() || !quote_request?.room_unit_id) throw new QuoteError('INVALID_BOOKING', 'Guest name and room unit are required.', 400)
    const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
    if (booking.package_id) {
      const { data: pkg, error: packageError } = await db.from('packages').select('id').eq('id', booking.package_id).eq('is_active', true).maybeSingle()
      if (packageError || !pkg) throw new QuoteError('PACKAGE_UNAVAILABLE', 'This package is no longer available.')
    }
    const quote = await calculateBookingQuote(db, quote_request, 'manual')
    assertQuoteMatches(quote, expected_amount, quote_fingerprint)
    const { data: overlapping, error: availabilityError } = await db.from('bookings').select('id').eq('room_unit_id', quote.request.room_unit_id).neq('payment_status', 'cancelled').lt('check_in', quote.request.check_out).gt('check_out', quote.request.check_in).limit(1)
    if (availabilityError || overlapping?.length) throw new QuoteError('ROOM_UNAVAILABLE', 'This room is no longer available for the selected dates.')
    const row = {
      ...snapshotBookingFields(quote),
      booking_id: `MAN_${crypto.randomUUID()}`,
      guest_id: booking.guest_id || null,
      package_id: booking.package_id || null,
      guest_name: booking.guest_name.trim(), guest_email: booking.guest_email || null, guest_phone: booking.guest_phone || null,
      notes: booking.notes || null,
      // Online/cash confirmation remains a separate explicit payment action.
      payment_status: 'pending',
    }
    const { data, error } = await db.from('bookings').insert([row]).select().single()
    if (error) throw new QuoteError('BOOKING_CREATE_FAILED', 'The booking could not be saved.', 503)
    return Response.json({ success: true, booking: data }, { headers: cors })
  } catch (error) {
    return Response.json({ code: error instanceof QuoteError ? error.code : 'BOOKING_FAILED', error: (error as Error).message }, { status: error instanceof QuoteError ? error.status : 500, headers: cors })
  }
})
