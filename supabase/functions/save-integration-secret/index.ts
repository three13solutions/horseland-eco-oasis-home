
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { integrationId, secrets } = await req.json()

    if (!integrationId || !secrets) {
      return new Response(
        JSON.stringify({ error: 'Missing integrationId or secrets' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the JWT from the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Set the auth token for the client
    const token = authHeader.replace('Bearer ', '')
    supabaseClient.auth.setAuth(token)

    // Verify user is admin
    const { data: profile } = await supabaseClient
      .from('admin_profiles')
      .select('role')
      .eq('user_id', (await supabaseClient.auth.getUser()).data.user?.id)
      .single()

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get encryption key from Supabase secrets
    const encryptionKey = Deno.env.get('INTEGRATIONS_ENCRYPTION_KEY')
    if (!encryptionKey) {
      return new Response(
        JSON.stringify({ error: 'Encryption key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Simple encryption using built-in crypto (for demo purposes)
    // In production, you might want to use a more robust encryption method
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(encryptionKey.padEnd(32, '0').slice(0, 32)),
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    )

    // Save each secret
    for (const [secretKey, secretValue] of Object.entries(secrets)) {
      if (secretValue && secretValue.trim()) {
        const iv = crypto.getRandomValues(new Uint8Array(12))
        const encrypted = await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv },
          key,
          encoder.encode(secretValue as string)
        )

        const encryptedData = {
          iv: Array.from(iv),
          data: Array.from(new Uint8Array(encrypted))
        }

        const encryptedBase64 = btoa(JSON.stringify(encryptedData))

        // Upsert the secret
        await supabaseClient
          .from('api_integration_secrets')
          .upsert({
            integration_id: integrationId,
            key: secretKey,
            value_encrypted: encryptedBase64
          })
      }
    }

    // Update integration status to indicate it might be configured
    await supabaseClient
      .from('api_integrations')
      .update({ 
        status: 'ok',
        last_verified_at: new Date().toISOString()
      })
      .eq('id', integrationId)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error saving integration secret:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
