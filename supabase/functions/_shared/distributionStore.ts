import { InventoryPaymentError } from './distributionPaymentCoordinator.ts';
import type { InventoryPaymentStore, PaymentIntent, BeginResult, IntentRecord, ProviderOrder, ProviderPayment } from './distributionPaymentCoordinator.ts';
export interface DistributionRpcClient { rpc(name:string,args?:Record<string,unknown>):PromiseLike<{data:unknown;error:{message:string;code?:string}|null}>; }
export function createDistributionStore(db: DistributionRpcClient): InventoryPaymentStore & { resume(requestId:string,ownerScope:string):Promise<PaymentIntent|null> } {
 const call=async<T>(name:string,args:Record<string,unknown>):Promise<T>=>{const {data,error}=await db.rpc(name,args);if(error){if(error.code==='P0001'&&error.message.startsWith('MEAL_PLAN_UNAVAILABLE'))throw new InventoryPaymentError('MEAL_PLAN_UNAVAILABLE','This meal plan is no longer available for the selected room and stay. Please choose an available plan.');if(error.code==='P0001'&&error.message.startsWith('DISTRIBUTION_ADMISSION_LIMIT'))throw new InventoryPaymentError('CHECKOUT_ADMISSION_LIMIT','Too many pending checkout attempts. Retry later or contact the hotel to reconcile an existing attempt.');throw new Error(error.message);}return data as T;};
 return {
  begin:(intent:PaymentIntent)=>call<BeginResult>('distribution_begin_payment_intent',{p_intent:intent}),
  bindOrder:(record:IntentRecord,operationToken:string,order:ProviderOrder)=>call<void>('distribution_bind_payment_order',{p_record:record,p_operation_token:operationToken,p_order:order}),
  markUnknown:(record:IntentRecord,reason:string)=>call<void>('distribution_mark_payment_unknown',{p_record:record,p_reason:reason}),
  findBoundOrder:(orderId:string,ownerScope:string)=>call<IntentRecord&{orderId:string}>('distribution_find_bound_order',{p_order_id:orderId,p_owner_scope:ownerScope}),
  confirmCaptured:(record:IntentRecord&{orderId:string},payment:ProviderPayment)=>call<{bookingId:string;unitId:string;reused:boolean}>('distribution_confirm_captured_payment',{p_record:record,p_payment:payment}),
  resume:(requestId:string,ownerScope:string)=>call<PaymentIntent|null>('distribution_resume_payment_intent',{p_request_id:requestId,p_owner_scope:ownerScope}),
 };
}
