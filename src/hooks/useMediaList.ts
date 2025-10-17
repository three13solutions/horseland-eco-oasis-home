
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MediaListFilters {
  mediaType?: 'image' | 'video' | 'all';
  sourceType?: 'upload' | 'external' | 'mirrored' | 'hardcoded' | 'all';
  categoryId?: string;
  categorySlug?: string;
  searchTerm?: string;
}

export const useMediaList = (filters: MediaListFilters = {}) => {
  return useQuery({
    queryKey: ['media-list', filters],
    queryFn: async () => {
      // If hero-banners category is selected, get images used in hero sections
      if (filters.categorySlug === 'hero-banners') {
        // First, get all hero images from pages
        const { data: pagesData, error: pagesError } = await supabase
          .from('pages')
          .select('id, title, slug, hero_image, hero_gallery');

        if (pagesError) throw pagesError;

        // Extract all image URLs from hero_image and hero_gallery
        const heroImageUrls = new Set<string>();
        const pageInfo = new Map<string, { pageTitle: string, pageSlug: string }>();
        
        pagesData?.forEach(page => {
          if (page.hero_image) {
            heroImageUrls.add(page.hero_image);
            pageInfo.set(page.hero_image, { pageTitle: page.title, pageSlug: page.slug });
          }
          if (page.hero_gallery && Array.isArray(page.hero_gallery)) {
            page.hero_gallery.forEach((img: any) => {
              const url = typeof img === 'string' ? img : img?.url;
              if (url) {
                heroImageUrls.add(url);
                pageInfo.set(url, { pageTitle: page.title, pageSlug: page.slug });
              }
            });
          }
        });

        // If no hero images found, return empty array
        if (heroImageUrls.size === 0) {
          return [];
        }

        // Fetch images that exist in gallery_images
        const { data: existingImages } = await supabase
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

        const existingUrls = new Set(existingImages?.map(img => img.image_url) || []);
        
        // Create virtual entries for hero images not in gallery_images
        const virtualEntries = Array.from(heroImageUrls)
          .filter(url => !existingUrls.has(url))
          .map((url, index) => {
            const info = pageInfo.get(url);
            return {
              id: `virtual-${index}`,
              title: `Hero Image - ${info?.pageTitle || 'Unknown Page'}`,
              image_url: url,
              video_url: null,
              caption: `Used on ${info?.pageSlug || 'page'} hero section`,
              location: null,
              guest_name: null,
              guest_handle: null,
              likes_count: 0,
              media_type: 'image' as const,
              source_type: 'upload' as const,
              hardcoded_key: null,
              category_id: filters.categoryId || '',
              is_hardcoded: false,
              sort_order: 999 + index,
              gallery_categories: { name: 'Hero Banners', slug: 'hero-banners' }
            };
          });

        // Combine existing and virtual entries
        const allEntries = [...(existingImages || []), ...virtualEntries];

        // Apply other filters
        let filteredEntries = allEntries;

        if (filters.mediaType && filters.mediaType !== 'all') {
          filteredEntries = filteredEntries.filter(img => img.media_type === filters.mediaType);
        }

        if (filters.sourceType && filters.sourceType !== 'all') {
          filteredEntries = filteredEntries.filter(img => img.source_type === filters.sourceType);
        }

        if (filters.searchTerm) {
          const searchLower = filters.searchTerm.toLowerCase();
          filteredEntries = filteredEntries.filter(img => 
            img.title?.toLowerCase().includes(searchLower) || 
            img.caption?.toLowerCase().includes(searchLower)
          );
        }

        return filteredEntries;
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
