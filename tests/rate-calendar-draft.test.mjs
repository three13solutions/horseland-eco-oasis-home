import test from 'node:test';
import assert from 'node:assert/strict';
import { selectDates, applyDraftRates, getDraftRate, previewDraftRate, parseRupeesToPaise } from '../src/lib/rate-calendar-draft.ts';
const base = {categoryId:'test',dates:['2026-11-17'],epPaise:100000};
test('dates inclusive and Saturday-only weekend',()=>{
 assert.deepEqual(selectDates('2026-11-20','2026-11-22','weekends'),['2026-11-21']);
 assert.deepEqual(selectDates('2026-11-20','2026-11-22','weekdays'),['2026-11-20','2026-11-22']);
 assert.equal(selectDates('2026-11-20','2026-11-22').length,3);
});
test('configurable weekend',()=>assert.deepEqual(selectDates('2026-11-20','2026-11-22','weekends',[0,5,6]),['2026-11-20','2026-11-21','2026-11-22']));
test('reject invalid and inverted dates and unbounded ranges',()=>{
 for(const args of [['2026-02-30','2026-03-01'],['2026-11-22','2026-11-20'],['2026-1-1','2026-01-02'],['2026-01-01','2029-01-01']]) assert.throws(()=>selectDates(...args));
 assert.throws(()=>selectDates('2026-01-01','2026-01-02','all',[7]));
});
test('leap year is valid',()=>assert.equal(selectDates('2028-02-28','2028-03-01').length,3));
test('money parsing does not silently accept invalid or excessive precision',()=>{
 assert.equal(parseRupeesToPaise('2500.25'),250025);
 for (const v of ['', '-1','1.234','Infinity','3,000','1e3']) assert.throws(()=>parseRupeesToPaise(v));
});
test('missing meal supplements do not become zero',()=>{
 const row=applyDraftRates([],base)[0]; const p=previewDraftRate(row);
 assert.equal(p.rows[0].amountPaise,100000); assert.equal(p.rows[1].amountPaise,null);
 assert.deepEqual(p.missingPlans,['BB','HB','FB']);
});
test('meal prices are additive explicit totals',()=>{
 const row=applyDraftRates([],{...base,mealTotalsPaise:{BB:10000,HB:30000,FB:50000}})[0];
 assert.deepEqual(previewDraftRate(row).rows.map(x=>x.amountPaise),[100000,110000,130000,150000]);
});
test('bulk update is scoped, deduplicated, immutable and preserves previous overrides',()=>{
 const previous=applyDraftRates([],{...base,dates:['2026-11-17','2026-11-18'],overrides:{BB:{amountPaise:120000,reason:'test',actorId:'test'}}});
 const before=JSON.stringify(previous);
 const next=applyDraftRates(previous,{...base,dates:['2026-11-17','2026-11-17'],epPaise:110000});
 assert.equal(next.length,2); assert.equal(getDraftRate(next,'test','2026-11-18').epPaise,100000);
 assert.equal(getDraftRate(next,'test','2026-11-17').overrides.BB.amountPaise,120000);
 next[0].overrides.BB.reason='changed'; assert.equal(JSON.stringify(previous),before);
});
test('explicit empty overrides restore automatic pricing',()=>{
 const previous=applyDraftRates([],{...base,mealTotalsPaise:{BB:10000},overrides:{BB:{amountPaise:120000,reason:'test',actorId:'test'}}});
 const updated=applyDraftRates(previous,{...base,overrides:{}});
 assert.equal(previewDraftRate(updated[0]).rows[1].amountPaise,110000);
});
test('reject empty category, selection, negative fractional and invalid values',()=>{
 for (const patch of [{categoryId:''},{dates:[]},{dates:['bad']},{epPaise:-1},{epPaise:0.5},{epPaise:NaN},{minimumEpPaise:110000},{mealTotalsPaise:{RO:100}},{mealTotalsPaise:{BB:-1}}]) assert.throws(()=>applyDraftRates([],{...base,...patch}));
});
test('overrides require reason actor valid plan and nonnegative amount',()=>{
 for(const overrides of [{BB:{amountPaise:1,reason:'',actorId:'test'}},{BB:{amountPaise:1,reason:'test',actorId:''}},{BB:{amountPaise:-1,reason:'test',actorId:'test'}},{RO:{amountPaise:1,reason:'test',actorId:'test'}}]) assert.throws(()=>applyDraftRates([],{...base,overrides}));
});
test('ordering warning is visible even if intermediate meals missing',()=>{
 const row=applyDraftRates([],{...base,overrides:{FB:{amountPaise:50000,reason:'test',actorId:'test'}}})[0];
 assert.ok(previewDraftRate(row).warnings.some(w=>w.includes('out of')));
});
