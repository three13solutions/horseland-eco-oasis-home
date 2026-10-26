import type { IntentRecord, ProviderOrder, ProviderPayment } from './distributionPaymentCoordinator.ts';
export type HoldPaymentLookup = {record:(IntentRecord&{orderId:string})|null;provider_order_id:string|null;state:string};
export async function reconcileCapturedHold(
 lookup:HoldPaymentLookup,
 provider:{getOrder(id:string):Promise<ProviderOrder>;listOrderPayments(id:string):Promise<{items:ProviderPayment[]}>;getPayment(id:string):Promise<ProviderPayment>},
 confirm:(record:IntentRecord&{orderId:string},payment:ProviderPayment)=>Promise<{bookingId:string;unitId:string;reused:boolean}>,
):Promise<{status:'confirmed'|'pending'|'review_required';message:string;bookingId?:string;reused?:boolean}>{
 if(!lookup.provider_order_id||!lookup.record)return {status:'review_required',message:'The provider order is not known. The inventory hold remains protected for manual reconciliation.'};
 const record=lookup.record,order=await provider.getOrder(lookup.provider_order_id);
 if(order.id!==record.orderId||order.id!==lookup.provider_order_id||order.amount!==record.amountPaise||order.currency!==record.currency||order.receipt!==record.receipt)return {status:'review_required',message:'The provider order does not match the held quote. Inventory remains held.'};
 const collection=await provider.listOrderPayments(order.id);
 if(!Array.isArray(collection.items))throw new Error('Payment list unavailable');
 const captured=collection.items.filter(payment=>payment.status==='captured');
 if(captured.length===0)return {status:'pending',message:'No captured payment was verified. Unpaid, authorized and failed attempts do not release this hold.'};
 if(captured.length!==1)return {status:'review_required',message:'Multiple captured payments require manual review. Inventory remains held.'};
 const paid=await provider.getPayment(captured[0].id);
 if(paid.id!==captured[0].id||paid.order_id!==record.orderId||paid.amount!==record.amountPaise||paid.currency!==record.currency||paid.status!=='captured'||Number(paid.amount_refunded??0)!==0||paid.refund_status)return {status:'review_required',message:'Payment amount, capture or refund state needs manual review. Inventory remains held.'};
 const result=await confirm(record,paid);
 return {status:'confirmed',bookingId:result.bookingId,reused:result.reused,message:result.reused?'This payment was already confirmed. No inventory was deducted again.':'Captured payment verified and the reserved room confirmed.'};
}

/** Exact server-record reconciliation only. An empty/incomplete/ambiguous search
 * is never permission to release inventory or invent a provider order ID. */
export async function recoverUnknownProviderOrder(
 lookup:HoldPaymentLookup,
 provider:{findOrdersByReceipt(receipt:string,skip:number,count:number):Promise<{items:ProviderOrder[]}>;getOrder(id:string):Promise<ProviderOrder>},
 bind:(holdId:string,order:ProviderOrder)=>Promise<unknown>,
):Promise<{matched:boolean;message:string}>{
 if(lookup.provider_order_id)return {matched:true,message:'Provider order already known.'};
 if(!lookup.record)return {matched:false,message:'The stored checkout identity is unavailable. Inventory remains held.'};
 const record=lookup.record;const matches:ProviderOrder[]=[];let complete=false;
 for(let page=0;page<3;page++){
  const response=await provider.findOrdersByReceipt(record.receipt,page*100,100);
  if(!Array.isArray(response.items)||response.items.length>100)throw new Error('Invalid order search');
  matches.push(...response.items.filter(order=>order.receipt===record.receipt&&order.notes?.inventory_hold===record.holdId));
  if(response.items.length<100){complete=true;break;}
 }
 if(!complete||matches.length!==1)return {matched:false,message:!complete?'Provider search is incomplete. Inventory remains held for manual review.':matches.length?'Multiple matching provider orders need manual review. Inventory remains held.':'No exact provider order was found yet. This does not prove that no payable order exists; inventory remains held.'};
 const order=await provider.getOrder(matches[0].id);
 if(order.id!==matches[0].id||order.receipt!==record.receipt||order.notes?.inventory_hold!==record.holdId||order.amount!==record.amountPaise||order.currency!==record.currency||!['created','attempted','paid'].includes(order.status))return {matched:false,message:'Provider identity or amount differs from the stored checkout. Inventory remains held.'};
 await bind(record.holdId,order);
 return {matched:true,message:'The exact provider order was located and linked to the existing hold.'};
}
