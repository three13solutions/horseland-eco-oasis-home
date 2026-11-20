import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGuestCounts, writeGuestParty, guestHeadcount, guestOccupancy } from '../supabase/functions/_shared/guestCounts.ts';
import { linkedAccommodationPrices } from '../src/lib/guest-linked-pricing.ts';
import { normalizeQuoteRequest, calculateBookingQuote, snapshotBookingFields, assertQuoteMatches } from '../supabase/functions/_shared/bookingQuote.ts';
const id='11111111-1111-4111-8111-111111111111';
const counts={adult:2,child:1,infant:1,toddler:1};
const request={room_type_id:id,room_unit_id:null,check_in:'2026-12-10',check_out:'2026-12-12',adults_count:2,children_count:1,infants_count:1,guest_counts:counts,guest_age_policy_revision:4,meal_plan_code:'FB',cancellation_policy_code:'refundable_credit',addons:[]};
test('fourth guest type survives URLs and preserves historical infant-only occupancy exemption',()=>{
 const params=writeGuestParty(new URLSearchParams(),counts,4);
 assert.deepEqual(JSON.parse(params.get('guestTypes')),counts);
 assert.equal(params.get('guestPolicyRevision'),'4');assert.equal(guestHeadcount(counts),5);assert.equal(guestOccupancy(counts),4);
});
test('decimals and negative guest counts are rejected',()=>{
 for(const invalid of [{adult:2,toddler:-1},{adult:2,toddler:1.5},{adult:101},{adult:0},{adult:'2'}])assert.throws(()=>normalizeGuestCounts(invalid));
});
test('server quote retains custom counts and rejects conflicting counts or missing revision',()=>{
 assert.deepEqual(normalizeQuoteRequest(request).guest_counts,counts);
 assert.throws(()=>normalizeQuoteRequest({...request,children_count:0}),/conflicts/);
 assert.throws(()=>normalizeQuoteRequest({...request,guest_age_policy_revision:undefined}),/Review guest types/);
});
test('linked table uses stable type keys, preserves zero and resolves Same as Adult',()=>{
 const anchor={id,name:'Superior Weekend',is_active:true,extra_adult_per_night:1500,guest_type_charges:{toddler:{mode:'same_as_adult'}}};
 const links=linkedAccommodationPrices('toddler',[anchor],[],[],{});assert.equal(links.length,1);assert.equal(links[0].amount,1500);assert.equal(links[0].mode,'same_as_adult');
 const zero=linkedAccommodationPrices('toddler',[{...anchor,guest_type_charges:{toddler:{mode:'fixed',amount:0}}}],[],[],{});assert.equal(zero[0].amount,0);
 assert.equal(linkedAccommodationPrices('senior',[anchor],[],[],{}).length,0);
 assert.equal(linkedAccommodationPrices('toddler',[{...anchor,extra_adult_per_night:null}],[],[],{})[0].amount,null);
});
test('custom override rates link to exact policy without inventing double-occupancy charges',()=>{
 const links=linkedAccommodationPrices('toddler',[],[],[{id,guest_type_key:'toddler',occupancy_type:'extra_toddler',adjustment_value:350,is_active:true},{id:'double',occupancy_type:'double',adjustment_value:4000}],{});
 assert.equal(links.length,1);assert.equal(links[0].amount,350);assert.ok(links[0].href.endsWith(id));
});
test('multi-night canonical quote passes keyed counts, saves five guests and rejects stale fingerprints',async()=>{
 let captured;
 const policy={revision:4,bands:[{key:'toddler',name:'Toddler',min_age:2,max_age:3}]};
 const variant={meal_plan_code:'FB',cancellation_policy_code:'refundable_credit',pricing_status:'verified',quote_fingerprint:'types-v4',guest_age_policy:policy,guest_counts:counts,total_price:9000,price_per_night:4500,room_rate:6000,meal_cost:3000,included_meals:[]};
 const db={from:table=>{const q={select:()=>q,eq:()=>q,order:()=>q,maybeSingle:async()=>({data:{id,is_published:true}}),then:r=>Promise.resolve({data:[]}).then(r)};return q;},rpc:async(name,args)=>{captured={name,args};return {data:[variant]};}};
 const quote=await calculateBookingQuote(db,request);assert.equal(captured.name,'calculate_guest_type_rate_variants');assert.deepEqual(captured.args.p_guest_counts,counts);assert.equal(captured.args.p_policy_revision,4);
 const saved=snapshotBookingFields(quote);assert.equal(saved.guests_count,5);assert.deepEqual(saved.guest_counts,counts);assert.deepEqual(saved.guest_policy_snapshot,policy);
 assert.equal(saved.rate_breakdown.validated_quote.request.guest_counts.toddler,1);assert.throws(()=>assertQuoteMatches(quote,quote.total_amount,'old-types-v3'),/price has changed/);
});