import test from 'node:test';
import assert from 'node:assert/strict';
import { validateGuestAgeBands, validateGuestAgePolicySave, guestPolicySaveError, guestTypeKey, guestTypeName, alternateGuestPolicy, mealChargeableCount } from '../src/lib/guest-age-policy.ts';
import { guestTypeChargeAmount, validateGuestTypeCharges } from '../src/lib/guest-type-charges.ts';
import { mealAgeRuleError, mealAgeAmount } from '../src/lib/meal-age-pricing.ts';

const bands=[{key:'infant',min_age:0,max_age:3,accommodation_rule:'free',meal_rule:'free'}, {key:'child',min_age:4,max_age:9,accommodation_rule:'child',meal_rule:'full'}, {key:'adult',min_age:10,max_age:null,accommodation_rule:'adult',meal_rule:'full'}];
test('typed guest names retain their display name and stable key',()=>{
 assert.equal(guestTypeKey('Senior Guest'),'senior_guest');
 assert.equal(guestTypeName({key:'senior_guest',name:'Senior Guest'}),'Senior Guest');
});
test('live save rejects Infant 0–1 when Child starts at 4, identifying uncovered ages 2–3',()=>{
 const next=bands.map(b=>b.key==='infant'?{...b,max_age:1}:b);
 assert.match(validateGuestAgePolicySave(next,true),/ages 2–3/);
 assert.equal(validateGuestAgePolicySave(next,false),null);
});
test('live save rejects Adult capped at 60 but staged configuration permits it',()=>{
 const next=bands.map(b=>b.key==='adult'?{...b,max_age:60}:b);
 assert.match(validateGuestAgePolicySave(next,true),/Adult must keep No Limit/);
 assert.equal(validateGuestAgePolicySave(next,false),null);
});
test('live save accepts continuous standard bands and charge-only edits',()=>{
 assert.equal(validateGuestAgePolicySave(bands,true),null);
 assert.equal(validateGuestAgePolicySave(bands.map(b=>b.key==='child'?{...b,meal_rule:'free'}:b),true),null);
});
test('custom named segments stay blocked for live pricing',()=>{
 const next=[...bands.slice(0,2),{...bands[2],max_age:59},{key:'senior',name:'Senior',min_age:60,max_age:null,accommodation_rule:'guest_type',meal_rule:'full'}];
 assert.match(validateGuestAgePolicySave(next,true),/matching booking and pricing support/);
 assert.equal(validateGuestAgePolicySave(next,false),null);
});
test('Supabase plain-object errors retain the authoritative save reason',()=>{
 assert.equal(guestPolicySaveError({code:'P0001',message:'Live age ranges must cover every age without gaps'}),'Live age ranges must cover every age without gaps');
 assert.match(guestPolicySaveError({message:'AGE_POLICY_CHANGED: refresh and review before saving'}),/saved policy changed/);
});
test('Adult accepts a finite maximum and a separately named upper age segment',()=>{
 const next=[...bands.slice(0,2),{...bands[2],max_age:59},{key:'senior',name:'Senior',min_age:60,max_age:null,accommodation_rule:'guest_type',meal_rule:'full'}];
 assert.equal(validateGuestAgeBands(next),null);
 assert.ok(validateGuestAgeBands([...bands,next[3]]));
});
test('No Charge and Guest Type Charge are valid for every configured guest type',()=>{
 for(const accommodation_rule of ['free','guest_type']) for(const meal_rule of ['free','full']) assert.equal(validateGuestAgeBands([{key:'senior',min_age:60,max_age:90,accommodation_rule,meal_rule}]),null);
});
test('a policy cannot be deactivated without an alternate covering the same ages',()=>{
 assert.equal(alternateGuestPolicy(bands[1],bands,bands),undefined);
 assert.equal(alternateGuestPolicy(bands[1],[{...bands[1],max_age:8,meal_rule:'free'}],bands),undefined);
 const alternate={...bands[1],meal_rule:'free'};
 assert.deepEqual(alternateGuestPolicy(bands[1],[alternate],bands),alternate);
});
test('disabled policies retain configured charges rather than forcing No Charge',()=>{
 const policy={revision:1,updated_at:'',bands:[{...bands[0],enabled:false},...bands.slice(1)]};
 assert.equal(mealChargeableCount(policy,{adult:2,child:1,infant:1}),4);
});
test('Same as Adult follows later adult amount changes',()=>{
 assert.equal(guestTypeChargeAmount({mode:'same_as_adult'},'600','1000'),'1000');
 assert.equal(guestTypeChargeAmount({mode:'same_as_adult'},'600','1500'),'1500');
 assert.equal(guestTypeChargeAmount(undefined,'600','1500'),'600');
});
test('custom types support fixed or linked rates and reject invalid amounts',()=>{
 assert.equal(validateGuestTypeCharges({senior:{mode:'fixed',amount:450},child:{mode:'same_as_adult'}}),null);
 for(const amount of [-1,NaN,1.001]) assert.ok(validateGuestTypeCharges({senior:{mode:'fixed',amount}}));
 assert.ok(validateGuestTypeCharges({adult:{mode:'same_as_adult'}}));
});
test('meal rates include every named guest type and support Same as Adult or fixed rates',()=>{
 const keys=['adult','child','infant','senior'];
 const rules=['RO','BB','HB','FB'].flatMap(plan_code=>keys.map(band_key=>({plan_code,band_key,mode:plan_code==='RO'?'free':'full',value:null})));
 assert.equal(mealAgeRuleError(rules,keys),null);
 assert.ok(mealAgeRuleError(rules.slice(1),keys));
 assert.equal(mealAgeAmount(920,{plan_code:'HB',band_key:'senior',mode:'full',value:null},false),920);
 assert.equal(mealAgeAmount(920,{plan_code:'HB',band_key:'senior',mode:'fixed',value:450},false),450);
});