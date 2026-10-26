import { legacyCheckoutAdmission } from '../_shared/distributionLegacyGuard.ts'

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { calculateBookingQuote, assertQuoteMatches, QuoteError } from "../_shared/bookingQuote.ts"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getRazorpayCredentials() {
  // First try to get from new integrations system
  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2")
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: integration } = await supabaseClient
      .from('api_integrations')
      .select(`
        id,
        is_enabled,
        api_integration_secrets(key, value_encrypted)
      `)
      .eq('integration_key', 'razorpay')
      .eq('is_enabled', true)
      .single()

    if (integration && integration.api_integration_secrets) {
      const encryptionKey = Deno.env.get('INTEGRATIONS_ENCRYPTION_KEY')
      if (encryptionKey) {
        const credentials: Record<string, string> = {}
        
        for (const secret of integration.api_integration_secrets) {
          try {
            const encryptedData = JSON.parse(atob(secret.value_encrypted))
            const iv = new Uint8Array(encryptedData.iv)
            const data = new Uint8Array(encryptedData.data)

            const key = await crypto.subtle.importKey(
              'raw',
              new TextEncoder().encode(encryptionKey.padEnd(32, '0').slice(0, 32)),
              { name: 'AES-GCM' },
              false,
              ['decrypt']
            )

            const decrypted = await crypto.subtle.decrypt(
              { name: 'AES-GCM', iv },
              key,
              data
            )

            credentials[secret.key] = new TextDecoder().decode(decrypted)
          } catch (error) {
            console.error(`Failed to decrypt ${secret.key}:`, error)
          }
        }

        if (credentials.RAZORPAY_KEY_ID && credentials.RAZORPAY_SECRET) {
          return {
            keyId: credentials.RAZORPAY_KEY_ID,
            secret: credentials.RAZORPAY_SECRET
          }
        }
      }
    }
  } catch (error) {
    console.log('Failed to get credentials from integrations system, falling back to env vars:', error)
  }

  // Fallback to environment variables
  const keyId = Deno.env.get('RAZORPAY_KEY_ID')
  const secret = Deno.env.get('RAZORPAY_SECRET')
  
  if (keyId && secret) {
    return { keyId, secret }
  }

  throw new Error('Razorpay credentials not configured')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { amount, currency = 'INR', quote_request, quote_fingerprint, existing_booking_id } = await req.json()
    if (currency !== 'INR') throw new QuoteError('INVALID_CURRENCY', 'Only INR is supported.', 400)
    const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
    const admission = await legacyCheckoutAdmission(db, Boolean(existing_booking_id))
    if (admission !== 'legacy_allowed') return new Response(JSON.stringify({ code: admission === 'refresh_required' ? 'CHECKOUT_REFRESH_REQUIRED' : 'CHECKOUT_UNAVAILABLE', error: 'Refresh the checkout before starting a payment. No order was created by this request.' }), { status: admission === 'refresh_required' ? 409 : 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    let snapshot: any
    if (existing_booking_id) {
      const caller = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
      const { data: user, error: userError } = await caller.auth.getUser()
      const { data: admin, error: roleError } = await caller.rpc('is_admin_new')
      if (userError || !user.user || roleError || admin !== true) throw new QuoteError('ADMIN_REQUIRED', 'Staff authentication is required.', 403)
      const { data: booking, error: bookingError } = await db.from('bookings').select('id,total_amount,rate_breakdown,payment_status,payment_id').eq('id', existing_booking_id).maybeSingle()
      if (bookingError || !booking) throw new QuoteError('BOOKING_QUOTE_REQUIRED', 'The saved booking could not be verified.')
      if (booking.payment_status === 'cancelled') throw new QuoteError('BOOKING_CANCELLED', 'A cancelled booking cannot be charged.')
      if (['confirmed', 'paid', 'completed'].includes(booking.payment_status) || booking.payment_id) throw new QuoteError('BOOKING_ALREADY_PAID', 'This booking is already paid; another order cannot be created.')
      snapshot = booking.rate_breakdown?.validated_quote ?? { request: { existing_booking_id }, total_amount: Number(booking.total_amount), currency: 'INR', pricing_status: 'legacy_saved_booking' }
      if (moneyDifference(amount, Number(booking.total_amount))) throw new QuoteError('QUOTE_CHANGED', 'The saved booking amount has changed.')
      snapshot = { ...snapshot, existing_booking_id }
    } else {
      snapshot = await calculateBookingQuote(db, quote_request, 'website')
      assertQuoteMatches(snapshot, amount, quote_fingerprint)
    }
    const notes = { pricing_version: 'rate-plan-v1' }

    if (!amount) {
      return new Response(
        JSON.stringify({ error: 'Amount is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { keyId, secret } = await getRazorpayCredentials()
    if (!keyId.startsWith('rzp_test_')) throw new Error('This rollout supports test payments only; live payment processing is disabled.')

    if (existing_booking_id) {
      const { data: pending, error: pendingError } = await db.from('booking_order_quotes')
        .select('order_id,amount,currency,quote').contains('quote', { existing_booking_id }).maybeSingle()
      if (pendingError) throw new QuoteError('ORDER_LOOKUP_FAILED', 'Existing payment order could not be checked safely.', 503)
      if (pending) {
        // Local quote expiry is not Razorpay order cancellation: never create a second payable order.
        if (moneyDifference(pending.amount, snapshot.total_amount) || pending.currency !== 'INR') throw new QuoteError('OUTSTANDING_ORDER_CHANGED', 'An existing payment order requires staff reconciliation before the booking amount can change.')
        const existingResponse = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(pending.order_id)}`, {
          headers: { Authorization: `Basic ${btoa(`${keyId}:${secret}`)}` },
        })
        if (!existingResponse.ok) throw new QuoteError('ORDER_LOOKUP_FAILED', 'The existing payment order could not be verified.', 503)
        const existingOrder = await existingResponse.json()
        if (existingOrder.status === 'paid' || Number(existingOrder.amount_paid) > 0) throw new QuoteError('PAYMENT_RECONCILIATION_REQUIRED', 'A payment already exists for this order; reconcile it rather than charge again.')
        if (!['created', 'attempted'].includes(existingOrder.status) || existingOrder.amount !== Math.round(snapshot.total_amount * 100) || existingOrder.currency !== 'INR') throw new QuoteError('ORDER_RECONCILIATION_REQUIRED', 'The existing order needs reconciliation before another payment attempt.')
        return new Response(JSON.stringify(existingOrder), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    const order = {
      amount: Math.round(snapshot.total_amount * 100), // Convert to paise
      currency,
      notes,
    }

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${keyId}:${secret}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(order),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Razorpay API error:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to create order' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const orderData = await response.json()
    const { error: snapshotError } = await db.from('booking_order_quotes').insert({
      order_id: orderData.id, request: snapshot.request, quote: snapshot,
      amount: snapshot.total_amount, currency: 'INR', expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    })
    // Never expose a payable order unless its server quote has been persisted.
    if (snapshotError) throw new QuoteError('ORDER_QUOTE_SAVE_FAILED', 'Payment could not be prepared safely. No payment has been taken.', 503)

    return new Response(
      JSON.stringify(orderData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error creating Razorpay order:', error)
    return new Response(
      JSON.stringify({ code: error instanceof QuoteError ? error.code : 'ORDER_FAILED', error: error.message || 'Internal server error' }),
      { status: error instanceof QuoteError ? error.status : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})


function moneyDifference(a: unknown, b: number) { return typeof a !== "number" || !Number.isFinite(a) || Math.abs(a - b) > 0.01; }
