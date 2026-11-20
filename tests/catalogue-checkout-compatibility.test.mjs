import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import { calculateBookingQuote, normalizeQuoteRequest, assertQuoteMatches, QuoteError } from '../supabase/functions/_shared/bookingQuote.ts';

const id = '11111111-1111-4111-8111-111111111111';
const request = { room_type_id: id, check_in: '2027-03-15', check_out: '2027-03-16', adults_count: 2, children_count: 1, infants_count: 0, meal_plan_code: 'HB', cancellation_policy_code: 'refundable', addons: [] };
const keyedRequest = { ...request, guest_counts: {adult: 2, child: 1}, guest_age_policy_revision: 3 };
const variant = { meal_plan_code: 'HB', cancellation_policy_code: 'refundable', pricing_status: 'verified', quote_fingerprint: 'fixture-v1', total_price: 5800, price_per_night: 5800, room_rate: 3500, meal_cost: 2300 };
const gateName = 'get_meal_catalogue_checkout_gate';
function makeDb(gate) {
  const calls = [];
  const db = {
    rpc: async (name, args) => {
      calls.push({ name, args });
      if (name === gateName) {
        if (gate instanceof Error) throw gate;
        return gate;
      }
      return { data: [{ ...variant, ...(name === 'calculate_guest_type_rate_variants' ? {guest_age_policy:{revision:3}} : {}) }], error: null };
    },
    from: table => {
      calls.push({ name: table });
      const query = {
        select: () => query, eq: () => query,
        maybeSingle: async () => ({ data: { id, is_published: true, base_price: 3500 }, error: null }),
        order: async () => ({ data: [{min_amount:0,max_amount:null,gst_percentage:5}], error: null }),
      };
      return query;
    },
  };
  return { db, calls };
}

for (const mode of ['website', 'manual']) {
  test(`${mode}: gated fresh numeric quote is stopped before rate lookup`, async () => {
    const { db, calls } = makeDb({data:true,error:null});
    await assert.rejects(() => calculateBookingQuote(db,request,mode), e => e.code==='AGE_POLICY_CHANGED' && e.status===409);
    assert.deepEqual(calls.map(x => x.name), [gateName]);
  });
  test(`${mode}: gate OFF retains the legacy engine and established tax policy`, async () => {
    const { db, calls } = makeDb({data:false,error:null});
    const quote = await calculateBookingQuote(db,request,mode);
    assert.equal(calls[0].name,gateName);
    assert.equal(calls[2].name,mode==='website'?'calculate_website_rate_variants':'calculate_rate_variants_v2');
    assert.equal(quote.variant.quote_fingerprint,'fixture-v1');
    assert.equal(quote.total_amount,mode==='website'?6090:6844);
  });
  test(`${mode}: a current keyed quote uses the approved server route`, async () => {
    const { db, calls } = makeDb({data:true,error:null});
    const quote = await calculateBookingQuote(db,keyedRequest,mode);
    const pricing = calls.find(x=>x.name==='calculate_guest_type_rate_variants');
    assert.deepEqual(pricing.args.p_guest_counts,{adult:2,child:1});
    assert.equal(pricing.args.p_policy_revision,3);
    assert.equal(pricing.args.p_website,mode==='website');
    assert.equal(quote.variant.meal_cost,2300);
    assert.equal(calls.some(x=>x.name===gateName),false);
  });
}
for (const bad of [{data:null,error:{code:'PGRST202'}},{data:'false',error:null},{data:null,error:null},undefined,new Error('fixture transport failed')]) {
  test('unavailable or malformed release state fails closed', async () => {
    const { db, calls }=makeDb(bad);
    await assert.rejects(() => calculateBookingQuote(db,request),e=>e.code==='QUOTE_LOOKUP_FAILED'&&e.status===503);
    assert.deepEqual(calls.map(x=>x.name),[gateName]);
  });
}

// Exercise the shipped handler in a local VM. No real database or provider is used.
const edgeSource=readFileSync(new URL('../supabase/functions/create-razorpay-order-v3/index.ts',import.meta.url),'utf8');
const runnable=stripTypeScriptTypes(edgeSource.replace(/^import .*\n/gm,''));
async function paymentHandler({action='prepare',intent=null}={}) {
  const events=[];
  let handler;
  const saved={requestId:id,selection:{roomTypeId:id},quoteSnapshot:{request,variant},bookingMetadata:{guest:{name:'Fixture Guest'}}};
  const gateDb=makeDb({data:true,error:null});
  const db={
    ...gateDb.db,
    rpc:async(name,args)=>{
      if(name==='distribution_checkout_state')return{data:{enabled:true},error:null};
      if(name==='distribution_close_unused_checkout'){events.push('close-unused');return{data:true,error:null};}
      if(name==='distribution_resume_checkout'){events.push('saved-resume');return{data:{intent:saved,state:'confirmed',booking_status:'confirmed'},error:null};}
      events.push(name);return gateDb.db.rpc(name,args);
    },
  };
  const context=vm.createContext({
    serve:fn=>{handler=fn},createClient:()=>db,Response,Request,
    Deno:{env:{get:()=>''}},
    verifyCheckoutCapability:async()=> 'fixture-scope',
    normalizeQuoteRequest,calculateBookingQuote,assertQuoteMatches,QuoteError,
    normalizeBookingMetadata:()=>({}),classifySavedCheckout:()=> 'pending',
    createDistributionStore:()=>({resume:async()=>intent}),
    assertResumeMatches:(saved)=>events.push(['retained-price',saved.quoteSnapshot.variant.quote_fingerprint]),
    getDistributionRazorpayCredentials:async()=>{events.push('get-provider');return{keyId:'rzp_test_fixture'};},
    createDistributionRazorpayProvider:()=>({}),
    prepareWebsitePayment:async()=>{events.push('prepare-provider');return{state:'pending'};},
    InventoryPaymentError:class extends Error {},
  });
  vm.runInContext(runnable,context);
  const response=await handler(new Request('https://fixture.invalid',{method:'POST',body:JSON.stringify({action,request_id:id,quote_request:request})}));
  return {status:response.status,body:await response.json(),events};
}

test('website rejects fresh old quote before external payment work', async () => {
  const r=await paymentHandler();
  assert.equal(r.status,409);
  assert.equal(r.body.code,'AGE_POLICY_CHANGED');
  assert.equal(r.body.safe_to_change_selection,true);
  assert.deepEqual(r.events,[gateName,'close-unused']);
});
test('retry and explicit resume still use a saved quote without reading the catalogue gate', async () => {
  const durable={quoteSnapshot:{request,variant}};
  const retry=await paymentHandler({intent:durable});
  assert.equal(retry.status,200);
  assert.deepEqual(retry.events,[['retained-price','fixture-v1'],'get-provider','prepare-provider']);
  const resume=await paymentHandler({action:'resume'});
  assert.equal(resume.status,200);
  assert.deepEqual(resume.events,['saved-resume']);
  assert.equal(resume.body.state,'confirmed');
  assert.equal(resume.body.quote_request.infants_count,0);
});

test('authenticated manual Edge handler stops stale guest input before booking creation', async () => {
  const source=readFileSync(new URL('../supabase/functions/create-manual-booking/index.ts',import.meta.url),'utf8');
  const code=stripTypeScriptTypes(source.replace(/^import .*\n/gm,''));
  let handler, clients=0;
  const {db,calls}=makeDb({data:true,error:null});
  const caller={auth:{getUser:async()=>({data:{user:{id:'fixture-admin'}}})},rpc:async()=>({data:true,error:null})};
  const context=vm.createContext({
    serve:fn=>{handler=fn},createClient:()=>++clients===1?caller:db,
    Deno:{env:{get:()=>''}},Response,Request,calculateBookingQuote,assertQuoteMatches,QuoteError,
  });
  vm.runInContext(code,context);
  const response=await handler(new Request('https://fixture.invalid',{method:'POST',body:JSON.stringify({booking:{guest_name:'Fixture Guest'},quote_request:{...request,room_unit_id:id}})}));
  assert.equal(response.status,409);
  assert.equal((await response.json()).code,'AGE_POLICY_CHANGED');
  assert.deepEqual(calls.map(x=>x.name),[gateName]);
});
