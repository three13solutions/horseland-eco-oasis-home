import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MediaStats {
  total: number;
  used: number;
  unused: number;
  byType: {
    pages: number;
    blogs: number;
    rooms: number;
    packages: number;
    activities: number;
    spa: number;
    meals: number;
  };
  byMediaType: {
    images: number;
    videos: number;
  };
}

export const useMediaStats = () => {
  return useQuery({
    queryKey: ['media-stats'],
    queryFn: async () => {
      // Get all images
      const { data: images, error: imagesError } = await supabase
        .from('gallery_images')
        .select('id, image_url, media_type');

      if (imagesError) throw imagesError;

      const stats: MediaStats = {
        total: images?.length || 0,
        used: 0,
        unused: 0,
        byType: {
          pages: 0,
          blogs: 0,
          rooms: 0,
          packages: 0,
          activities: 0,
          spa: 0,
          meals: 0,
        },
        byMediaType: {
          images: images?.filter(img => img.media_type === 'image').length || 0,
          videos: images?.filter(img => img.media_type === 'video').length || 0,
        },
      };

      if (!images) return stats;

      // Check usage for each image
      const usagePromises = images.map(async (img) => {
        const imageUrl = img.image_url;
        
        // Check all tables for usage
        const [pages, blogs, rooms, packages, activities, spa, meals] = await Promise.all([
          supabase.from('pages').select('id').or(`hero_image.eq.${imageUrl},og_image.eq.${imageUrl}`),
          supabase.from('blog_posts').select('id').eq('featured_image', imageUrl),
          supabase.from('room_types').select('id').eq('hero_image', imageUrl),
          supabase.from('packages').select('id').or(`featured_image.eq.${imageUrl},banner_image.eq.${imageUrl}`),
          supabase.from('activities').select('id').eq('image', imageUrl),
          supabase.from('spa_services').select('id').eq('image', imageUrl),
          supabase.from('meals').select('id').eq('featured_media', imageUrl),
        ]);

        const usageCount = [
          pages.data?.length || 0,
          blogs.data?.length || 0,
          rooms.data?.length || 0,
          packages.data?.length || 0,
          activities.data?.length || 0,
          spa.data?.length || 0,
          meals.data?.length || 0,
        ].reduce((a, b) => a + b, 0);

        return {
          isUsed: usageCount > 0,
          byType: {
            pages: pages.data?.length || 0,
            blogs: blogs.data?.length || 0,
            rooms: rooms.data?.length || 0,
            packages: packages.data?.length || 0,
            activities: activities.data?.length || 0,
            spa: spa.data?.length || 0,
            meals: meals.data?.length || 0,
          }
        };
      });

      const usageResults = await Promise.all(usagePromises);

      // Aggregate results
      usageResults.forEach(result => {
        if (result.isUsed) {
          stats.used++;
        } else {
          stats.unused++;
        }

        stats.byType.pages += result.byType.pages;
        stats.byType.blogs += result.byType.blogs;
        stats.byType.rooms += result.byType.rooms;
        stats.byType.packages += result.byType.packages;
        stats.byType.activities += result.byType.activities;
        stats.byType.spa += result.byType.spa;
        stats.byType.meals += result.byType.meals;
      });

      return stats;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};
