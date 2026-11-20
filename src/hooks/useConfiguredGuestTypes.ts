import { useQuery } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useGuestAgePolicy } from './useGuestAgePolicy';
import type { GuestAgeBand } from '@/lib/guest-age-policy';
export function useConfiguredGuestTypes() {
  const policy = useGuestAgePolicy({ allowInactive: true });
  const drafts = useQuery({ queryKey: ['guest-policy-drafts'], queryFn: async () => {
    const { data, error } = await (supabase as SupabaseClient).rpc('list_guest_policy_drafts');
    if (error) throw error;
    return (data ?? []) as { id: string; band: GuestAgeBand; updated_at: string }[];
  }});
  const types = new Map<string, GuestAgeBand>();
  for (const band of policy.data?.bands ?? []) types.set(band.key, band);
  for (const draft of drafts.data ?? []) if (!types.has(draft.band.key)) types.set(draft.band.key, draft.band);
  return { ...policy, types: [...types.values()].sort((a,b) => a.min_age - b.min_age), isLoading: policy.isLoading || drafts.isLoading, isError: policy.isError || drafts.isError };
}