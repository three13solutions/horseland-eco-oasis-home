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

// Helper function to apply meal plan adjustments
export const applyMealPlanAdjustment = (
  basePrice: number,
  mealPlanCode: string,
  adultsCount: number,
  childrenCount: number,
  nights: number
): { adjustedTotal: number; adjustedPerNight: number; adjustment: number } => {
  const totalGuests = adultsCount + childrenCount;
  let adjustmentPerPersonPerNight = 0;
  
  // All Meals Inclusive (all_meals_inclusive) is the base price - no adjustment
  // Breakfast & Dinner (breakfast_and_dinner): -200 per person per night
  // Room only (room_only): -500 per person per night
  if (mealPlanCode === 'breakfast_and_dinner') {
    adjustmentPerPersonPerNight = -200;
  } else if (mealPlanCode === 'room_only') {
    adjustmentPerPersonPerNight = -500;
  }
  
  const totalAdjustment = adjustmentPerPersonPerNight * totalGuests * nights;
  const adjustedTotal = basePrice + totalAdjustment;
  const adjustedPerNight = adjustedTotal / nights;
  
  return {
    adjustedTotal,
    adjustedPerNight,
    adjustment: totalAdjustment
  };
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
  enabled = true
}: UseDynamicPricingParams) => {
  return useQuery({
    queryKey: ['rate-variants', roomTypeId, roomUnitId, checkIn, checkOut, adultsCount, childrenCount, infantsCount, bookingChannel],
    queryFn: async () => {
      if (!roomTypeId || !checkIn || !checkOut) {
        throw new Error('Missing required parameters');
      }

      const { data, error } = await supabase.rpc('calculate_rate_variants', {
        p_room_type_id: roomTypeId,
        p_check_in: checkIn.toISOString().split('T')[0],
        p_check_out: checkOut.toISOString().split('T')[0],
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
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export type { RateVariant };
