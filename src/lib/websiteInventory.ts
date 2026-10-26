import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as SupabaseClient;

// The server wrapper handles both staged and active rollout. Do not fall back
// to a legacy count on errors: that could bypass an active category ceiling.
export async function websiteTypeAvailability(roomTypeId: string, checkIn: string, checkOut: string): Promise<number> {
  const { data, error } = await db.rpc('distribution_website_type_availability', {
    p_type: roomTypeId, p_check_in: checkIn, p_check_out: checkOut,
  });
  if (error) throw error;
  if (!Number.isInteger(data) || data < 0) throw new Error('Availability could not be verified.');
  return data;
}

export async function distributionCheckoutEnabled(): Promise<boolean> {
  const { data, error } = await db.rpc('distribution_checkout_state');
  if (error) throw error;
  if (!data || typeof data.enabled !== 'boolean') throw new Error('Checkout readiness could not be verified.');
  return data.enabled;
}
