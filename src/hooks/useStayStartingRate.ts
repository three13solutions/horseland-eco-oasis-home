import { useQuery } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useGuestAgePolicy } from '@/hooks/useGuestAgePolicy';
import { findStartingRate, hotelToday, STARTING_RATE_DAYS, STARTING_RATE_GUESTS, type StartingVariant } from '@/lib/stay-starting-rate';

export function useStayStartingRate(roomTypeId: string, enabled: boolean) {
  const policy = useGuestAgePolicy();
  const today = hotelToday();
  const revision = policy.data?.revision;
  const query = useQuery({
    queryKey: ['stay-starting-rate', roomTypeId, today, STARTING_RATE_DAYS, revision],
    enabled: enabled && !!revision,
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    queryFn: async () => {
      if (!revision) throw new Error('Guest policy unavailable');
      return findStartingRate(today, async (checkIn, checkOut) => {
        // This public wrapper already excludes sold-out inventory, unpublished
        // types, inactive categories, hidden meal plans and guest-capacity failures.
        const { data, error } = await (supabase as SupabaseClient).rpc('calculate_guest_type_rate_variants', {
          p_room_type_id: roomTypeId, p_room_unit_id: null,
          p_check_in: checkIn, p_check_out: checkOut,
          p_guest_counts: STARTING_RATE_GUESTS, p_policy_revision: revision,
          p_website: true, p_booking_channel: 'direct',
        });
        if (error) throw error;
        return data as StartingVariant[];
      });
    },
  });
  return {
    rate: enabled && policy.data && !query.isFetching && !query.isError ? query.data ?? null : null,
    loading: enabled && (policy.isLoading || query.isFetching),
  };
}