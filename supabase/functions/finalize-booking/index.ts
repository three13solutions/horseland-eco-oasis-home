import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getRazorpayCredentials(supabaseClient: any) {
  try {
    const { data: integration } = await supabaseClient
      .from('api_integrations')
      .select(`id, is_enabled, api_integration_secrets(key, value_encrypted)`)
      .eq('integration_key', 'razorpay')
      .eq('is_enabled', true)
      .single()

    const encryptionKey = Deno.env.get('INTEGRATIONS_ENCRYPTION_KEY')
    if (integration?.api_integration_secrets && encryptionKey) {
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
          const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
          credentials[secret.key] = new TextDecoder().decode(decrypted)
        } catch (error) {
          console.error(`Failed to decrypt ${secret.key}:`, error)
        }
      }
      if (credentials.RAZORPAY_KEY_ID && credentials.RAZORPAY_SECRET) {
        return { keyId: credentials.RAZORPAY_KEY_ID, secret: credentials.RAZORPAY_SECRET }
      }
    }
  } catch (error) {
    console.log('Falling back to env credentials:', error)
  }

  const keyId = Deno.env.get('RAZORPAY_KEY_ID')
  const secret = Deno.env.get('RAZORPAY_SECRET')
  if (keyId && secret) return { keyId, secret }
  throw new Error('Razorpay credentials not configured')
}

async function isSignatureValid(secret: string, orderId: string, paymentId: string, signature: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${orderId}|${paymentId}`))
  const hex = Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, '0')).join('')
  return hex === signature
}

type PublicationFailure = { code: string; message: string; status: number }

// This is the customer website finalizer only. Staff creation paths are unchanged.
// Never trust a publication flag or a claimed staff/channel flag from the caller.
async function checkPublishedRoomSelection(
  supabase: ReturnType<typeof createClient>,
  booking: { room_type_id?: unknown; room_unit_id?: unknown },
): Promise<PublicationFailure | null> {
  if (typeof booking.room_type_id !== 'string' || !booking.room_type_id.trim()) {
    return { code: 'ROOM_TYPE_REQUIRED', message: 'A published room type is required.', status: 409 }
  }

  try {
    const { data: roomType, error } = await supabase
      .from('room_types')
      .select('id, is_published')
      .eq('id', booking.room_type_id)
      .maybeSingle()

    if (error) throw error
    if (!roomType || roomType.is_published !== true) {
      return { code: 'ROOM_TYPE_NOT_PUBLISHED', message: 'This room type is no longer available for website booking.', status: 409 }
    }

    // Do not allow a published type ID to disguise a unit belonging to a hidden type.
    if (booking.room_unit_id) {
      if (typeof booking.room_unit_id !== 'string') {
        return { code: 'ROOM_SELECTION_MISMATCH', message: 'The selected room is invalid.', status: 409 }
      }
      const { data: unit, error: unitError } = await supabase
        .from('room_units')
        .select('room_type_id')
        .eq('id', booking.room_unit_id)
        .maybeSingle()
      if (unitError) throw unitError
      if (!unit || unit.room_type_id !== roomType.id) {
        return { code: 'ROOM_SELECTION_MISMATCH', message: 'The selected room does not match the published room type.', status: 409 }
      }
    }
    return null
  } catch {
    // A database/lookup failure is not permission to confirm the booking.
    return { code: 'ROOM_PUBLICATION_CHECK_FAILED', message: 'Room publication could not be verified.', status: 503 }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      guest,
      booking,
      payment_amount,
    } = await req.json()

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(JSON.stringify({ error: 'Missing payment parameters' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (!booking || !guest) {
      return new Response(JSON.stringify({ error: 'Missing booking details' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { keyId, secret } = await getRazorpayCredentials(supabase)

    // Toggle: set ALLOW_TEST_BOOKINGS=false to stop test-mode payments from
    // creating confirmed bookings once the account goes live.
    const isTestMode = keyId.startsWith('rzp_test')
    const allowTestBookings = (Deno.env.get('ALLOW_TEST_BOOKINGS') ?? 'true') !== 'false'
    if (isTestMode && !allowTestBookings) {
      return new Response(JSON.stringify({ error: 'Test-mode payments are not accepted' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const valid = await isSignatureValid(secret, razorpay_order_id, razorpay_payment_id, razorpay_signature)
    if (!valid) {
      return new Response(JSON.stringify({ error: 'Invalid payment signature' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Idempotency: if this payment was already recorded, return existing booking
    const { data: existingBooking, error: existingBookingError } = await supabase
      .from('bookings')
      .select('booking_id, room_unit_id, payment_status')
      .eq('payment_id', razorpay_payment_id)
      .maybeSingle()

    // Keep reconciliation references, but never log the signature or guest data.
    const resolutionRequired = (code: string, message: string, status: number, bookingStatus = 'not_confirmed') => {
      const resolution = {
        success: false,
        code,
        error: message,
        resolution_required: true,
        booking_status: bookingStatus,
        payment_reference: razorpay_payment_id,
        order_reference: razorpay_order_id,
        payment_verification: 'signature_verified',
        next_action: 'Contact the hotel with these references. Do not pay again until the payment and booking outcome have been checked.',
      }
      console.error('website_booking_resolution_required', {
        code, booking_status: bookingStatus,
        payment_reference: razorpay_payment_id, order_reference: razorpay_order_id,
      })
      return new Response(JSON.stringify(resolution), {
        status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (existingBookingError) {
      return resolutionRequired('BOOKING_LOOKUP_FAILED', 'The existing booking outcome could not be verified.', 503, 'unknown')
    }
    if (existingBooking) {
      // An already-confirmed payment stays idempotent even if its type was later unpublished.
      // A cancelled/pending booking must not be represented as a new confirmation.
      if (existingBooking.payment_status !== 'confirmed') {
        return resolutionRequired('EXISTING_BOOKING_REQUIRES_REVIEW', 'This payment is linked to a booking that is not confirmed.', 409)
      }
      return new Response(JSON.stringify({ success: true, booking_id: existingBooking.booking_id, room_unit_id: existingBooking.room_unit_id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const publicationFailure = await checkPublishedRoomSelection(supabase, booking)
    if (publicationFailure) {
      return resolutionRequired(publicationFailure.code, publicationFailure.message, publicationFailure.status)
    }

    // Guest upsert
    let guestId: string | null = null
    const orFilters: string[] = []
    if (guest.email) orFilters.push(`email.eq.${guest.email}`)
    if (guest.phone) orFilters.push(`phone.eq.${guest.phone}`)

    if (orFilters.length > 0) {
      const { data: existingGuests } = await supabase
        .from('guests')
        .select('id')
        .or(orFilters.join(','))
        .limit(1)

      if (existingGuests && existingGuests.length > 0) {
        guestId = existingGuests[0].id
        await supabase.from('guests').update({
          first_name: guest.first_name,
          last_name: guest.last_name,
          email: guest.email,
          phone: guest.phone,
          gender: guest.gender || null,
        }).eq('id', guestId)
      }
    }

    if (!guestId) {
      const { data: newGuest, error: guestError } = await supabase
        .from('guests')
        .insert([{
          first_name: guest.first_name,
          last_name: guest.last_name,
          email: guest.email,
          phone: guest.phone,
          gender: guest.gender || null,
        }])
        .select('id')
        .single()

      if (guestError) throw guestError
      guestId = newGuest.id
    }

    if (guestId && guest.id_type && guest.id_number) {
      await supabase.from('guest_identity_documents').insert([{
        guest_id: guestId,
        document_type: guest.id_type,
        document_number: guest.id_number,
        is_verified: false,
      }])
    }

    // --- Room inventory allocation -------------------------------------
    // Pick a concrete room unit so the booking blocks inventory and shows up
    // on the backend calendar. Only runs for successfully paid bookings.
    let assignedUnitId: string | null = booking.room_unit_id ?? null

    if (!assignedUnitId && booking.room_type_id && booking.check_in && booking.check_out) {
      const { data: units } = await supabase
        .from('room_units')
        .select('id, unit_number')
        .eq('room_type_id', booking.room_type_id)
        .eq('is_active', true)
        .neq('status', 'maintenance')
        .order('unit_number', { ascending: true })

      if (units && units.length > 0) {
        const { data: overlapping } = await supabase
          .from('bookings')
          .select('room_unit_id')
          .in('room_unit_id', units.map((u: any) => u.id))
          .neq('payment_status', 'cancelled')
          .lt('check_in', booking.check_out)
          .gt('check_out', booking.check_in)

        const taken = new Set((overlapping ?? []).map((b: any) => b.room_unit_id))
        const free = units.find((u: any) => !taken.has(u.id))
        assignedUnitId = free ? free.id : null
        if (!assignedUnitId) {
          console.error('No free room unit for paid booking', {
            room_type_id: booking.room_type_id, check_in: booking.check_in, check_out: booking.check_out
          })
        }
      }
    }

    // Re-read immediately before confirmation, rather than relying on an earlier UI/cache value.
    // This remains a point-in-time check, not a database transaction locking publication changes.
    const finalPublicationFailure = await checkPublishedRoomSelection(supabase, booking)
    if (finalPublicationFailure) {
      return resolutionRequired(finalPublicationFailure.code, finalPublicationFailure.message, finalPublicationFailure.status)
    }

    const bookingRecord = {
      ...booking,
      room_unit_id: assignedUnitId,
      guest_id: guestId,
      payment_status: 'confirmed',
      payment_method: 'razorpay',
      payment_id: razorpay_payment_id,
      payment_order_id: razorpay_order_id,
    }

    const { data: bookingResult, error: bookingError } = await supabase
      .from('bookings')
      .insert([bookingRecord])
      .select()
      .single()

    if (bookingError) {
      console.error('Booking insert failed:', bookingError)
      return new Response(JSON.stringify({ error: bookingError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Mark the unit occupied if the stay has already started (today's arrivals).
    if (assignedUnitId) {
      const today = new Date().toISOString().slice(0, 10)
      if (booking.check_in <= today && booking.check_out > today) {
        await supabase.from('room_units').update({ status: 'occupied' }).eq('id', assignedUnitId)
      }
    }


    const { error: paymentError } = await supabase.from('payments').insert({
      booking_id: bookingResult.id,
      invoice_id: null,
      amount: payment_amount ?? bookingResult.total_amount,
      payment_method: 'razorpay',
      razorpay_payment_id,
      razorpay_order_id,
      status: 'completed',
      payment_date: new Date().toISOString(),
      transaction_reference: razorpay_payment_id,
    })
    if (paymentError) console.error('Payment record failed:', paymentError)

    try {
      await supabase.functions.invoke('send-booking-confirmation', {
        body: { booking_id: bookingResult.booking_id }
      })
    } catch (emailError) {
      console.error('Confirmation email failed:', emailError)
    }

    return new Response(JSON.stringify({ success: true, booking_id: bookingResult.booking_id, room_unit_id: assignedUnitId, is_test_payment: isTestMode }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('finalize-booking error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message || 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
