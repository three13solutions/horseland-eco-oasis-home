
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MediaListFilters {
  mediaType?: 'image' | 'video' | 'all';
  sourceType?: 'upload' | 'external' | 'mirrored' | 'hardcoded' | 'all';
  categoryId?: string;
  searchTerm?: string;
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
