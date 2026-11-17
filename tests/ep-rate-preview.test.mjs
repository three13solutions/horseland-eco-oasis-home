import test from 'node:test';
import assert from 'node:assert/strict';
import { previewEpNight, resetPlanToAutomatic } from '../src/lib/ep-rate-preview.ts';
// Illustrative test fixture only. These are NOT approved hotel selling rates.
const input = { basis:'EP', epPaise:250000, minimumEpPaise:100000,
  mealTotalsPaise:{RO:0,BB:30000,HB:110000,FB:200000} };
const amounts = value => previewEpNight(value).rows.map(row=>row.amountPaise);
test('EP adds each configured total once, never subtracts from AP',()=>{
  assert.deepEqual(amounts(input),[250000,280000,360000,450000]);
});
test('changing base recalculates all automatic plans',()=>{
  assert.deepEqual(amounts({...input,epPaise:300000}),[300000,330000,410000,500000]);
});
test('manual override stays fixed when base changes and reset restores linkage',()=>{
  const fixed={...input,overrides:{HB:{amountPaise:350000,actorId:'fixture-admin',reason:'Fixture offer'}}};
  const changed={...fixed,epPaise:300000};
  assert.equal(amounts(changed)[2],350000);
  assert.equal(previewEpNight(changed).rows[2].mode,'manual');
  assert.equal(amounts(resetPlanToAutomatic(changed,'HB'))[2],410000);
  assert.equal(fixed.overrides.HB.amountPaise,350000);
});
test('legacy AP/CP/MAP cannot be used or silently inferred as EP',()=>{
  for (const basis of ['AP','FB','CP','MAP',undefined]) assert.throws(()=>previewEpNight({...input,basis}),/Only an explicitly/);
});
test('negative, non-finite, fractional, missing and overflowing money rejected',()=>{
  for (const epPaise of [-1,NaN,Infinity,1.1,undefined,Number.MAX_SAFE_INTEGER+1]) assert.throws(()=>previewEpNight({...input,epPaise}));
  assert.throws(()=>previewEpNight({...input,epPaise:Number.MAX_SAFE_INTEGER}));
  assert.throws(()=>previewEpNight({...input,mealTotalsPaise:{...input.mealTotalsPaise,HB:undefined}}));
});
test('minimum base and minimum override guardrail',()=>{
  assert.throws(()=>previewEpNight({...input,epPaise:99999}),/minimum/);
  assert.throws(()=>previewEpNight({...input,overrides:{FB:{amountPaise:99999,actorId:'a',reason:'r'}}}),/minimum/);
});
test('override needs actor and reason; unknown plans and RO overrides rejected',()=>{
  for(const actorId of ['',undefined]) assert.throws(()=>previewEpNight({...input,overrides:{FB:{amountPaise:400000,actorId,reason:'r'}}}),/actor and a reason/);
  assert.throws(()=>previewEpNight({...input,overrides:{FB:{amountPaise:400000,actorId:'a',reason:' '}}}),/actor and a reason/);
  for(const code of ['RO','AP','unknown']) assert.throws(()=>previewEpNight({...input,overrides:{[code]:{amountPaise:400000,actorId:'a',reason:'r'}}}),/Overrides may target/);
});
test('unusual ordering warns without silently rewriting deliberate override',()=>{
  const result=previewEpNight({...input,overrides:{FB:{amountPaise:200000,actorId:'a',reason:'r'}}});
  assert.equal(result.rows[3].amountPaise,200000);
  assert.equal(result.warnings.length,2);
});
test('EP meals must be zero',()=>assert.throws(()=>previewEpNight({...input,mealTotalsPaise:{...input.mealTotalsPaise,RO:1}}),/must not include/));
test('preview is repeatable and never mutates inputs',()=>{
  const before=JSON.stringify(input);
  assert.deepEqual(previewEpNight(input),previewEpNight(input));
  assert.equal(JSON.stringify(input),before);
});
