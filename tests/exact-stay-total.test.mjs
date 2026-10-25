import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
const source=readFileSync(new URL('../src/lib/razorpay.ts',import.meta.url),'utf8');
const code=source.slice(source.indexOf('export const calculateBookingAmount'),source.indexOf('export const formatCurrency')).replace('export const calculateBookingAmount','globalThis.calculateBookingAmount');
const ctx=vm.createContext({RAZORPAY_CONFIG:{GST_RATE:.18}});vm.runInContext(stripTypeScriptTypes(code),ctx);
for(const nights of [3,7]) test(`${nights} nights use exact stay total, not rounded nightly display`,()=>{
 const total=10000, roundedNight=Math.round(total/nights*100)/100;
 const result=ctx.calculateBookingAmount(roundedNight,nights,270,.18,total);
 assert.equal(result.baseAmount,10000);assert.equal(result.totalAmount,12118.6);
});
test('tax and total are rounded to paise once',()=>{const r=ctx.calculateBookingAmount(0,3,0,.18,100.03);assert.equal(r.gstAmount,18.01);assert.equal(r.totalAmount,118.04)});

test('edit-stay dates retain selected local calendar dates',()=>{const source=readFileSync(new URL('../src/pages/Booking.tsx',import.meta.url),'utf8');assert.doesNotMatch(source,/tempCheck(In|Out)\.toISOString/);assert.match(source,/format\(tempCheckIn, 'yyyy-MM-dd'\)/);assert.match(source,/format\(tempCheckOut, 'yyyy-MM-dd'\)/)});
