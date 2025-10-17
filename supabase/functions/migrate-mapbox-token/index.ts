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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    const token = authHeader.replace('Bearer ', '')
    
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

    // Get the user from the JWT
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user is admin
    const { data: profile } = await supabaseClient
      .from('admin_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Mapbox integration and its secrets
    const { data: integration } = await supabaseClient
      .from('api_integrations')
      .select(`
        id,
        integration_key,
        api_integration_secrets(key, value_encrypted)
      `)
      .eq('integration_key', 'mapbox')
      .single()

    if (!integration) {
      return new Response(
        JSON.stringify({ error: 'Mapbox integration not found' }),
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

    // Decrypt the MAPBOX_PUBLIC_TOKEN secret
    let publicToken = ''
    for (const secret of integration.api_integration_secrets || []) {
      if (secret.key === 'MAPBOX_PUBLIC_TOKEN') {
        try {
          publicToken = await decryptSecret(secret.value_encrypted, encryptionKey)
        } catch (error) {
          console.error('Failed to decrypt Mapbox token:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to decrypt token' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    }

    if (!publicToken) {
      return new Response(
        JSON.stringify({ error: 'Mapbox public token not found in secrets' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update the integration with the public token and enable it
    const { error: updateError } = await supabaseClient
      .from('api_integrations')
      .update({
        public_config: { MAPBOX_PUBLIC_TOKEN: publicToken },
        is_enabled: true,
        status: 'ok'
      })
      .eq('id', integration.id)

    if (updateError) {
      console.error('Error updating integration:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update integration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Delete the secret since it's now in public_config
    const { error: deleteError } = await supabaseClient
      .from('api_integration_secrets')
      .delete()
      .eq('integration_id', integration.id)
      .eq('key', 'MAPBOX_PUBLIC_TOKEN')

    if (deleteError) {
      console.error('Error deleting secret:', deleteError)
      // Don't fail the request if deletion fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Mapbox token migrated successfully and integration enabled' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
