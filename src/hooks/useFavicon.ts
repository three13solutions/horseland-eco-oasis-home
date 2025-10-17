import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useFavicon() {
  useEffect(() => {
    const loadFavicon = async () => {
      try {
        const { data } = await supabase
          .from('site_settings')
          .select('setting_value')
          .eq('setting_key', 'favicon')
          .maybeSingle();

        if (data?.setting_value) {
          const faviconUrl = String(data.setting_value);
          
          // Remove existing favicon links
          const existingLinks = document.querySelectorAll("link[rel*='icon']");
          existingLinks.forEach(link => link.remove());

          // Add new favicon link
          const link = document.createElement('link');
          link.rel = 'icon';
          link.type = 'image/png';
          link.href = faviconUrl;
          document.head.appendChild(link);
        }
      } catch (error) {
        console.error('Error loading favicon:', error);
      }
    };

    loadFavicon();
  }, []);
}
