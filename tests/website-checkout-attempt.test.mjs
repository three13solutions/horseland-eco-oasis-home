import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import { WEBSITE_CHECKOUT_KEY, readWebsiteCheckout, writeWebsiteCheckout, getOrCreateWebsiteCheckout, updateWebsiteCheckout, clearConfirmedWebsiteCheckout, discardSafelyRejectedWebsiteCheckout, checkoutErrorBody, checkoutSelectionKey } from '../src/lib/websiteCheckoutAttempt.ts';
const id='00000000-0000-4000-8000-000000000001',otherId='00000000-0000-4000-8000-000000000002';
const key='a'.repeat(64),otherKey='b'.repeat(64);
const storage=()=>{const items=new Map();return{getItem:k=>items.get(k)??null,setItem:(k,v)=>items.set(k,v),removeItem:k=>items.delete(k)}};
test('checkout persists before prepare and survives reload with the same capability and request',()=>{
 const s=storage();const a=getOrCreateWebsiteCheckout(key,s,()=>id);
 assert.equal(a.state,'session');assert.equal(readWebsiteCheckout(s).requestId,id);
 updateWebsiteCheckout(id,{checkoutToken:'opaque-test-capability'},s);
 updateWebsiteCheckout(id,{state:'preparing'},s);
 const resumed=getOrCreateWebsiteCheckout(key,s,()=>{throw Error('Must not create another request')});
 assert.equal(resumed.requestId,id);assert.equal(resumed.checkoutToken,'opaque-test-capability');assert.equal(resumed.state,'preparing');
});
test('uncertain checkout cannot be replaced merely because selection changed',()=>{
 const s=storage();getOrCreateWebsiteCheckout(key,s,()=>id);updateWebsiteCheckout(id,{checkoutToken:'capability',state:'preparing'},s);
 assert.throws(()=>getOrCreateWebsiteCheckout(otherKey,s,()=>otherId),/earlier checkout/);
 assert.equal(readWebsiteCheckout(s).requestId,id);
});
test('session-only checkout can change selection before any provider request starts',()=>{
 const s=storage();getOrCreateWebsiteCheckout(key,s,()=>id);
 assert.equal(getOrCreateWebsiteCheckout(otherKey,s,()=>otherId).requestId,otherId);
});
test('ready order is retained; paid attempt cannot be prepared again or downgraded',()=>{
 const s=storage();getOrCreateWebsiteCheckout(key,s,()=>id);updateWebsiteCheckout(id,{checkoutToken:'capability',state:'preparing'},s);
 updateWebsiteCheckout(id,{orderId:'order_fixture',state:'ready'},s);
 assert.equal(getOrCreateWebsiteCheckout(key,s).orderId,'order_fixture');
 updateWebsiteCheckout(id,{state:'paid'},s);
 assert.throws(()=>getOrCreateWebsiteCheckout(key,s),/Do not pay again/);
 assert.throws(()=>updateWebsiteCheckout(id,{state:'ready'},s),/awaiting confirmation/);
});
test('storage failures or corrupt state fail closed, rather than start a second checkout',()=>{
 const blocked={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')},removeItem(){}};
 assert.throws(()=>getOrCreateWebsiteCheckout(key,blocked,()=>id),/cannot safely retain/);
 const s=storage();s.setItem(WEBSITE_CHECKOUT_KEY,'not-json');
 assert.throws(()=>readWebsiteCheckout(s),/cannot be read safely/);
 const silent={getItem:()=>null,setItem(){},removeItem(){}};
 assert.throws(()=>getOrCreateWebsiteCheckout(key,silent,()=>id),/cannot safely retain/);
});
test('other-window request changes are rejected; confirmation clears only its own attempt',()=>{
 const s=storage();getOrCreateWebsiteCheckout(key,s,()=>id);
 assert.throws(()=>updateWebsiteCheckout(otherId,{checkoutToken:'x'},s),/another window/);
 clearConfirmedWebsiteCheckout(otherId,s);assert.equal(readWebsiteCheckout(s).requestId,id);
 assert.equal(clearConfirmedWebsiteCheckout(id,s),true);assert.equal(readWebsiteCheckout(s),null);
});
test('selection fingerprint canonicalizes object ordering and does not store guest data',async()=>{
 assert.equal(await checkoutSelectionKey({b:2,a:{z:3,y:4}}),await checkoutSelectionKey({a:{y:4,z:3},b:2}));
 assert.notEqual(await checkoutSelectionKey({amount:1}),await checkoutSelectionKey({amount:2}));
 const s=storage();const hash=await checkoutSelectionKey({email:'fixture@example.invalid',phone:'fixture-phone'});getOrCreateWebsiteCheckout(hash,s,()=>id);
 assert.doesNotMatch(s.getItem(WEBSITE_CHECKOUT_KEY),/fixture@example|fixture-phone/);
});
test('public inventory wrapper fails closed and never falls back to legacy availability',async()=>{
 const source=readFileSync(new URL('../src/lib/websiteInventory.ts',import.meta.url),'utf8');
 const calls=[];let result={data:3,error:null};
 const context=vm.createContext({supabase:{rpc:async(name,args)=>{calls.push({name,args});return result}},Number,Error});
 const code=stripTypeScriptTypes(source.replace(/^import .*\n/gm,'').replace(/^export /gm,''),{mode:'strip'});
 vm.runInContext(code+'\nglobalThis.api={websiteTypeAvailability,distributionCheckoutEnabled};',context);
 assert.equal(await context.api.websiteTypeAvailability('type','2026-11-01','2026-11-03'),3);
 assert.equal(calls[0].name,'distribution_website_type_availability');
 result={data:null,error:new Error('rpc unavailable')};await assert.rejects(()=>context.api.websiteTypeAvailability('type','2026-11-01','2026-11-03'));
 assert.equal(calls.length,2);assert.ok(calls.every(c=>c.name==='distribution_website_type_availability'));
 result={data:{enabled:false},error:null};assert.equal(await context.api.distributionCheckoutEnabled(),false);
 result={data:null,error:null};await assert.rejects(()=>context.api.distributionCheckoutEnabled());
});

test('only an exact server-fenced pre-provider rejection permits checkout replacement',async()=>{
 const s=storage();getOrCreateWebsiteCheckout(key,s,()=>id);updateWebsiteCheckout(id,{checkoutToken:'capability',state:'preparing'},s);
 assert.equal(discardSafelyRejectedWebsiteCheckout(id,{safe_to_change_selection:false,request_id:id},s),false);
 assert.equal(discardSafelyRejectedWebsiteCheckout(id,{safe_to_change_selection:true,request_id:otherId},s),false);
 const body=await checkoutErrorBody(null,{context:new Response(JSON.stringify({safe_to_change_selection:true,request_id:id}),{status:409})});
 assert.equal(discardSafelyRejectedWebsiteCheckout(id,body,s),true);assert.equal(readWebsiteCheckout(s),null);
 getOrCreateWebsiteCheckout(key,s,()=>id);updateWebsiteCheckout(id,{checkoutToken:'capability',orderId:'order_existing',state:'ready'},s);
 assert.equal(discardSafelyRejectedWebsiteCheckout(id,body,s),false);
});

test('v3 finalization sends capability and signed payment only, never recalculated booking totals',()=>{
 const source=readFileSync(new URL('../src/pages/Booking.tsx',import.meta.url),'utf8');
 const body=source.split('body: checkout ? {')[1].split('} : {')[0];
 assert.match(body,/request_id: checkout.requestId/);assert.match(body,/checkout_token: checkout.checkoutToken/);
 assert.doesNotMatch(body,/payment_amount|total_amount|guest:|booking:/);
 const payment=readFileSync(new URL('../src/components/PaymentModal.tsx',import.meta.url),'utf8');
 assert.match(payment,/if \(!orderData \|\| !isOpenRef.current\)/);
 const failed=payment.split("razorpay.on('payment.failed'")[1].split('// Hide our dialog')[0];
 assert.doesNotMatch(failed,/setRazorpayOpen\(false\)/);
});

test('saved checkout recovery reviews immutable server details without repricing or selecting an unavailable held room',()=>{
 const modal=readFileSync(new URL('../src/components/PaymentModal.tsx',import.meta.url),'utf8');
 const booking=readFileSync(new URL('../src/pages/Booking.tsx',import.meta.url),'utf8');
 const resume=modal.slice(modal.indexOf("if (saved && saved.state !== 'session')"),modal.indexOf('const nameParts'));
 assert.match(resume,/loadRetainedCheckout/);
 assert.match(resume,/reviewAccepted/);
 assert.match(resume,/current\.state !== 'payable'/);
 assert.match(resume,/current\.order\.id !== retained\.order\?\.id/);
 assert.match(resume,/return \{ \.\.\.current\.order/);
 assert.doesNotMatch(resume,/action: 'prepare'|checkoutSelectionKey|quote_fingerprint/);
 assert.match(modal,/original held dates, guests and price—not your current search/);
 assert.match(modal,/Original total \(including taxes\)/);
 assert.match(booking,/if \(retainedCheckoutAtLoad\)/);
 assert.ok(booking.indexOf('if (retainedCheckoutAtLoad)')<booking.indexOf('if (showBookingForm && selectedRoomType)'));
});
