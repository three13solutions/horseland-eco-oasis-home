
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getRazorpayCredentials() {
  // First try to get from new integrations system
  try {
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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking_id } = await req.json()

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(
        JSON.stringify({ error: 'Missing required payment parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { secret } = await getRazorpayCredentials()

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id
    const expectedSignature = await crypto.subtle.sign(
      "HMAC",
      await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      ),
      new TextEncoder().encode(body)
    )

    const expectedSignatureHex = Array.from(new Uint8Array(expectedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    if (expectedSignatureHex !== razorpay_signature) {
      return new Response(
        JSON.stringify({ error: 'Invalid payment signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update booking payment status
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (booking_id) {
      const { error } = await supabase
        .from('bookings')
        .update({
          payment_status: 'completed',
          payment_id: razorpay_payment_id,
          payment_order_id: razorpay_order_id
        })
        .eq('id', booking_id)

      if (error) {
        console.error('Error updating booking:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to update booking' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Payment verified successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error verifying payment:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Payment verification failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
