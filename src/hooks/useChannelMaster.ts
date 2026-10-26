import { useQuery } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { CHANNEL_MASTER_QUERY_KEY } from '@/lib/channelMaster';
import type { DistributionChannel } from '@/lib/distribution-inventory';

export function useChannelMaster() {
  return useQuery({ queryKey: CHANNEL_MASTER_QUERY_KEY, queryFn: async () => {
    const { data, error } = await (supabase as SupabaseClient).from('distribution_channels')
      .select('id,code,name,kind,is_active,notes').order('created_at');
    if (error) throw error;
    return data as DistributionChannel[];
  } });
}
