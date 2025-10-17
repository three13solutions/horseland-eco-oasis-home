import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function calculateFileHash(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { 
        auth: {
          persistSession: false,
        }
      }
    );

    console.log('Starting migration of local files to Supabase storage...');

    // Get all media with local file paths
    const { data: localMedia, error: fetchError } = await supabaseClient
      .from('gallery_images')
      .select('id, title, image_url, category, source_type')
      .like('image_url', '/lovable-uploads/%');

    if (fetchError) {
      console.error('Error fetching local media:', fetchError);
      throw fetchError;
    }

    if (!localMedia || localMedia.length === 0) {
      console.log('No local files found to migrate');
      return new Response(
        JSON.stringify({ 
          message: 'All files already in storage!',
          migrated: 0,
          errors: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${localMedia.length} local files to migrate`);

    let migrated = 0;
    let errors = 0;
    const errorDetails: any[] = [];

    // Get the base URL from the request
    const { baseUrl } = await req.json().catch(() => ({ baseUrl: null }));
    
    if (!baseUrl) {
      throw new Error('baseUrl is required in request body');
    }

    for (const media of localMedia) {
      try {
        const localPath = media.image_url;
        const fileName = localPath.split('/').pop();
        const fullUrl = `${baseUrl}${localPath}`;
        
        console.log(`Migrating: ${fileName} from ${fullUrl}`);

        // Download the file from the local path
        const response = await fetch(fullUrl);
        if (!response.ok) {
          throw new Error(`Failed to download: ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();
        const fileSize = buffer.byteLength;
        const fileHash = await calculateFileHash(buffer);

        // Determine the bucket and path based on category
        let bucket = 'uploads';
        let storagePath = `blog-images/${fileName}`;
        
        if (media.category !== 'blog') {
          storagePath = `gallery/${fileName}`;
        }

        // Upload to Supabase storage
        const { data: uploadData, error: uploadError } = await supabaseClient
          .storage
          .from(bucket)
          .upload(storagePath, buffer, {
            contentType: 'image/png',
            upsert: false
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get the public URL
        const { data: { publicUrl } } = supabaseClient
          .storage
          .from(bucket)
          .getPublicUrl(storagePath);

        // Update the database record
        const { error: updateError } = await supabaseClient
          .from('gallery_images')
          .update({
            image_url: publicUrl,
            source_type: 'upload',
            file_hash: fileHash,
            file_size: fileSize,
            original_filename: fileName
          })
          .eq('id', media.id);

        if (updateError) {
          throw updateError;
        }

        console.log(`✓ Migrated: ${fileName} → ${publicUrl}`);
        console.log(`  Hash: ${fileHash.substring(0, 8)}..., Size: ${fileSize} bytes`);
        migrated++;

      } catch (error) {
        console.error(`Error migrating ${media.image_url}:`, error);
        errors++;
        errorDetails.push({
          id: media.id,
          url: media.image_url,
          error: error.message
        });
      }
    }

    const result = {
      message: `Migration complete: ${migrated} migrated, ${errors} errors`,
      migrated,
      errors,
      errorDetails: errors > 0 ? errorDetails : undefined
    };

    console.log('Migration summary:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Fatal error in migration function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
