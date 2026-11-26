import test from 'node:test';
import assert from 'node:assert/strict';
import { createDistributionStore } from '../supabase/functions/_shared/distributionStore.ts';
import { reconcileCapturedHold } from '../supabase/functions/_shared/distributionReconciliation.ts';
const record={holdId:'hold',requestId:'request',ownerScope:'owner',orderId:'order_fixture',amountPaise:100000,currency:'INR',receipt:'hl_fixture',quoteFingerprint:'fingerprint'};
const payment={id:'pay_late',order_id:'order_fixture',amount:100000,currency:'INR',status:'captured'};
test('committed late-payment review is never treated as successful booking',async()=>{
 const calls=[];
 const store=createDistributionStore({rpc:async(name,args)=>{calls.push({name,args});return{data:{review_required:true,code:'CLEARED_CHECKOUT_PAYMENT_REVIEW'},error:null}}});
 await assert.rejects(()=>store.confirmCaptured(record,payment),error=>error.code==='CLEARED_CHECKOUT_PAYMENT_REVIEW');
 assert.equal(calls.length,1);
 assert.equal(calls[0].name,'distribution_confirm_captured_payment');
 assert.equal(calls[0].args.p_payment.id,'pay_late');
});
test('admin and webhook reconciliation show late payment review without booking',async()=>{
 const store=createDistributionStore({rpc:async()=>({data:{review_required:true},error:null})});
 const provider={getOrder:async()=>({id:record.orderId,amount:record.amountPaise,currency:'INR',receipt:record.receipt}),listOrderPayments:async()=>({items:[payment]}),getPayment:async()=>payment};
 const result=await reconcileCapturedHold({record,provider_order_id:record.orderId,state:'released'},provider,store.confirmCaptured);
 assert.equal(result.status,'review_required');
 assert.equal(result.bookingId,undefined);
});
test('active captured payments retain the existing successful result',async()=>{
 const store=createDistributionStore({rpc:async()=>({data:{bookingId:'HLexisting',unitId:'unit-existing',reused:true},error:null})});
 const result=await store.confirmCaptured(record,payment);
 assert.equal(result.bookingId,'HLexisting');
 assert.equal(result.reused,true);
});