
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MediaListFilters {
  mediaType?: 'image' | 'video' | 'all';
  sourceType?: 'upload' | 'external' | 'mirrored' | 'hardcoded' | 'all';
  categoryId?: string;
  categorySlug?: string;
  searchTerm?: string;
  usageFilter?: 'all' | 'used' | 'unused';
}

export const useMediaList = (filters: MediaListFilters = {}) => {
  return useQuery({
    queryKey: ['media-list', filters],
    queryFn: async () => {
      let query = supabase
        .from('gallery_images')
        .select(`
          id,
          title,
          image_url,
          video_url,
          caption,
          location,
          guest_name,
          guest_handle,
          likes_count,
          media_type,
          source_type,
          hardcoded_key,
          category_id,
          is_hardcoded,
          sort_order,
          gallery_categories(name, slug),
          image_categories(category_id, gallery_categories(name, slug))
        `)
        .order('sort_order');

      // Apply filters
      if (filters.mediaType && filters.mediaType !== 'all') {
        query = query.eq('media_type', filters.mediaType);
      }

      if (filters.sourceType && filters.sourceType !== 'all') {
        query = query.eq('source_type', filters.sourceType);
      }

      if (filters.categoryId) {
        // Filter by category using junction table
        const { data: imageIds } = await supabase
          .from('image_categories')
          .select('image_id')
          .eq('category_id', filters.categoryId);
        
        if (imageIds && imageIds.length > 0) {
          query = query.in('id', imageIds.map(ic => ic.image_id));
        } else {
          // No images in this category
          return [];
        }
      }

      if (filters.searchTerm) {
        query = query.or(`title.ilike.%${filters.searchTerm}%,caption.ilike.%${filters.searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      let results = data || [];

      // Apply usage filter if specified
      if (filters.usageFilter && filters.usageFilter !== 'all') {
        // Check usage for each image
        const usageChecks = await Promise.all(
          results.map(async (img) => {
            const imageUrl = img.image_url;
            
            // Check all tables for usage
            const [pages, blogs, rooms, packages, activities, spa, meals] = await Promise.all([
              supabase.from('pages').select('id, hero_image, og_image, hero_gallery'),
              supabase.from('blog_posts').select('id, featured_image'),
              supabase.from('room_types').select('id, hero_image, gallery'),
              supabase.from('packages').select('id, featured_image, banner_image, gallery'),
              supabase.from('activities').select('id, image, media_urls'),
              supabase.from('spa_services').select('id, image, media_urls'),
              supabase.from('meals').select('id, featured_media'),
            ]);

            // Check each table for matches
            let isUsed = false;

            // Pages
            pages.data?.forEach(page => {
              if (page.hero_image === imageUrl || page.og_image === imageUrl) {
                isUsed = true;
              } else if (Array.isArray(page.hero_gallery) && page.hero_gallery.some((item: any) => 
                (typeof item === 'string' ? item : item?.url) === imageUrl
              )) {
                isUsed = true;
              }
            });

            // Blogs
            if (blogs.data?.some(blog => blog.featured_image === imageUrl)) {
              isUsed = true;
            }

            // Rooms
            rooms.data?.forEach(room => {
              if (room.hero_image === imageUrl || (Array.isArray(room.gallery) && room.gallery.includes(imageUrl))) {
                isUsed = true;
              }
            });

            // Packages
            packages.data?.forEach(pkg => {
              if (pkg.featured_image === imageUrl || pkg.banner_image === imageUrl || 
                  (Array.isArray(pkg.gallery) && pkg.gallery.includes(imageUrl))) {
                isUsed = true;
              }
            });

            // Activities
            activities.data?.forEach(activity => {
              if (activity.image === imageUrl || 
                  (Array.isArray(activity.media_urls) && activity.media_urls.some((m: any) => 
                    typeof m === 'string' ? m === imageUrl : m?.url === imageUrl
                  ))) {
                isUsed = true;
              }
            });

            // Spa
            spa.data?.forEach(service => {
              if (service.image === imageUrl || 
                  (Array.isArray(service.media_urls) && service.media_urls.includes(imageUrl))) {
                isUsed = true;
              }
            });

            // Meals
            if (meals.data?.some(meal => meal.featured_media === imageUrl)) {
              isUsed = true;
            }

            return { image: img, isUsed };
          })
        );

        // Debug logging for unused media verification
        console.log(`Unused Media Verification:`, {
          totalChecked: usageChecks.length,
          usedCount: usageChecks.filter(u => u.isUsed).length,
          unusedCount: usageChecks.filter(u => !u.isUsed).length,
          unusedWithCategories: usageChecks
            .filter(u => !u.isUsed && (u.image.category_id || u.image.image_categories?.length))
            .map(u => ({
              title: u.image.title,
              url: u.image.image_url,
              categoryId: u.image.category_id,
              categories: u.image.image_categories
            }))
        });

        // Filter based on usage
        results = usageChecks
          .filter(({ isUsed }) => filters.usageFilter === 'used' ? isUsed : !isUsed)
          .map(({ image }) => image);
      }

      return results;
    }
  });
};
