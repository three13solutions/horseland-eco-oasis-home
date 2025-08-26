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

    // Get Razorpay integration
    const { data: integration } = await supabaseClient
      .from('api_integrations')
      .select(`
        id,
        status,
        api_integration_secrets(key, value_encrypted)
      `)
      .eq('integration_key', 'razorpay')
      .single()

    if (!integration || integration.status !== 'ok') {
      return new Response(
        JSON.stringify({ error: 'Razorpay not configured' }),
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

    // Find and decrypt the Key ID (which is public)
    let keyId = 'rzp_test_1DP5mmOlF5G5ag' // fallback
    
    const keyIdSecret = integration.api_integration_secrets?.find(s => s.key === 'RAZORPAY_KEY_ID')
    if (keyIdSecret) {
      try {
        keyId = await decryptSecret(keyIdSecret.value_encrypted, encryptionKey)
      } catch (error) {
        console.error('Failed to decrypt Razorpay Key ID:', error)
      }
    }

    return new Response(
      JSON.stringify({ key_id: keyId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error getting Razorpay public key:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})