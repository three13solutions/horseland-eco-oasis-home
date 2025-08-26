
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function decryptSecret(encryptedBase64: string, encryptionKey: string): Promise<string> {
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  
  const encryptedData = JSON.parse(atob(encryptedBase64))
  const iv = new Uint8Array(encryptedData.iv)
  const data = new Uint8Array(encryptedData.data)

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(encryptionKey.padEnd(32, '0').slice(0, 32)),
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  )

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )

  return decoder.decode(decrypted)
}

async function verifyRazorpay(secrets: Record<string, string>): Promise<{ success: boolean, message: string }> {
  const keyId = secrets['RAZORPAY_KEY_ID']
  const secret = secrets['RAZORPAY_SECRET']

  if (!keyId || !secret) {
    return { success: false, message: 'Missing Razorpay credentials' }
  }

  try {
    // Test Razorpay by trying to fetch orders (which requires auth)
    const auth = btoa(`${keyId}:${secret}`)
    const response = await fetch('https://api.razorpay.com/v1/orders?count=1', {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      return { success: true, message: 'Razorpay connection verified successfully' }
    } else {
      return { success: false, message: `Razorpay verification failed: ${response.status}` }
    }
  } catch (error) {
    return { success: false, message: `Razorpay verification error: ${error.message}` }
  }
}

async function verifyMapbox(secrets: Record<string, string>): Promise<{ success: boolean, message: string }> {
  const token = secrets['MAPBOX_PUBLIC_TOKEN']

  if (!token) {
    return { success: false, message: 'Missing Mapbox token' }
  }

  try {
    // Test Mapbox by making a simple API call
    const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/test.json?access_token=${token}`)
    
    if (response.ok) {
      return { success: true, message: 'Mapbox connection verified successfully' }
    } else {
      return { success: false, message: `Mapbox verification failed: ${response.status}` }
    }
  } catch (error) {
    return { success: false, message: `Mapbox verification error: ${error.message}` }
  }
}

serve(async (req) => {
  console.log('Verify integration function called with method:', req.method)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Parsing request body...')
    const { integrationId } = await req.json()
    console.log('Integration ID:', integrationId)

    if (!integrationId) {
      console.log('Missing integrationId')
      return new Response(
        JSON.stringify({ error: 'Missing integrationId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Creating Supabase client...')
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the JWT from the Authorization header
    const authHeader = req.headers.get('Authorization')
    console.log('Auth header present:', !!authHeader)
    
    if (!authHeader) {
      console.log('Missing authorization header')
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('Token extracted, length:', token.length)
    
    // Create user client to verify the user
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    )

    console.log('Getting user from JWT...')
    // Get the user from the JWT
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    console.log('User retrieved:', !!user, 'Error:', userError?.message)
    
    if (userError || !user) {
      console.log('Invalid token or user error')
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Checking admin profile for user:', user.id)
    // Verify user is admin
    const { data: profile } = await supabaseClient
      .from('admin_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    console.log('Admin profile found:', !!profile)
    if (!profile) {
      console.log('User is not admin')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get integration and its secrets
    const { data: integration } = await supabaseClient
      .from('api_integrations')
      .select(`
        integration_key,
        api_integration_secrets(key, value_encrypted)
      `)
      .eq('id', integrationId)
      .single()

    if (!integration) {
      return new Response(
        JSON.stringify({ error: 'Integration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get encryption key
    const encryptionKey = Deno.env.get('INTEGRATIONS_ENCRYPTION_KEY')
    if (!encryptionKey) {
      return new Response(
        JSON.stringify({ error: 'Encryption key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Decrypt secrets
    const secrets: Record<string, string> = {}
    for (const secret of integration.api_integration_secrets) {
      try {
        secrets[secret.key] = await decryptSecret(secret.value_encrypted, encryptionKey)
      } catch (error) {
        console.error(`Failed to decrypt secret ${secret.key}:`, error)
      }
    }

    // Verify based on integration type
    let result: { success: boolean, message: string }

    switch (integration.integration_key) {
      case 'razorpay':
        result = await verifyRazorpay(secrets)
        break
      case 'mapbox':
        result = await verifyMapbox(secrets)
        break
      default:
        result = { success: false, message: 'Verification not implemented for this integration' }
    }

    // Update integration status
    await supabaseClient
      .from('api_integrations')
      .update({
        status: result.success ? 'ok' : 'error',
        last_verified_at: new Date().toISOString()
      })
      .eq('id', integrationId)

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error verifying integration:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
