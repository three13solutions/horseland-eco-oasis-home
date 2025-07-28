import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranslationEntry {
  language_code: string;
  section: string;
  key: string;
  value: string;
}

function flattenObject(obj: any, prefix = ''): { [key: string]: string } {
  const flattened: { [key: string]: string } = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(flattened, flattenObject(obj[key], newKey));
      } else {
        flattened[newKey] = String(obj[key]);
      }
    }
  }
  
  return flattened;
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

    const { translations } = await req.json();
    
    const translationEntries: TranslationEntry[] = [];
    
    // Process each language
    for (const [languageCode, content] of Object.entries(translations)) {
      const flattened = flattenObject(content);
      
      for (const [key, value] of Object.entries(flattened)) {
        const section = key.split('.')[0];
        translationEntries.push({
          language_code: languageCode,
          section,
          key,
          value
        });
      }
    }

    // Clear existing translations
    await supabaseClient.from('translations').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Insert new translations in batches
    const batchSize = 100;
    for (let i = 0; i < translationEntries.length; i += batchSize) {
      const batch = translationEntries.slice(i, i + batchSize);
      const { error } = await supabaseClient.from('translations').insert(batch);
      if (error) {
        console.error('Error inserting batch:', error);
        throw error;
      }
    }

    console.log(`Successfully migrated ${translationEntries.length} translations`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        migratedCount: translationEntries.length,
        message: 'Successfully migrated translations from JSON to database'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in migrate-json-to-db:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});