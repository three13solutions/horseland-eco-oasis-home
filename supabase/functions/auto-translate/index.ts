import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple Google Translate API using fetch
async function translateText(text: string, targetLanguage: string, sourceLanguage: string = 'en') {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLanguage}&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(text)}`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Translation failed: ${response.status}`);
  }
  
  const result = await response.json();
  
  // Parse the Google Translate response
  let translatedText = '';
  if (result && result[0]) {
    for (const item of result[0]) {
      if (item[0]) {
        translatedText += item[0];
      }
    }
  }
  
  return translatedText || text;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { text, targetLanguage, sourceLanguage = 'en' } = await req.json();

    // Use Google Translate API
    const translatedText = await translateText(text, targetLanguage, sourceLanguage);

    return new Response(
      JSON.stringify({ 
        translatedText,
        sourceLanguage,
        targetLanguage,
        originalText: text
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in auto-translate:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});