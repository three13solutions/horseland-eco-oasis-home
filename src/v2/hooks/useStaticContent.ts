/**
 * Version 2 drop-in replacements for the CMS-backed hooks used by Version 1.
 * These are synchronous and read from the static content layer only.
 */

import { brand, getContent, getMedia } from '@/v2/data';

export function useSiteSettings() {
  return {
    settings: {
      brand_name: brand.name,
      brand_monogram: brand.monogram,
      brand_descriptor: brand.descriptor,
      phone_number: brand.phone,
      whatsapp_number: brand.whatsapp,
    },
    loading: false,
  };
}

export const useMediaAsset = (hardcodedKey?: string, fallbackUrl?: string) => ({
  asset: getMedia(hardcodedKey, fallbackUrl),
  loading: false,
  error: null as string | null,
});

export const useContent = () => ({
  getTranslation: getContent,
  loading: false,
  refreshTranslations: async () => {},
});
