import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SiteSettings {
  site_title?: string;
  site_logo?: string;  
  site_tagline?: string;
}

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('setting_key, setting_value')
          .in('setting_key', ['site_title', 'site_logo', 'site_tagline']);

        if (error) {
          console.error('Error fetching site settings:', error);
        }

        const settingsObj: SiteSettings = {};
        data?.forEach(item => {
          if (item.setting_key === 'site_title') {
            settingsObj.site_title = item.setting_value as string;
          } else if (item.setting_key === 'site_logo') {
            settingsObj.site_logo = item.setting_value as string;
          } else if (item.setting_key === 'site_tagline') {
            settingsObj.site_tagline = item.setting_value as string;
          }
        });

        setSettings({
          site_title: settingsObj.site_title || 'HORSELAND',
          site_logo: settingsObj.site_logo || '/lovable-uploads/24f5ee9b-ce5a-4b86-a2d8-7ca42e0a78cf.png',
          site_tagline: settingsObj.site_tagline || 'Hotel'
        });
      } catch (error) {
        console.error('Error loading site settings:', error);
        setSettings({
          site_title: 'HORSELAND',
          site_logo: '/lovable-uploads/24f5ee9b-ce5a-4b86-a2d8-7ca42e0a78cf.png',
          site_tagline: 'Hotel'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { settings, loading };
}