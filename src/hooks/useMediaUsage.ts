import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UsageLocation {
  type: 'page' | 'blog' | 'room' | 'package' | 'activity' | 'spa' | 'meal';
  id: string;
  title: string;
  field: string;
}

export const useMediaUsage = (imageUrl: string) => {
  return useQuery({
    queryKey: ['media-usage', imageUrl],
    queryFn: async () => {
      const usages: UsageLocation[] = [];

      if (!imageUrl) return usages;

      try {
        // Check pages (hero_image and hero_gallery)
        const { data: pages } = await supabase
          .from('pages')
          .select('id, title, slug, hero_image, hero_gallery')
          .or(`hero_image.eq.${imageUrl},hero_gallery.cs.["${imageUrl}"]`);

        pages?.forEach(page => {
          if (page.hero_image === imageUrl) {
            usages.push({
              type: 'page',
              id: page.id,
              title: page.title,
              field: 'hero_image'
            });
          }
          if (Array.isArray(page.hero_gallery) && page.hero_gallery.some((img: any) => 
            (typeof img === 'string' ? img : img?.url) === imageUrl
          )) {
            usages.push({
              type: 'page',
              id: page.id,
              title: page.title,
              field: 'hero_gallery'
            });
          }
        });

        // Check blog posts (featured_image)
        const { data: blogs } = await supabase
          .from('blog_posts')
          .select('id, title, featured_image')
          .eq('featured_image', imageUrl);

        blogs?.forEach(blog => {
          usages.push({
            type: 'blog',
            id: blog.id,
            title: blog.title,
            field: 'featured_image'
          });
        });

        // Check room types (hero_image and gallery)
        const { data: rooms } = await supabase
          .from('room_types')
          .select('id, name, hero_image, gallery');

        rooms?.forEach(room => {
          if (room.hero_image === imageUrl) {
            usages.push({
              type: 'room',
              id: room.id,
              title: room.name,
              field: 'hero_image'
            });
          }
          if (Array.isArray(room.gallery) && room.gallery.includes(imageUrl)) {
            usages.push({
              type: 'room',
              id: room.id,
              title: room.name,
              field: 'gallery'
            });
          }
        });

        // Check packages (featured_image, banner_image, gallery)
        const { data: packages } = await supabase
          .from('packages')
          .select('id, title, featured_image, banner_image, gallery');

        packages?.forEach(pkg => {
          if (pkg.featured_image === imageUrl) {
            usages.push({
              type: 'package',
              id: pkg.id,
              title: pkg.title,
              field: 'featured_image'
            });
          }
          if (pkg.banner_image === imageUrl) {
            usages.push({
              type: 'package',
              id: pkg.id,
              title: pkg.title,
              field: 'banner_image'
            });
          }
          if (Array.isArray(pkg.gallery) && pkg.gallery.includes(imageUrl)) {
            usages.push({
              type: 'package',
              id: pkg.id,
              title: pkg.title,
              field: 'gallery'
            });
          }
        });

        // Check activities (media_urls)
        const { data: activities } = await supabase
          .from('activities')
          .select('id, title, image, media_urls');

        activities?.forEach(activity => {
          if (activity.image === imageUrl) {
            usages.push({
              type: 'activity',
              id: activity.id,
              title: activity.title,
              field: 'image'
            });
          }
          if (Array.isArray(activity.media_urls) && activity.media_urls.some((m: any) => 
            typeof m === 'string' ? m === imageUrl : m?.url === imageUrl
          )) {
            usages.push({
              type: 'activity',
              id: activity.id,
              title: activity.title,
              field: 'media_urls'
            });
          }
        });

        // Check spa services (image, media_urls)
        const { data: spa } = await supabase
          .from('spa_services')
          .select('id, title, image, media_urls');

        spa?.forEach(service => {
          if (service.image === imageUrl) {
            usages.push({
              type: 'spa',
              id: service.id,
              title: service.title,
              field: 'image'
            });
          }
          if (Array.isArray(service.media_urls) && service.media_urls.includes(imageUrl)) {
            usages.push({
              type: 'spa',
              id: service.id,
              title: service.title,
              field: 'media_urls'
            });
          }
        });

        // Check meals (featured_media)
        const { data: meals } = await supabase
          .from('meals')
          .select('id, title, featured_media');

        meals?.forEach(meal => {
          if (meal.featured_media === imageUrl) {
            usages.push({
              type: 'meal',
              id: meal.id,
              title: meal.title,
              field: 'featured_media'
            });
          }
        });

      } catch (error) {
        console.error('Error fetching media usage:', error);
      }

      return usages;
    },
    enabled: !!imageUrl,
  });
};
