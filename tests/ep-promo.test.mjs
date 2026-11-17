import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateEpPromotion,normalizePromoCode} from '../supabase/functions/_shared/epPromo.ts';
import {calculateBookingQuote,normalizeQuoteRequest,assertQuoteMatches,snapshotBookingFields} from '../supabase/functions/_shared/bookingQuote.ts';
const config={code:'EP300',revision:1,amount_per_night:300,is_active:true};
const v={pricing_status:'verified',room_rate:4100,meal_cost:6040,total_price:10140,price_per_night:5070,quote_fingerprint:'base',meal_plan_code:'FB',cancellation_policy_code:'free',nightly_breakdown:[{date:'2026-11-18',room_only:2000},{date:'2026-11-19',room_only:2100}]};
const request={room_type_id:'11111111-1111-4111-8111-111111111111',check_in:'2026-11-18',check_out:'2026-11-20',adults_count:2,children_count:0,infants_count:0,meal_plan_code:'FB',cancellation_policy_code:'free',addons:[],promo_code:'ep300'};
function db({enabled=true,promotion=config,variant=v}={}){
 return {rpc:async()=>({data:[variant]}),from:table=>{const chain={select:()=>chain,eq:()=>chain,maybeSingle:()=>Promise.resolve({data:table==='room_types'?{id:request.room_type_id,is_published:true}:table==='website_promo_rollout'?{enabled}:promotion}),order:()=>Promise.resolve({data:[{min_amount:0,max_amount:null,gst_percentage:18}]})};return chain}};
}
test('normalizes a single code; rejects lists and invalid values',()=>{assert.equal(normalizePromoCode(' ep300 '),'EP300');assert.equal(normalizePromoCode(undefined),undefined);assert.throws(()=>normalizePromoCode(['EP300']));assert.throws(()=>normalizePromoCode('EP300,OTHER'));});
test('₹300 each night, not each guest and not meals',()=>{const p=calculateEpPromotion(v,request.check_in,request.check_out,config);assert.equal(p.discount_amount,600);assert.equal(p.nightly_discounts.length,2)});
test('cap applies separately to each occupied night',()=>{const p=calculateEpPromotion({...v,nightly_breakdown:[{date:'2026-11-18',room_only:100},{date:'2026-11-19',room_only:2000}]},request.check_in,request.check_out,config);assert.equal(p.discount_amount,400)});
for(const change of [{pricing_status:'legacy_basis_unverified'},{nightly_breakdown:[]},{nightly_breakdown:[{date:'2026-11-19',room_only:2000},{date:'2026-11-18',room_only:2000}]},{nightly_breakdown:[{date:'2026-11-18',room_only:-1},{date:'2026-11-19',room_only:2000}]},{nightly_breakdown:[{date:'2026-11-18',room_only:null},{date:'2026-11-19',room_only:2000}]},{total_price:1},{room_rate:1}])test(`invalid nightly basis fails closed ${JSON.stringify(change)}`,()=>assert.throws(()=>calculateEpPromotion({...v,...change},request.check_in,request.check_out,config)));
test('inactive or unexpected configuration fails',()=>{assert.throws(()=>calculateEpPromotion(v,request.check_in,request.check_out,{...config,is_active:false}));assert.throws(()=>calculateEpPromotion(v,request.check_in,request.check_out,{...config,amount_per_night:1}));});
test('server applies discount before tax without altering existing tier selection',async()=>{const q=await calculateBookingQuote(db(),request);assert.equal(q.subtotal_before_discount,10140);assert.equal(q.subtotal,9540);assert.equal(q.tax_amount,1717.2);assert.equal(q.total_amount,11257.2);assert.equal(q.variant.meal_cost,6040);assert.equal(q.variant.room_rate,3500);assert.equal(q.variant.quote_fingerprint,'base:promo:EP300:1:600');assert.equal(q.request.promo_code,'EP300');assert.equal(snapshotBookingFields(q).rate_breakdown.validated_quote.promotion.code,'EP300');});
test('guest count never multiplies discount',async()=>{const q=await calculateBookingQuote(db(),{...request,adults_count:4,children_count:2});assert.equal(q.promotion.discount_amount,600)});
test('staging gate fails closed and unknown offer fails',async()=>{await assert.rejects(calculateBookingQuote(db({enabled:false}),request),e=>e.code==='PROMO_UNAVAILABLE');await assert.rejects(calculateBookingQuote(db({promotion:null}),request),e=>e.code==='PROMO_UNAVAILABLE')});
test('manual path refuses website promotion',async()=>{await assert.rejects(calculateBookingQuote(db(),request,'manual'),e=>e.code==='INVALID_PROMO')});
test('client amounts cannot override discount or changed revision',async()=>{const q=await calculateBookingQuote(db(),{...request,discount_amount:99999});assert.equal(q.promotion.discount_amount,600);assert.throws(()=>assertQuoteMatches(q,1,q.variant.quote_fingerprint));const updated=await calculateBookingQuote(db({promotion:{...config,revision:2}}),request);assert.throws(()=>assertQuoteMatches(updated,q.total_amount,q.variant.quote_fingerprint));});
test('no-code request remains backward compatible',async()=>{const q=await calculateBookingQuote(db(),{...request,promo_code:undefined});assert.equal(q.total_amount,11965.2);assert.equal(q.promotion,undefined);assert.equal('promo_code' in normalizeQuoteRequest({...request,promo_code:undefined}),false)});
test('draft endpoint no longer accepts ₹1 override; binds full snapshot amount',()=>{const text=readFileSync(new URL('../supabase/functions/create-razorpay-order-v3/index.ts',import.meta.url),'utf8');assert.doesNotMatch(text,/HLTEST1|promo\?100|promo\?1/);assert.match(text,/amountPaise:Math.round\(snapshot.total_amount\*100\)/);assert.match(text,/assertResumeMatches\(intent/);});
test('payment modal invalidates stale promo requests and does not silently fall back',()=>{const text=readFileSync(new URL('../src/components/PaymentModal.tsx',import.meta.url),'utf8');assert.match(text,/generation!==promoGeneration.current/);assert.match(text,/appliedSelection === promoSelection/);assert.match(text,/if\(effectivePromoCode\) throw/);assert.match(text,/Available offers/);});

test('mixed-rate quote can book without coupon but cannot invent EP discount',async()=>{const mixed={...v,pricing_status:'mixed_basis_unverified'};const q=await calculateBookingQuote(db({variant:mixed}),{...request,promo_code:undefined});assert.equal(q.total_amount,11965.2);await assert.rejects(calculateBookingQuote(db({variant:mixed}),request),e=>e.code==='PROMO_UNAVAILABLE');});

test('retained checkout binds coupon selection, amount and fingerprint',async()=>{
 const {assertResumeMatches}=await import('../supabase/functions/_shared/distributionCheckout.ts');
 const q=await calculateBookingQuote(db(),request),metadata={guest:{first_name:'Test'}};
 const intent={quoteSnapshot:q,bookingMetadata:metadata,amountPaise:Math.round(q.total_amount*100),quoteFingerprint:q.variant.quote_fingerprint};
 const input={request:q.request,metadata,amount:q.total_amount,fingerprint:q.variant.quote_fingerprint};
 assert.doesNotThrow(()=>assertResumeMatches(intent,input));
 assert.throws(()=>assertResumeMatches(intent,{...input,request:{...q.request,promo_code:undefined}}));
 assert.throws(()=>assertResumeMatches(intent,{...input,amount:1}));
});

test('preserved policy night explicitly ineligible for EP offer',()=>assert.throws(()=>calculateEpPromotion({...v,nightly_breakdown:v.nightly_breakdown.map(r=>({...r,promo_eligible_ep:false}))},request.check_in,request.check_out,config)));
test('mixed canonical legacy mode preserves priced components for manual quote',async()=>{const q=await calculateBookingQuote(db({variant:{...v,pricing_status:'legacy_basis_unverified',pricing_mode:'mixed_verified_and_legacy'}}),{...request,promo_code:undefined},'manual');assert.equal(q.variant.room_rate,4100);assert.equal(q.total_amount,11965.2);});

test('preview refuses a changed base quote or addons before accepting coupon',()=>{const s=readFileSync(new URL('../src/components/PaymentModal.tsx',import.meta.url),'utf8');assert.match(s,/q\?\.original_variant\?\.quote_fingerprint!==bookingDetails.quoteFingerprint/);assert.match(s,/q.subtotal_before_discount-paymentBreakdown.subtotal/);});
