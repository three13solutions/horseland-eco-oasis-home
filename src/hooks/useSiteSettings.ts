import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SiteSettings {
  brand_name?: string;
  brand_monogram?: string;  
  brand_descriptor?: string;
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
          .in('setting_key', ['brand_name', 'brand_monogram', 'brand_descriptor']);

        if (error) {
          console.error('Error fetching site settings:', error);
        }

        const settingsObj: SiteSettings = {};
        data?.forEach(item => {
          if (item.setting_key === 'brand_name') {
            settingsObj.brand_name = item.setting_value as string;
          } else if (item.setting_key === 'brand_monogram') {
            settingsObj.brand_monogram = item.setting_value as string;
          } else if (item.setting_key === 'brand_descriptor') {
            settingsObj.brand_descriptor = item.setting_value as string;
          }
        });

        setSettings({
          brand_name: settingsObj.brand_name || 'HORSELAND',
          brand_monogram: settingsObj.brand_monogram || '/lovable-uploads/24f5ee9b-ce5a-4b86-a2d8-7ca42e0a78cf.png',
          brand_descriptor: settingsObj.brand_descriptor || 'Hotel'
        });
      } catch (error) {
        console.error('Error loading site settings:', error);
        setSettings({
          brand_name: 'HORSELAND',
          brand_monogram: '/lovable-uploads/24f5ee9b-ce5a-4b86-a2d8-7ca42e0a78cf.png',
          brand_descriptor: 'Hotel'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { settings, loading };
}