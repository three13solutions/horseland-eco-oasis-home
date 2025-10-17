import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all categories
    const { data: categories } = await supabase
      .from('gallery_categories')
      .select('id, slug');

    const categoryMap = new Map(categories?.map(c => [c.slug, c.id]) || []);

    const results = {
      blog: 0,
      spa: 0,
      activities: 0,
      rooms: 0,
      packages: 0,
      dining: 0,
      pages: 0,
      skipped: 0,
      errors: [] as string[]
    };

    // Helper function to insert media
    const insertMedia = async (url: string, category: string, title: string, caption?: string) => {
      if (!url || url.includes('blob:') || url === '' || url === 'null') {
        results.skipped++;
        return false;
      }

      // Check if already exists
      const { data: existing } = await supabase
        .from('gallery_images')
        .select('id')
        .eq('image_url', url)
        .maybeSingle();

      if (existing) {
        results.skipped++;
        return false;
      }

      // Determine source type
      let sourceType = 'external';
      if (url.includes('supabase.co/storage')) {
        sourceType = 'upload';
      } else if (url.includes('/lovable-uploads/')) {
        sourceType = 'mirrored';
      }

      const { error } = await supabase
        .from('gallery_images')
        .insert({
          image_url: url,
          title: title || 'Migrated Image',
          caption: caption || `Migrated from ${category}`,
          category,
          category_id: categoryMap.get(category),
          media_type: 'image',
          source_type: sourceType,
          is_hardcoded: false,
          sort_order: 0
        });

      if (error) {
        console.error(`Failed to insert ${title}:`, error);
        results.errors.push(`${title}: ${error.message}`);
        return false;
      }
      
      return true;
    };

    // Migrate blog posts
    console.log('Starting blog migration...');
    const { data: blogs } = await supabase
      .from('blog_posts')
      .select('id, title, featured_image');

    for (const blog of blogs || []) {
      if (blog.featured_image) {
        const success = await insertMedia(
          blog.featured_image,
          'blog',
          `Blog: ${blog.title}`,
          `Featured image for ${blog.title}`
        );
        if (success) results.blog++;
      }
    }
    console.log(`Blog migration complete: ${results.blog} images`);

    // Migrate spa services
    console.log('Starting spa migration...');
    const { data: spaServices } = await supabase
      .from('spa_services')
      .select('id, title, image, media_urls');

    for (const spa of spaServices || []) {
      if (spa.image) {
        const success = await insertMedia(spa.image, 'spa', `Spa: ${spa.title}`);
        if (success) results.spa++;
      }
      if (spa.media_urls && Array.isArray(spa.media_urls)) {
        for (const url of spa.media_urls) {
          const success = await insertMedia(url, 'spa', `Spa Gallery: ${spa.title}`);
          if (success) results.spa++;
        }
      }
    }
    console.log(`Spa migration complete: ${results.spa} images`);

    // Migrate activities
    console.log('Starting activities migration...');
    const { data: activities } = await supabase
      .from('activities')
      .select('id, title, image, media_urls');

    for (const activity of activities || []) {
      if (activity.image) {
        const success = await insertMedia(activity.image, 'activities', `Activity: ${activity.title}`);
        if (success) results.activities++;
      }
      if (activity.media_urls && Array.isArray(activity.media_urls)) {
        for (const url of activity.media_urls) {
          const success = await insertMedia(url, 'activities', `Activity Gallery: ${activity.title}`);
          if (success) results.activities++;
        }
      }
    }
    console.log(`Activities migration complete: ${results.activities} images`);

    // Migrate room types
    console.log('Starting rooms migration...');
    const { data: rooms } = await supabase
      .from('room_types')
      .select('id, name, hero_image, gallery');

    for (const room of rooms || []) {
      if (room.hero_image) {
        const success = await insertMedia(room.hero_image, 'rooms', `Room: ${room.name}`);
        if (success) results.rooms++;
      }
      if (room.gallery && Array.isArray(room.gallery)) {
        for (const url of room.gallery) {
          const success = await insertMedia(url, 'rooms', `Room Gallery: ${room.name}`);
          if (success) results.rooms++;
        }
      }
    }
    console.log(`Rooms migration complete: ${results.rooms} images`);

    // Migrate packages
    console.log('Starting packages migration...');
    const { data: packages } = await supabase
      .from('packages')
      .select('id, title, featured_image, banner_image, gallery');

    for (const pkg of packages || []) {
      if (pkg.featured_image) {
        const success = await insertMedia(pkg.featured_image, 'packages', `Package: ${pkg.title}`);
        if (success) results.packages++;
      }
      if (pkg.banner_image) {
        const success = await insertMedia(pkg.banner_image, 'packages', `Package Banner: ${pkg.title}`);
        if (success) results.packages++;
      }
      if (pkg.gallery && Array.isArray(pkg.gallery)) {
        for (const url of pkg.gallery) {
          const success = await insertMedia(url, 'packages', `Package Gallery: ${pkg.title}`);
          if (success) results.packages++;
        }
      }
    }
    console.log(`Packages migration complete: ${results.packages} images`);

    // Migrate meals
    console.log('Starting dining migration...');
    const { data: meals } = await supabase
      .from('meals')
      .select('id, title, featured_media, media_urls');

    for (const meal of meals || []) {
      if (meal.featured_media) {
        const success = await insertMedia(meal.featured_media, 'dining', `Meal: ${meal.title}`);
        if (success) results.dining++;
      }
      if (meal.media_urls && Array.isArray(meal.media_urls)) {
        for (const url of meal.media_urls) {
          const success = await insertMedia(url, 'dining', `Meal Gallery: ${meal.title}`);
          if (success) results.dining++;
        }
      }
    }
    console.log(`Dining migration complete: ${results.dining} images`);

    // Migrate pages (hero images and OG images)
    console.log('Starting pages migration...');
    const { data: pages } = await supabase
      .from('pages')
      .select('id, title, hero_image, og_image, hero_gallery');

    for (const page of pages || []) {
      if (page.hero_image) {
        const success = await insertMedia(page.hero_image, 'hero-banners', `Page Hero: ${page.title}`);
        if (success) results.pages++;
      }
      if (page.og_image) {
        const success = await insertMedia(page.og_image, 'seo', `Page OG: ${page.title}`);
        if (success) results.pages++;
      }
      if (page.hero_gallery && Array.isArray(page.hero_gallery)) {
        for (const url of page.hero_gallery) {
          const success = await insertMedia(url, 'hero-banners', `Page Carousel: ${page.title}`);
          if (success) results.pages++;
        }
      }
    }
    console.log(`Pages migration complete: ${results.pages} images`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        message: `Migration complete! Added ${results.blog + results.spa + results.activities + results.rooms + results.packages + results.dining + results.pages} images to gallery_images. Skipped ${results.skipped} duplicates/invalid URLs.`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
