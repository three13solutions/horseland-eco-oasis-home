import { useQuery } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { ageBandLabel, validateGuestAgeBands, type GuestAgePolicy, type GuestBandKey } from '@/lib/guest-age-policy';
export function useGuestAgePolicy(opts:{allowInactive?:boolean}={}) {
  const query=useQuery({queryKey:['guest-age-policy',!!opts.allowInactive],queryFn:async()=>{
    const {data,error}=await (supabase as SupabaseClient).rpc('get_guest_age_policy');
    if(error) throw error;
    const policy=data as GuestAgePolicy & {active?:boolean};
    if(policy?.active === false && !opts.allowInactive) throw new Error('Guest age pricing is staged, not active. The matching website release must be published and activated first.');
    if(!policy || !Number.isInteger(policy.revision) || policy.revision < 1 || !Array.isArray(policy.bands) || validateGuestAgeBands(policy.bands)) throw new Error('Guest age policy is unavailable or invalid.');
    return policy;
  },staleTime:0,refetchOnWindowFocus:true});
  const policy=query.isError ? undefined : query.data;
  return {...query,data:policy,label:(key:GuestBandKey)=>ageBandLabel(policy?.bands.find(b=>b.key===key)),band:(key:GuestBandKey)=>policy?.bands.find(b=>b.key===key)};
}
