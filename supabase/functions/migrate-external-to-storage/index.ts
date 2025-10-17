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

    console.log('Starting external media migration to storage...');

    // Get all external media
    const { data: externalMedia, error: fetchError } = await supabaseClient
      .from('gallery_images')
      .select('id, title, image_url, media_type')
      .eq('source_type', 'external');

    if (fetchError) {
      console.error('Error fetching external media:', fetchError);
      throw fetchError;
    }

    if (!externalMedia || externalMedia.length === 0) {
      console.log('No external media found');
      return new Response(
        JSON.stringify({ 
          message: 'No external media to migrate',
          processed: 0,
          skipped: 0,
          errors: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${externalMedia.length} external media items to migrate`);

    let processed = 0;
    let skipped = 0;
    let errors = 0;
    const errorDetails: any[] = [];

    for (const media of externalMedia) {
      try {
        const url = media.image_url;
        if (!url) {
          console.log(`No URL for media: ${media.id}`);
          skipped++;
          continue;
        }

        console.log(`Downloading: ${url}`);
        
        // Download the image from external URL
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to download: ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();
        const fileSize = buffer.byteLength;
        const fileHash = await calculateFileHash(buffer);

        // Extract file extension from URL or content-type
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const ext = contentType.split('/')[1] || 'jpg';
        
        // Generate a unique filename
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 15);
        const filename = `external-media/${timestamp}-${randomStr}.${ext}`;

        console.log(`Uploading to storage: ${filename} (${fileSize} bytes)`);

        // Upload to Supabase storage
        const { data: uploadData, error: uploadError } = await supabaseClient
          .storage
          .from('uploads')
          .upload(filename, buffer, {
            contentType: contentType,
            upsert: false
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Get the public URL
        const { data: { publicUrl } } = supabaseClient
          .storage
          .from('uploads')
          .getPublicUrl(filename);

        console.log(`Uploaded successfully: ${publicUrl}`);

        // Update the gallery_images record
        const { error: updateError } = await supabaseClient
          .from('gallery_images')
          .update({
            image_url: publicUrl,
            source_type: 'upload',
            file_hash: fileHash,
            file_size: fileSize,
            original_filename: `${media.title.replace(/[^a-zA-Z0-9]/g, '-')}.${ext}`,
          })
          .eq('id', media.id);

        if (updateError) {
          throw updateError;
        }

        console.log(`✓ Migrated: ${media.id} - "${media.title}"`);
        processed++;

      } catch (error) {
        console.error(`Error migrating media ${media.id}:`, error);
        errors++;
        errorDetails.push({
          id: media.id,
          title: media.title,
          url: media.image_url,
          error: error.message
        });
      }
    }

    const result = {
      message: `Migration complete: ${processed} migrated, ${skipped} skipped, ${errors} errors`,
      processed,
      skipped,
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
