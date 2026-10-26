import { createClient as createDistributionClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { legacyCheckoutAdmission } from '../_shared/distributionLegacyGuard.ts'

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
    const { amount, currency = 'INR', notes = {} } = await req.json()

    if (!amount) {
      return new Response(
        JSON.stringify({ error: 'Amount is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const admissionDb = createDistributionClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
    const admission = await legacyCheckoutAdmission(admissionDb)
    if (admission !== 'legacy_allowed') return new Response(JSON.stringify({ code: admission === 'refresh_required' ? 'CHECKOUT_REFRESH_REQUIRED' : 'CHECKOUT_UNAVAILABLE', error: 'Refresh the website checkout before starting a new payment. No order was created by this request.' }), { status: admission === 'refresh_required' ? 409 : 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { keyId, secret } = await getRazorpayCredentials()
    if (!keyId.startsWith('rzp_test_')) throw new Error('This rollout supports test payments only; live payment processing is disabled.')

    const order = {
      amount: Math.round(amount * 100), // Convert to paise
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

    return new Response(
      JSON.stringify(orderData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error creating Razorpay order:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
