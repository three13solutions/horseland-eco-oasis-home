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
        
        // Check all tables for usage - must match useMediaUsage logic exactly
        const [pages, blogs, rooms, packages, activities, spa, meals] = await Promise.all([
          // Check pages: hero_image, og_image, and hero_gallery array
          supabase.from('pages').select('id, hero_gallery').or(`hero_image.eq.${imageUrl},og_image.eq.${imageUrl},hero_gallery.cs.["${imageUrl}"]`),
          supabase.from('blog_posts').select('id').eq('featured_image', imageUrl),
          // Check rooms: hero_image and gallery array
          supabase.from('room_types').select('id, gallery'),
          // Check packages: featured_image, banner_image, and gallery array
          supabase.from('packages').select('id, gallery').or(`featured_image.eq.${imageUrl},banner_image.eq.${imageUrl}`),
          // Check activities: image and media_urls array
          supabase.from('activities').select('id, media_urls').eq('image', imageUrl),
          // Check spa: image and media_urls array
          supabase.from('spa_services').select('id, media_urls').eq('image', imageUrl),
          supabase.from('meals').select('id').eq('featured_media', imageUrl),
        ]);

        // Check gallery arrays for matches
        let roomsCount = 0;
        rooms.data?.forEach(room => {
          if (Array.isArray(room.gallery) && room.gallery.includes(imageUrl)) {
            roomsCount++;
          }
        });

        let packagesCount = (packages.data?.length || 0);
        packages.data?.forEach(pkg => {
          if (Array.isArray(pkg.gallery) && pkg.gallery.includes(imageUrl)) {
            packagesCount++;
          }
        });

        let activitiesCount = (activities.data?.length || 0);
        activities.data?.forEach(activity => {
          if (Array.isArray(activity.media_urls) && activity.media_urls.some((m: any) => 
            typeof m === 'string' ? m === imageUrl : m?.url === imageUrl
          )) {
            activitiesCount++;
          }
        });

        let spaCount = (spa.data?.length || 0);
        spa.data?.forEach(service => {
          if (Array.isArray(service.media_urls) && service.media_urls.includes(imageUrl)) {
            spaCount++;
          }
        });

        const usageCount = [
          pages.data?.length || 0,
          blogs.data?.length || 0,
          roomsCount,
          packagesCount,
          activitiesCount,
          spaCount,
          meals.data?.length || 0,
        ].reduce((a, b) => a + b, 0);

        return {
          isUsed: usageCount > 0,
          byType: {
            pages: pages.data?.length || 0,
            blogs: blogs.data?.length || 0,
            rooms: roomsCount,
            packages: packagesCount,
            activities: activitiesCount,
            spa: spaCount,
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
