import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeQuoteRequest, calculateBookingQuote, assertQuoteMatches, snapshotBookingFields } from '../supabase/functions/_shared/bookingQuote.ts';
const id='11111111-1111-4111-8111-111111111111', addon='22222222-2222-4222-8222-222222222222';
const request={room_type_id:id,room_unit_id:null,check_in:'2026-11-07',check_out:'2026-11-09',adults_count:2,children_count:0,infants_count:1,meal_plan_code:'FB',cancellation_policy_code:'credit_voucher',addons:[]};
function db(config={}) {
 const variant={meal_plan_code:'FB',cancellation_policy_code:'credit_voucher',pricing_status:config.status??'verified',quote_fingerprint:'v1',total_price:17020,price_per_night:8510,room_rate:7960,meal_cost:9060,included_meals:['breakfast','lunch','dinner']};
 class Query { constructor(t){this.t=t} select(){return this} eq(){return this} order(){return this} limit(){return this} maybeSingle(){return this.result()} then(r,j){return this.result().then(r,j)} async result(){
 if(this.t==='room_types')return{data:{id,is_published:config.published??true,base_price:5000}};
 if(this.t==='gst_tiers')return{data:[{min_amount:0,max_amount:7500,gst_percentage:5},{min_amount:7500.01,max_amount:null,gst_percentage:18}]};
 if(this.t==='meals')return{data:{title:'Dinner Buffet',price:500,meal_type:'dinner'}};
 if(this.t==='activities')return{data:{title:'Walk',price_amount:100}};
 if(this.t==='addons')return{data:[]};
 return{data:null};
 }}
 return{from:t=>new Query(t),rpc:async()=>({data:[variant]})};
}
test('request normalizer ignores arbitrary prices and includes all counts',()=>{
 const r=normalizeQuoteRequest({...request, total_amount:1});assert.equal(r.infants_count,1);assert.equal(r.total_amount,undefined);
});
for(const invalid of [{adults_count:0},{children_count:-1},{infants_count:0.5},{check_out:'2026-11-07'},{check_in:'2026-02-30'},{meal_plan_code:'evil'}])test(`invalid request rejected ${JSON.stringify(invalid)}`,()=>assert.throws(()=>normalizeQuoteRequest({...request,...invalid})));
test('website totals server variant with configured tax and infants already included once',async()=>{
 const q=await calculateBookingQuote(db(),request);assert.equal(q.subtotal,17020);assert.equal(q.tax_rate,.18);assert.equal(q.total_amount,20083.6);assert.equal(snapshotBookingFields(q).guests_count,3);
});
test('client-supplied addon amount cannot override saved catalogue',async()=>{
 const q=await calculateBookingQuote(db(),{...request,addons:[{id:addon,type:'activity',quantity:2,price:1}]});assert.equal(q.addon_total,200);
});
test('included buffet cannot be charged twice as separate meal',async()=>{
 await assert.rejects(calculateBookingQuote(db(),{...request,addons:[{id:addon,type:'meal',quantity:1}]}),e=>e.code==='MEAL_ALREADY_INCLUDED');
});
test('fixed bedding retains existing server tariffs',async()=>{
 const q=await calculateBookingQuote(db(),{...request,addons:[{id:'extra-bed-1',type:'bedding',quantity:2}]});assert.equal(q.addon_total,1000);
});
test('unknown website basis preserves legacy quote without invented meals',async()=>{
 const q=await calculateBookingQuote(db({status:'legacy_basis_unverified'}),request);assert.equal(q.variant.pricing_status,'legacy_basis_unverified');assert.equal(q.variant.total_price,17020);
});
test('unknown manual basis preserves raw room base pricing and18 percent tax',async()=>{
 const q=await calculateBookingQuote(db({status:'legacy_basis_unverified'}),request,'manual');assert.equal(q.variant.total_price,10000);assert.equal(q.variant.meal_cost,0);assert.equal(q.total_amount,11800);assert.equal(q.variant.quote_fingerprint,'v1:manual-base:5000');
});
test('unpublished website fails closed, staff can quote it',async()=>{
 await assert.rejects(calculateBookingQuote(db({published:false}),request),e=>e.code==='ROOM_TYPE_NOT_PUBLISHED');
 assert.ok(await calculateBookingQuote(db({published:false}),request,'manual'));
});
test('stale amount or fingerprint requires a fresh review',()=>{
 const q={total_amount:100,variant:{quote_fingerprint:'new'}};
 assert.throws(()=>assertQuoteMatches(q,99,'new'));assert.throws(()=>assertQuoteMatches(q,100,'old'));assert.doesNotThrow(()=>assertQuoteMatches(q,100,'new'));
});
test('checkout passes structured inputs; manual path no longer directly inserts client quote',()=>{
 const booking=readFileSync(new URL('../src/pages/Booking.tsx',import.meta.url),'utf8');
 const manual=readFileSync(new URL('../src/components/admin/ManualBookingModal.tsx',import.meta.url),'utf8');
 assert.match(booking,/quoteRequest: buildQuoteRequest/);assert.match(manual,/invoke\('create-manual-booking'/);assert.doesNotMatch(manual,/\.insert\(\[bookingData\]\)/);
});
