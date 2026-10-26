import type { DistributionRpcClient } from './distributionStore.ts';
/** Fail closed if the rollout state cannot be checked. Never infer that old checkout may charge. */
export async function legacyCheckoutAdmission(db:DistributionRpcClient, existingSavedBooking=false):Promise<'legacy_allowed'|'refresh_required'|'unavailable'>{
 const {data,error}=await db.rpc('distribution_checkout_state');
 if(error||!data||typeof data!=='object')return 'unavailable';
 const state=data as {enabled?:unknown;legacy_checkout_paused?:unknown};
 if(typeof state.enabled!=='boolean'||typeof state.legacy_checkout_paused!=='boolean')return 'unavailable';
 return (state.enabled&&!existingSavedBooking)||state.legacy_checkout_paused?'refresh_required':'legacy_allowed';
}
