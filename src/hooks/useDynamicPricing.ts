import type { SupabaseClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface RateVariant {
  pricing_status?: string;
  quote_fingerprint?: string;
  nightly_breakdown?: unknown[];
  meal_plan_code: string;
  meal_plan_name: string;
  meal_plan_description: string;
  included_meals: string[];
  meal_breakdown: any[];
  cancellation_policy_code: string;
  cancellation_policy_name: string;
  cancellation_terms: any;
  room_rate: number;
  meal_cost: number;
  policy_adjustment: number;
  total_price: number;
  price_per_night: number;
  is_featured: boolean;
  savings: number;
  discount_percentage: number;
}

// Helper function to apply meal plan adjustments
export const applyMealPlanAdjustment = (
  basePrice: number,
  mealPlanCode: string,
  adultsCount: number,
  childrenCount: number,
  nights: number
): { adjustedTotal: number; adjustedPerNight: number; adjustment: number } => {
  // Server variants already include the selected meal plan. Never apply legacy deductions twice.
  return { adjustedTotal: basePrice, adjustedPerNight: nights > 0 ? basePrice / nights : 0, adjustment: 0 };
};

interface UseDynamicPricingParams {
  roomTypeId?: string;
  roomUnitId?: string;
  checkIn?: Date;
  checkOut?: Date;
  adultsCount?: number;
  childrenCount?: number;
  infantsCount?: number;
  bookingChannel?: string;
  enabled?: boolean;
  website?: boolean;
}

export const useDynamicPricing = ({
  roomTypeId,
  roomUnitId,
  checkIn,
  checkOut,
  adultsCount = 2,
  childrenCount = 0,
  infantsCount = 0,
  bookingChannel = 'direct',
  enabled = true,
  website = false
}: UseDynamicPricingParams) => {
  const query = useQuery({
    queryKey: [website ? 'website-rate-variants' : 'rate-variants', roomTypeId, roomUnitId, checkIn, checkOut, adultsCount, childrenCount, infantsCount, bookingChannel],
    queryFn: async () => {
      if (!roomTypeId || !checkIn || !checkOut) {
        throw new Error('Missing required parameters');
      }

      const { data, error } = await (supabase as SupabaseClient).rpc(website ? 'calculate_website_rate_variants' : 'calculate_rate_variants_v2', {
        p_room_type_id: roomTypeId,
        p_check_in: format(checkIn, 'yyyy-MM-dd'),
        p_check_out: format(checkOut, 'yyyy-MM-dd'),
        p_room_unit_id: roomUnitId || null,
        p_adults_count: adultsCount,
        p_children_count: childrenCount,
        p_infants_count: infantsCount,
        p_booking_channel: bookingChannel
      });

      if (error) throw error;
      
      return (data || []) as unknown as RateVariant[];
    },
    enabled: enabled && !!roomTypeId && !!checkIn && !!checkOut,
    staleTime: website ? 0 : 1000 * 60 * 5,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
  // Website offers must never fall back to stale cached options on a failed or
  // in-flight eligibility check. Admin pricing keeps its existing behavior.
  return website ? { ...query, data: query.isError || query.isFetching ? undefined : query.data, isLoading: query.isFetching } : query;
};

export type { RateVariant };

