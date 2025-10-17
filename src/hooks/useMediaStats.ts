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
        
        // Check if image is assigned to gallery categories (used in gallery components)
        const { data: categoryAssignments } = await supabase
          .from('image_categories')
          .select('category_id, gallery_categories!inner(slug, is_active)')
          .eq('image_id', img.id);
        
        // If image is in Hotel Moments or Guest Stories categories, it's used
        const isInGalleryCategory = categoryAssignments?.some((assignment: any) => 
          assignment.gallery_categories?.is_active && 
          ['hotel', 'guests'].includes(assignment.gallery_categories?.slug)
        );
        
        if (isInGalleryCategory) {
          return {
            isUsed: true,
            byType: {
              pages: 1, // Count as page usage since it's displayed in gallery sections
              blogs: 0,
              rooms: 0,
              packages: 0,
              activities: 0,
              spa: 0,
              meals: 0,
            }
          };
        }
        
        // Fetch ALL records to check arrays - must match useMediaUsage logic exactly
        const [pages, blogs, rooms, packages, activities, spa, meals] = await Promise.all([
          supabase.from('pages').select('id, hero_image, og_image, hero_gallery'),
          supabase.from('blog_posts').select('id, featured_image'),
          supabase.from('room_types').select('id, hero_image, gallery'),
          supabase.from('packages').select('id, featured_image, banner_image, gallery'),
          supabase.from('activities').select('id, image, media_urls'),
          supabase.from('spa_services').select('id, image, media_urls'),
          supabase.from('meals').select('id, featured_media'),
        ]);

        // Check each field/array for matches
        let pagesCount = 0;
        pages.data?.forEach(page => {
          if (page.hero_image === imageUrl || page.og_image === imageUrl) {
            pagesCount++;
          } else if (Array.isArray(page.hero_gallery) && page.hero_gallery.some((img: any) => 
            (typeof img === 'string' ? img : img?.url) === imageUrl
          )) {
            pagesCount++;
          }
        });

        let blogsCount = 0;
        blogs.data?.forEach(blog => {
          if (blog.featured_image === imageUrl) {
            blogsCount++;
          }
        });

        let roomsCount = 0;
        rooms.data?.forEach(room => {
          if (room.hero_image === imageUrl) {
            roomsCount++;
          } else if (Array.isArray(room.gallery) && room.gallery.includes(imageUrl)) {
            roomsCount++;
          }
        });

        let packagesCount = 0;
        packages.data?.forEach(pkg => {
          if (pkg.featured_image === imageUrl || pkg.banner_image === imageUrl) {
            packagesCount++;
          } else if (Array.isArray(pkg.gallery) && pkg.gallery.includes(imageUrl)) {
            packagesCount++;
          }
        });

        let activitiesCount = 0;
        activities.data?.forEach(activity => {
          if (activity.image === imageUrl) {
            activitiesCount++;
          } else if (Array.isArray(activity.media_urls) && activity.media_urls.some((m: any) => 
            typeof m === 'string' ? m === imageUrl : m?.url === imageUrl
          )) {
            activitiesCount++;
          }
        });

        let spaCount = 0;
        spa.data?.forEach(service => {
          if (service.image === imageUrl) {
            spaCount++;
          } else if (Array.isArray(service.media_urls) && service.media_urls.includes(imageUrl)) {
            spaCount++;
          }
        });

        let mealsCount = 0;
        meals.data?.forEach(meal => {
          if (meal.featured_media === imageUrl) {
            mealsCount++;
          }
        });

        const usageCount = [
          pagesCount,
          blogsCount,
          roomsCount,
          packagesCount,
          activitiesCount,
          spaCount,
          mealsCount,
        ].reduce((a, b) => a + b, 0);

        return {
          isUsed: usageCount > 0,
          byType: {
            pages: pagesCount,
            blogs: blogsCount,
            rooms: roomsCount,
            packages: packagesCount,
            activities: activitiesCount,
            spa: spaCount,
            meals: mealsCount,
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
