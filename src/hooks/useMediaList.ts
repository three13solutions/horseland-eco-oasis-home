
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MediaListFilters {
  mediaType?: 'image' | 'video' | 'all';
  sourceType?: 'upload' | 'external' | 'mirrored' | 'hardcoded' | 'all';
  categoryId?: string;
  searchTerm?: string;
  usageFilter?: 'all' | 'hero-banners';
}

export const useMediaList = (filters: MediaListFilters = {}) => {
  return useQuery({
    queryKey: ['media-list', filters],
    queryFn: async () => {
      // If hero-banners filter is active, get images used in hero sections
      if (filters.usageFilter === 'hero-banners') {
        // First, get all hero images from pages
        const { data: pagesData, error: pagesError } = await supabase
          .from('pages')
          .select('hero_image, hero_gallery');

        if (pagesError) throw pagesError;

        // Extract all image URLs from hero_image and hero_gallery
        const heroImageUrls = new Set<string>();
        pagesData?.forEach(page => {
          if (page.hero_image) {
            heroImageUrls.add(page.hero_image);
          }
          if (page.hero_gallery && Array.isArray(page.hero_gallery)) {
            page.hero_gallery.forEach((img: any) => {
              if (typeof img === 'string') {
                heroImageUrls.add(img);
              } else if (img?.url) {
                heroImageUrls.add(img.url);
              }
            });
          }
        });

        // Now fetch gallery images that match these URLs
        if (heroImageUrls.size === 0) {
          return [];
        }

        const { data, error } = await supabase
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
            gallery_categories(name, slug)
          `)
          .in('image_url', Array.from(heroImageUrls))
          .order('sort_order');

        if (error) throw error;
        return data || [];
      }

      // Regular filtering
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
          gallery_categories(name, slug)
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
        query = query.eq('category_id', filters.categoryId);
      }

      if (filters.searchTerm) {
        query = query.or(`title.ilike.%${filters.searchTerm}%,caption.ilike.%${filters.searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    }
  });
};
