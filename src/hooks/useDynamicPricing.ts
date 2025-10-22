import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface RateVariant {
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

interface UseDynamicPricingParams {
  roomTypeId?: string;
  roomUnitId?: string;
  checkIn?: Date;
  checkOut?: Date;
  guestsCount?: number;
  bookingChannel?: string;
  enabled?: boolean;
}

export const useDynamicPricing = ({
  roomTypeId,
  roomUnitId,
  checkIn,
  checkOut,
  guestsCount = 2,
  bookingChannel = 'direct',
  enabled = true
}: UseDynamicPricingParams) => {
  return useQuery({
    queryKey: ['rate-variants', roomTypeId, roomUnitId, checkIn, checkOut, guestsCount, bookingChannel],
    queryFn: async () => {
      if (!roomTypeId || !checkIn || !checkOut) {
        throw new Error('Missing required parameters');
      }

      const { data, error } = await supabase.rpc('calculate_rate_variants', {
        p_room_type_id: roomTypeId,
        p_check_in: checkIn.toISOString().split('T')[0],
        p_check_out: checkOut.toISOString().split('T')[0],
        p_room_unit_id: roomUnitId || null,
        p_guests_count: guestsCount,
        p_booking_channel: bookingChannel
      });

      if (error) throw error;
      
      return (data || []) as unknown as RateVariant[];
    },
    enabled: enabled && !!roomTypeId && !!checkIn && !!checkOut,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export type { RateVariant };
