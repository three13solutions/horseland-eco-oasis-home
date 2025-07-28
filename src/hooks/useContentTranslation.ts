import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

interface Translation {
  language_code: string;
  section: string;
  key: string;
  value: string;
}

export const useContentTranslation = (section?: string) => {
  const { i18n } = useTranslation();
  const [dbTranslations, setDbTranslations] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTranslations();
  }, [i18n.language]);

  const loadTranslations = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('translations')
        .select('*')
        .eq('language_code', i18n.language);

      if (section) {
        query = query.eq('section', section);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDbTranslations(data || []);
    } catch (error) {
      console.error('Failed to load translations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get translation with fallback to JSON files
  const getTranslation = (key: string, fallback?: string) => {
    // First try database translations
    const dbTranslation = dbTranslations.find(t => t.key === key);
    if (dbTranslation) {
      return dbTranslation.value;
    }

    // Fallback to i18n (JSON files)
    try {
      return i18n.t(key, { defaultValue: fallback || key });
    } catch {
      return fallback || key;
    }
  };

  return {
    getTranslation,
    loading,
    dbTranslations,
    refreshTranslations: loadTranslations
  };
};