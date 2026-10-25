import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import { QuoteError } from '../supabase/functions/_shared/bookingQuote.ts';
const source=readFileSync(new URL('../supabase/functions/create-razorpay-order-v2/index.ts',import.meta.url),'utf8');
// Avoid network and credential loading while exercising the actual order handler.
const stubbed=source.replace(/async function getRazorpayCredentials\(\) \{[\s\S]*?\nserve\(/, "async function getRazorpayCredentials() { return {keyId:'test-local',secret:'local-test'} }\nserve(");
const runnable=stripTypeScriptTypes(stubbed.replace(/^import .*\n/gm,''),{mode:'strip'});
async function run(config={}){
 let handler;const calls=[];
 const db={auth:{getUser:async()=>({data:{user:{id:'staff'}}})},rpc:async()=>({data:true}),from:table=>({
 select:()=>({eq:()=>({maybeSingle:async()=>({data:config.booking})}),contains:()=>({maybeSingle:async()=>({data:config.pending??null})})}),
 insert:async payload=>{calls.push({table,payload});return{error:config.saveError?{}:null}}})};
 const context=vm.createContext({serve:fn=>handler=fn,createClient:()=>db,QuoteError,
  Deno:{env:{get:()=>''}},Response,Request,Date,Math,Number,btoa,
  console:{error:()=>{}},
  calculateBookingQuote:async()=>{if(config.quoteError)throw new QuoteError('RATE_BASIS_UNVERIFIED','Unavailable');return{request:{},total_amount:120,variant:{quote_fingerprint:'v1'}}},
  assertQuoteMatches:(q,a,f)=>{if(a!==120||f!=='v1')throw new QuoteError('QUOTE_CHANGED','Refresh')},
  fetch:async(url,opts)=>{calls.push({url,body:opts.body?JSON.parse(opts.body):null});return{ok:true,json:async()=>({id:'order-local',amount:12000,currency:'INR',status:'created',amount_paid:0,...config.order})}},
 });
 vm.runInContext(runnable,context);
 const response=await handler(new Request('https://local/order',{method:'POST',body:JSON.stringify({amount:120,quote_request:{},quote_fingerprint:'v1',...config.payload})}));
 return{status:response.status,body:await response.json(),calls};
}
test('payment order uses server quote and saves snapshot before exposing order',async()=>{const r=await run();assert.equal(r.status,200);assert.equal(r.calls[0].body.amount,12000);assert.equal(r.calls[1].table,'booking_order_quotes');assert.equal(r.calls[1].payload.amount,120)});
test('stale browser amount does not create an external order',async()=>{const r=await run({payload:{amount:1}});assert.equal(r.status,409);assert.equal(r.body.code,'QUOTE_CHANGED');assert.equal(r.calls.length,0)});
test('unverified missing quote does not create an order',async()=>{const r=await run({quoteError:true});assert.equal(r.status,409);assert.equal(r.calls.length,0)});
test('failure to persist snapshot never returns a payable order',async()=>{const r=await run({saveError:true});assert.equal(r.status,503);assert.equal(r.body.id,undefined);assert.equal(r.body.code,'ORDER_QUOTE_SAVE_FAILED')});
test('non-INR requests rejected before any external payment action',async()=>{const r=await run({payload:{currency:'USD'}});assert.equal(r.status,400);assert.equal(r.calls.length,0)});

const booking={id:'booking-1',total_amount:120,payment_status:'pending',payment_id:null,rate_breakdown:{}};
test('confirmed saved booking rejected before Razorpay call',async()=>{const r=await run({payload:{existing_booking_id:'booking-1'},booking:{...booking,payment_status:'confirmed'}});assert.equal(r.body.code,'BOOKING_ALREADY_PAID');assert.equal(r.calls.length,0)});
test('saved payment ID rejected even with pending status',async()=>{const r=await run({payload:{existing_booking_id:'booking-1'},booking:{...booking,payment_id:'pay-existing'}});assert.equal(r.body.code,'BOOKING_ALREADY_PAID');assert.equal(r.calls.length,0)});
test('existing payable saved booking order reused, not replaced',async()=>{const r=await run({payload:{existing_booking_id:'booking-1'},booking,pending:{order_id:'order-local',amount:120,currency:'INR'}});assert.equal(r.status,200);assert.equal(r.calls.length,1);assert.equal(r.calls[0].body,null);assert.match(r.calls[0].url,/orders\/order-local$/)});
test('paid existing order requires reconciliation before another charge',async()=>{const r=await run({payload:{existing_booking_id:'booking-1'},booking,pending:{order_id:'order-local',amount:120,currency:'INR'},order:{status:'paid',amount_paid:12000}});assert.equal(r.body.code,'PAYMENT_RECONCILIATION_REQUIRED');assert.equal(r.calls.length,1)});
test('changed saved booking does not replace outstanding order',async()=>{const r=await run({payload:{existing_booking_id:'booking-1'},booking,pending:{order_id:'order-local',amount:100,currency:'INR'}});assert.equal(r.body.code,'OUTSTANDING_ORDER_CHANGED');assert.equal(r.calls.length,0)});
