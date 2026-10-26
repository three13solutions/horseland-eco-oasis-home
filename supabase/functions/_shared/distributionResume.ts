import {InventoryPaymentError,type ProviderOrder,type ProviderPayment,type IntentRecord} from './distributionPaymentCoordinator.ts';
/** Read-only classification: no repricing, new order creation, capture or release. */
export function classifySavedCheckout(record:IntentRecord&{orderId:string},order:ProviderOrder,payments:{items:ProviderPayment[]}):'paid'|'pending'|'payable'{
 if(order.id!==record.orderId||order.amount!==record.amountPaise||order.currency!==record.currency||order.receipt!==record.receipt)throw new InventoryPaymentError('ORDER_MISMATCH','The saved order needs hotel review. Do not pay again.');
 if(!Array.isArray(payments.items))throw new Error('Payment state unavailable');
 if(payments.items.some(p=>p.order_id!==order.id))throw new Error('Unexpected payment binding');
 if(order.status==='paid'||order.amount_paid>0||payments.items.some(p=>p.status==='captured'))return 'paid';
 if(payments.items.some(p=>p.status!=='failed'))return 'pending';
 return ['created','attempted'].includes(order.status)?'payable':'pending';
}
