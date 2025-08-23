
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MediaAsset {
  id: string;
  title: string;
  image_url: string;
  video_url?: string;
  media_type: 'image' | 'video';
  source_type: 'upload' | 'external' | 'mirrored' | 'hardcoded';
  hardcoded_key?: string;
}

export const useMediaAsset = (hardcodedKey?: string, fallbackUrl?: string) => {
  const [asset, setAsset] = useState<MediaAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hardcodedKey) {
      setAsset(null);
      setLoading(false);
      return;
    }

    const fetchAsset = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('gallery_images')
          .select('id, title, image_url, video_url, media_type, source_type, hardcoded_key')
          .eq('hardcoded_key', hardcodedKey)
          .eq('is_hardcoded', true)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          setAsset(data as MediaAsset);
        } else if (fallbackUrl) {
          // Create a temporary asset object for fallback
          setAsset({
            id: 'fallback',
            title: 'Fallback Image',
            image_url: fallbackUrl,
            media_type: 'image',
            source_type: 'hardcoded',
            hardcoded_key: hardcodedKey
          });
        } else {
          setAsset(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch media asset');
        if (fallbackUrl) {
          setAsset({
            id: 'fallback',
            title: 'Fallback Image',
            image_url: fallbackUrl,
            media_type: 'image',
            source_type: 'hardcoded',
            hardcoded_key: hardcodedKey
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAsset();
  }, [hardcodedKey, fallbackUrl]);

  return { asset, loading, error };
};
