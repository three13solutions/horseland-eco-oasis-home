import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { parseMealGuestPriceSnapshot } from './catalogue-guest-meal-pricing';

const db = supabase as unknown as { rpc(name: string, args?: Record<string, unknown>): Promise<{
  data: unknown; error: { message: string; code?: string } | null;
}> };
export const catalogueGuestMealPricesKey = ['catalogue-guest-meal-prices'];
export function useCatalogueGuestMealPrices(enabled = true) {
  return useQuery({
    queryKey: catalogueGuestMealPricesKey, enabled, retry: false,
    queryFn: async () => {
      const { data, error } = await db.rpc('get_meal_guest_prices');
      if (error) {
        if (error.code === 'PGRST202' || error.code === '42883') return null;
        throw new Error(error.message);
      }
      return parseMealGuestPriceSnapshot(data);
    },
  });
}

export async function saveCatalogueGuestMealPrices(mealId: string, prices: Record<string, number>, revisions: {
  revision: number; guest_policy_revision: number;
}) {
  const { data, error } = await db.rpc('save_meal_guest_prices', {
    p_meal_id: mealId,
    p_prices: prices,
    p_expected_revision: revisions.revision,
    p_expected_guest_policy_revision: revisions.guest_policy_revision,
  });
  if (error) throw new Error(error.message);
  return parseMealGuestPriceSnapshot(data);
}
