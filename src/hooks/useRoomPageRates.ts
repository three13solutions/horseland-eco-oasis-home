import { useQueries } from '@tanstack/react-query';
import { addDays, format, startOfDay } from 'date-fns';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { legacyGuestCounts } from '@/lib/guest-counts';
import { useGuestAgePolicy } from '@/hooks/useGuestAgePolicy';
import type { RateVariant } from '@/hooks/useDynamicPricing';

/** Refundable Room Only (EP) nightly rate from the live rate engine (same source as Room Rate Management). */
export const roomOnlyNightly = (variants: RateVariant[] | undefined): number | null => {
  const ep = (variants ?? []).filter(v => ['EP', 'RO'].includes(String(v.meal_plan_code).toUpperCase()));
  const refundable = ep.filter(v => v.cancellation_policy_code !== 'non_refundable');
  const pool = refundable.length ? refundable : ep;
  const prices = pool.map(v => Number(v.price_per_night)).filter(n => Number.isFinite(n) && n > 0);
  return prices.length ? Math.min(...prices) : null;
};

export const useRoomPageRates = (roomTypeId: string | undefined, checkIn?: Date, checkOut?: Date) => {
  const agePolicy = useGuestAgePolicy();
  const today = startOfDay(new Date());
  const ranges: Array<[Date, Date]> = [
    [checkIn ?? today, checkOut ?? addDays(checkIn ?? today, 1)],
    ...Array.from({ length: 7 }, (_, i) => [addDays(today, i), addDays(today, i + 1)] as [Date, Date]),
  ];
  const results = useQueries({
    queries: ranges.map(([from, to]) => ({
      queryKey: ['room-page-rate', roomTypeId, format(from, 'yyyy-MM-dd'), format(to, 'yyyy-MM-dd'), agePolicy.data?.revision],
      enabled: !!roomTypeId && !!agePolicy.data,
      staleTime: 60_000,
      queryFn: async () => {
        const { data, error } = await (supabase as SupabaseClient).rpc('calculate_guest_type_rate_variants', {
          p_room_type_id: roomTypeId,
          p_check_in: format(from, 'yyyy-MM-dd'),
          p_check_out: format(to, 'yyyy-MM-dd'),
          p_room_unit_id: null,
          p_guest_counts: legacyGuestCounts(2, 0, 0),
          p_policy_revision: agePolicy.data?.revision,
          p_website: true,
          p_booking_channel: 'direct',
        });
        if (error) throw error;
        return roomOnlyNightly((data || []) as RateVariant[]);
      },
    })),
  });
  const [selected, ...week] = results;
  return {
    nightly: selected.data ?? null,
    loading: selected.isLoading,
    week: week.map((r, i) => ({ date: ranges[i + 1][0], price: r.data ?? null })),
  };
};
