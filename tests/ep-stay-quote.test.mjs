import test from 'node:test';
import assert from 'node:assert/strict';
import { quoteEpStay } from '../src/lib/ep-stay-quote.ts';
// Arbitrary fixtures only, not hotel rates or an approved occupancy policy.
const selection = {categoryId:'fixture-room',checkIn:'2026-12-31',checkOut:'2027-01-02',plan:'HB',guests:{adults:2,children:0,infants:0}};
const resolve = context => ({...context,approval:'approved',rateRevision:'rate-v1',policyRevision:'meal-v2',pricing:{basis:'EP',epPaise:100000,minimumEpPaise:1,mealTotalsPaise:{RO:0,BB:10000,HB:20000,FB:30000}}});
test('quotes checkout-exclusive nights across year boundary with per-night policies',()=>{
 const result=quoteEpStay(selection,context=>{const value=resolve(context);if(context.date==='2027-01-01'){value.pricing.epPaise=200000;value.policyRevision='meal-v3';value.pricing.mealTotalsPaise.HB=30000;}return value;});
 assert.deepEqual(result.nights.map(n=>n.date),['2026-12-31','2027-01-01']);
 assert.equal(result.subtotalPaise,350000);assert.equal(result.nights[1].policyRevision,'meal-v3');
 assert.equal(result.kind,'room-meal-subtotal');assert.equal(result.total_amount,undefined);
});
test('fails closed on a missing festive date instead of copying previous night',()=>assert.throws(()=>quoteEpStay(selection,c=>c.date==='2027-01-01'?undefined:resolve(c)),/unavailable/));
test('rejects unapproved records and missing audit revisions',()=>{
 for(const change of [{approval:'draft'},{rateRevision:''},{policyRevision:undefined}])assert.throws(()=>quoteEpStay(selection,c=>({...resolve(c),...change})));
});
test('rejects mismatched category, date and all guest categories',()=>{
 for(const change of [{categoryId:'other'},{date:'2026-01-01'},{guests:{adults:1,children:0,infants:0}},{guests:{adults:2,children:1,infants:0}},{guests:{adults:2,children:0,infants:1}}])assert.throws(()=>quoteEpStay(selection,c=>({...resolve(c),...change})),/does not match/);
});
test('never infers EP from AP or silently fills missing meals',()=>{
 for(const change of [{basis:'AP'},{mealTotalsPaise:{RO:0,BB:1,FB:3}}])assert.throws(()=>quoteEpStay(selection,c=>{const r=resolve(c);r.pricing={...r.pricing,...change};return r;}));
});
test('strict date validation and 365-night bound apply before resolution',()=>{
 for(const dates of [{checkIn:'2026-02-30'},{checkIn:'2027-01-02'},{checkOut:'2026-12-30'},{checkIn:'2025-01-01'},{checkIn:'12/31/2026'}]) assert.throws(()=>quoteEpStay({...selection,...dates},()=>assert.fail('must not resolve')));
});
test('validates selected plan, category and complete integer occupancy',()=>{
 for(const change of [{plan:'AP'},{categoryId:''},{guests:{adults:0,children:0,infants:0}},{guests:{adults:2,children:0}},{guests:{adults:2,children:1.5,infants:0}}])assert.throws(()=>quoteEpStay({...selection,...change},resolve));
});
test('preserves explicit manual override and reason snapshot',()=>{
 const result=quoteEpStay(selection,c=>{const r=resolve(c);r.pricing.overrides={HB:{amountPaise:125000,actorId:'fixture-admin',reason:'Test only'}};return r;});
 assert.equal(result.subtotalPaise,250000);assert.equal(result.nights[0].mode,'manual');assert.equal(result.nights[0].pricingSnapshot.overrides.HB.reason,'Test only');
});
test('rejects unsafe stay sum even if each night is individually safe',()=>assert.throws(()=>quoteEpStay({...selection,plan:'RO'},c=>{const r=resolve(c);r.pricing.epPaise=Number.MAX_SAFE_INTEGER-30000;return r;}),/safe integer/));
test('snapshot is independent from resolver records and original request',()=>{
 const records=[];const result=quoteEpStay(selection,c=>{const r=resolve(c);records.push(r);return r;});records[0].pricing.epPaise=1;
 assert.equal(result.nights[0].pricingSnapshot.epPaise,100000);result.selection.guests.adults=5;assert.equal(selection.guests.adults,2);
});
test('resolver cannot mutate the selected context',()=>assert.throws(()=>quoteEpStay(selection,c=>{c.guests.adults=1;return resolve(c);}),TypeError));
