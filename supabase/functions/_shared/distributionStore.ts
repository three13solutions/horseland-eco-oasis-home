import { InventoryPaymentError } from './distributionPaymentCoordinator.ts';
import type { InventoryPaymentStore, PaymentIntent, BeginResult, IntentRecord, ProviderOrder, ProviderPayment } from './distributionPaymentCoordinator.ts';
export interface DistributionRpcClient { rpc(name:string,args?:Record<string,unknown>):PromiseLike<{data:unknown;error:{message:string;code?:string}|null}>; }
export function createDistributionStore(db: DistributionRpcClient): InventoryPaymentStore & { resume(requestId:string,ownerScope:string):Promise<PaymentIntent|null> } {
 const call=async<T>(name:string,args:Record<string,unknown>):Promise<T>=>{const {data,error}=await db.rpc(name,args);if(error){
  if(error.code==='P0001') {
   const promoErrors:Record<string,string>={PROMO_USAGE_LIMIT:'This offer has reached its usage limit. Remove the code or choose another offer.',PROMO_GUEST_LIMIT:'This email has reached the offer usage limit. Remove the code or choose another offer.',PROMO_CHANGED:'This offer changed or is no longer eligible. Refresh your quote before paying.',PROMO_GUEST_REQUIRED:'Complete your guest email before using this offer.',PROMO_UNAVAILABLE:'This offer is no longer available.'};
   const code=error.message.split(':',1)[0];if(promoErrors[code])throw new InventoryPaymentError(code,promoErrors[code]);
  }
  if(error.code==='P0001'&&error.message.startsWith('MEAL_PLAN_UNAVAILABLE'))throw new InventoryPaymentError('MEAL_PLAN_UNAVAILABLE','This meal plan is no longer available for the selected room and stay. Please choose an available plan.');if(error.code==='P0001'&&error.message.startsWith('DISTRIBUTION_ADMISSION_LIMIT'))throw new InventoryPaymentError('CHECKOUT_ADMISSION_LIMIT','Too many pending checkout attempts. Retry later or contact the hotel to reconcile an existing attempt.');throw new Error(error.message);}return data as T;};
 return {
  begin:(intent:PaymentIntent)=>call<BeginResult>('distribution_begin_payment_intent',{p_intent:intent}),
  bindOrder:(record:IntentRecord,operationToken:string,order:ProviderOrder)=>call<void>('distribution_bind_payment_order',{p_record:record,p_operation_token:operationToken,p_order:order}),
  markUnknown:(record:IntentRecord,reason:string)=>call<void>('distribution_mark_payment_unknown',{p_record:record,p_reason:reason}),
  findBoundOrder:(orderId:string,ownerScope:string)=>call<IntentRecord&{orderId:string}>('distribution_find_bound_order',{p_order_id:orderId,p_owner_scope:ownerScope}),
  confirmCaptured:async(record:IntentRecord&{orderId:string},payment:ProviderPayment)=>{
   const result=await call<{bookingId:string;unitId:string;reused:boolean;review_required?:boolean}>('distribution_confirm_captured_payment',{p_record:record,p_payment:payment});
   // The SQL review flag must commit before surfacing the failure to the guest.
   if(result.review_required)throw new InventoryPaymentError('CLEARED_CHECKOUT_PAYMENT_REVIEW','Payment arrived for a cleared checkout. No booking was created; the hotel must review this payment. Do not pay again.');
   return result;
  },
  resume:(requestId:string,ownerScope:string)=>call<PaymentIntent|null>('distribution_resume_payment_intent',{p_request_id:requestId,p_owner_scope:ownerScope}),
 };
}
