import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateEpPromotion,normalizePromoCode} from '../supabase/functions/_shared/epPromo.ts';
const promo={code:'DIRECT1000',revision:1,amount_per_night:0,amount_per_booking:1000,is_active:true};
for(const nights of [1,2,10]) test(`flat 1000 for ${nights} nights`,()=>{const p=calculateEpPromotion({room_rate:10000,total_price:15000},'2026-12-01',`2026-12-${String(nights+1).padStart(2,'0')}`,promo);assert.equal(p.discount_amount,1000);assert.equal(p.basis,'FLAT_PER_BOOKING');});
test('cap at accommodation without negative price',()=>assert.equal(calculateEpPromotion({room_rate:500,total_price:1500},'2026-12-01','2026-12-02',promo).discount_amount,500));
test('inactive and malformed offers fail closed',()=>{for(const d of [{is_active:false},{amount_per_booking:2000},{amount_per_night:300},{revision:0}])assert.throws(()=>calculateEpPromotion({room_rate:5000,total_price:5000},'2026-12-01','2026-12-02',{...promo,...d}));});
test('cannot stack codes',()=>{assert.throws(()=>normalizePromoCode(['DIRECT1000','EP300']));assert.throws(()=>normalizePromoCode('DIRECT1000,EP300'));});
