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

    console.log('Starting media hash backfill...');

    // Get all media without hashes
    const { data: mediaWithoutHash, error: fetchError } = await supabaseClient
      .from('gallery_images')
      .select('id, image_url, video_url, media_type, source_type')
      .is('file_hash', null)
      .limit(100); // Process in batches of 100

    if (fetchError) {
      console.error('Error fetching media:', fetchError);
      throw fetchError;
    }

    if (!mediaWithoutHash || mediaWithoutHash.length === 0) {
      console.log('No media found without hashes');
      return new Response(
        JSON.stringify({ 
          message: 'All media already has hashes!',
          processed: 0,
          skipped: 0,
          errors: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${mediaWithoutHash.length} media items to process`);

    let processed = 0;
    let skipped = 0;
    let errors = 0;
    const errorDetails: any[] = [];

    for (const media of mediaWithoutHash) {
      try {
        // Skip hardcoded/external media (can't download them)
        if (media.source_type === 'hardcoded' || media.source_type === 'external') {
          console.log(`Skipping ${media.source_type} media: ${media.id}`);
          skipped++;
          continue;
        }

        const url = media.media_type === 'image' ? media.image_url : media.video_url;
        if (!url) {
          console.log(`No URL for media: ${media.id}`);
          skipped++;
          continue;
        }

        // Download the file
        console.log(`Downloading: ${url}`);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to download: ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();
        const fileSize = buffer.byteLength;
        const fileHash = await calculateFileHash(buffer);

        // Get dimensions if it's an image
        let width: number | null = null;
        let height: number | null = null;
        
        if (media.media_type === 'image') {
          try {
            // For images, we can't easily get dimensions server-side
            // This would require image processing libraries
            // For now, we'll leave dimensions as null and they'll be filled on next upload
            console.log('Image dimensions will be calculated on next upload');
          } catch (err) {
            console.warn('Could not get dimensions:', err);
          }
        }

        // Extract filename from URL
        const urlParts = url.split('/');
        const filename = urlParts[urlParts.length - 1];

        // Update the media entry
        const { error: updateError } = await supabaseClient
          .from('gallery_images')
          .update({
            file_hash: fileHash,
            file_size: fileSize,
            original_filename: filename,
            width,
            height,
          })
          .eq('id', media.id);

        if (updateError) {
          throw updateError;
        }

        console.log(`✓ Processed: ${media.id} (${fileSize} bytes, hash: ${fileHash.substring(0, 8)}...)`);
        processed++;

      } catch (error) {
        console.error(`Error processing media ${media.id}:`, error);
        errors++;
        errorDetails.push({
          id: media.id,
          url: media.image_url || media.video_url,
          error: error.message
        });
      }
    }

    const result = {
      message: `Backfill complete: ${processed} processed, ${skipped} skipped, ${errors} errors`,
      processed,
      skipped,
      errors,
      errorDetails: errors > 0 ? errorDetails : undefined
    };

    console.log('Backfill summary:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Fatal error in backfill function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});