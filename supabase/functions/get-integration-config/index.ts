
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
    const url = new URL(req.url)
    const integrationKey = url.searchParams.get('key')

    if (!integrationKey) {
      return new Response(
        JSON.stringify({ error: 'Missing integration key' }),
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

    // Get integration details (without actual secret values)
    const { data: integration, error } = await supabaseClient
      .from('api_integrations')
      .select(`
        *,
        api_integration_secrets!inner(key)
      `)
      .eq('integration_key', integrationKey)
      .single()

    if (error) {
      return new Response(
        JSON.stringify({ error: 'Integration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Return config with secret keys present (but not values)
    const secretsPresent = integration.api_integration_secrets.reduce((acc: any, secret: any) => {
      acc[secret.key] = true
      return acc
    }, {})

    const response = {
      ...integration,
      secrets_present: secretsPresent,
      api_integration_secrets: undefined // Remove the actual secrets data
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error getting integration config:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
