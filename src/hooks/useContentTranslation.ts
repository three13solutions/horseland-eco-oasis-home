import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';

export const useContentTranslation = (section?: string) => {
  const { i18n, t } = useTranslation();
  const [translations, setTranslations] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);

  const loadTranslations = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('translations')
        .select('key, value')
        .eq('language_code', i18n.language);

      if (section) {
        query = query.eq('section', section);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading translations:', error);
        // Fallback to i18next translations
        setTranslations({});
        return;
      }

      const translationMap: { [key: string]: string } = {};
      data?.forEach((item) => {
        translationMap[item.key] = item.value;
      });

      setTranslations(translationMap);
    } catch (error) {
      console.error('Error in loadTranslations:', error);
      // Fallback to empty translations
      setTranslations({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTranslations();
  }, [i18n.language, section]);

  const getTranslation = (key: string, fallback?: string) => {
    // First try database translations
    if (translations[key]) {
      return translations[key];
    }
    
    // Fallback to i18next translations (JSON files) with explicit namespace
    const i18nextValue = t(key, { ns: 'common', defaultValue: null });
    if (i18nextValue && i18nextValue !== key) {
      return i18nextValue;
    }
    
    // Final fallback
    return fallback || key;
  };

  const refreshTranslations = async () => {
    await loadTranslations();
  };

  return {
    getTranslation,
    loading,
    refreshTranslations,
  };
};