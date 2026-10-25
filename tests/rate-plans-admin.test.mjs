import test from 'node:test';
import assert from 'node:assert/strict';
import { ratePlanPreview, validateRatePlan } from '../src/lib/rate-plans.ts';
const rates = { RO:0, BB:270, HB:920, FB:1510 };
const anchor = { name:'Standard Diwali', room_category_id:null,room_type_id:'standard',room_unit_id:null, amount:14000,source_meal_plan_code:'FB',quoted_nights:2,included_adults:2,start_date:'2026-11-05',end_date:'2026-11-22',min_nights:2,max_nights:null,day_type:'all',extra_adult_per_night:4500,extra_child_per_night:3000,extra_infant_per_night:0,priority:0,is_active:true,verified_basis:true,source_override_id:null };
test('two-night FB source normalizes once and derives nightly plans',()=>{
 assert.deepEqual(ratePlanPreview(anchor,rates),{RO:3980,BB:4520,HB:5820,FB:7000});
});
test('RO anchor keeps room price and adds meals once',()=>{
 assert.deepEqual(ratePlanPreview({...anchor,amount:5000,quoted_nights:1,source_meal_plan_code:'RO'},rates),{RO:5000,BB:5540,HB:6840,FB:8020});
});
test('a source BB or HB price derives the same four totals',()=>{
 for(const [code,price] of [['BB',4520],['HB',5820]]) assert.deepEqual(ratePlanPreview({...anchor,source_meal_plan_code:code,amount:price,quoted_nights:1},rates),{RO:3980,BB:4520,HB:5820,FB:7000});
});
test('validation preserves extra-person nightly amounts without a package divisor',()=>{
 assert.equal(validateRatePlan(anchor,rates).extra_adult_per_night,4500);
 assert.equal(validateRatePlan(anchor,rates).extra_child_per_night,3000);
});
test('negative accommodation and missing supplements are rejected',()=>{
 assert.throws(()=>ratePlanPreview({...anchor,amount:2000},rates),/lower than/);
 assert.throws(()=>ratePlanPreview(anchor,{...rates,HB:NaN}),/HB meal supplement/);
});
test('scope and invalid stay windows are rejected',()=>{
 assert.throws(()=>validateRatePlan({...anchor,room_unit_id:'u'},rates),/exactly one/);
 assert.throws(()=>validateRatePlan({...anchor,max_nights:1},rates),/Maximum/);
 assert.throws(()=>validateRatePlan({...anchor,end_date:'2026-11-01'},rates),/End date/);
 assert.throws(()=>validateRatePlan({...anchor,quoted_nights:0},rates),/Quoted/);
});
test('unknown meal basis cannot become active',()=>{
 assert.throws(()=>validateRatePlan({...anchor,verified_basis:false},rates),/Confirm/);
 assert.equal(validateRatePlan({...anchor,is_active:false,verified_basis:false},rates).is_active,false);
});
test('dynamic stay discount applies once to source anchor, not extras',()=>{
 const base={...anchor,amount:8000,quoted_nights:1,los_min_nights:2,los_adjustment_type:'fixed',los_adjustment_value:1000};
 assert.equal(ratePlanPreview(base,rates,1).FB,8000);
 assert.equal(ratePlanPreview(base,rates,2).FB,7000);
 assert.equal(ratePlanPreview(base,rates,4).FB,7000);
 assert.equal(ratePlanPreview(base,rates,2).RO,3980);
 assert.equal(validateRatePlan(base,rates).extra_adult_per_night,4500);
});
test('percentage and fixed stay discounts agree; package stacking rejected',()=>{
 const base={...anchor,amount:8000,quoted_nights:1,los_min_nights:2,los_adjustment_type:'percentage',los_adjustment_value:12.5};
 assert.equal(ratePlanPreview(base,rates,2).FB,7000);
 assert.throws(()=>validateRatePlan({...base,quoted_nights:2},rates),/cannot also/);
 assert.throws(()=>validateRatePlan({...base,los_adjustment_value:90},rates),/lower than/);
});
test('preview discounts never mutate source price or configured extras',()=>{
 const base={...anchor,amount:8000,quoted_nights:1,los_min_nights:2,los_adjustment_type:'fixed',los_adjustment_value:1000};
 const before=JSON.stringify(base); ratePlanPreview(base,rates,3); assert.equal(JSON.stringify(base),before);
});
test('migrated source and its own extra rows are protected, unrelated rows remain editable',async()=>{
 const {managedOverrideIds}=await import('../src/lib/rate-plans.ts');
 const common={room_type_id:'standard',room_unit_id:null,room_category_id:null,start_date:'2026-11-05',end_date:'2026-11-22',min_nights:2,max_nights:null,day_type:'weekday'};
 const rows=[{...common,id:'base',occupancy_type:'double'},{...common,id:'adult',occupancy_type:'extra_adult'},{...common,id:'child',occupancy_type:'extra_child'},{...common,id:'other',room_type_id:'deluxe',occupancy_type:'extra_adult'}];
 assert.deepEqual([...managedOverrideIds(rows,[{source_override_id:'base'}])].sort(),['adult','base','child']);
});
test('effective-date previews do not use a future supplement early',async()=>{
 const {supplementsForDate}=await import('../src/lib/rate-plans.ts');
 const versions=Object.entries(rates).map(([plan_code,amount])=>({id:plan_code,plan_code,amount,effective_from:'2026-10-25',recorded_at:'2026-10-25T10:00:00Z'}));
 versions.push({id:'newFB',plan_code:'FB',amount:1600,effective_from:'2026-12-01',recorded_at:'2026-10-26T10:00:00Z'});
 assert.equal(supplementsForDate(versions,'2026-11-01').FB,1510);
 assert.equal(supplementsForDate(versions,'2026-12-01').FB,1600);
 assert.ok(Number.isNaN(supplementsForDate(versions,'2026-10-01').FB));
});
test('legacy creation cannot overlap a managed scope/date even for another stay tier',async()=>{
 const {hasManagedRateOverlap}=await import('../src/lib/rate-plans.ts');
 const scope={room_type_id:'standard',room_category_id:null,room_unit_id:null,start_date:'2026-11-05',end_date:'2026-11-22'};
 assert.equal(hasManagedRateOverlap({...scope,start_date:'2026-11-22',end_date:'2026-11-30'},[scope]),true);
 assert.equal(hasManagedRateOverlap({...scope,start_date:'2026-11-23',end_date:'2026-11-30'},[scope]),false);
 assert.equal(hasManagedRateOverlap({...scope,room_type_id:'deluxe'},[scope]),false);
 assert.equal(hasManagedRateOverlap(scope,[{...scope,start_date:null,end_date:null}]),true);
 assert.equal(hasManagedRateOverlap({...scope,room_type_id:null},[scope]),false);
});
