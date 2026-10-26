import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { InventoryChange, InventoryGrid } from '@/lib/distribution-inventory';
const db = supabase as SupabaseClient;

export async function readDistributionInventory(start: string, end: string): Promise<InventoryGrid> {
  const { data, error } = await db.rpc('distribution_inventory_grid', { p_start: start, p_end: end });
  if (error) throw error;
  if (!data || !Array.isArray(data.categories) || !Array.isArray(data.cells)) throw new Error('The inventory response is incomplete. No changes were saved.');
  return data;
}

export async function saveDistributionInventory(changes: InventoryChange[], requestId: string): Promise<void> {
  const { error } = await db.rpc('save_distribution_inventory', { p_changes: changes, p_request_id: requestId });
  if (error) throw error;
}
