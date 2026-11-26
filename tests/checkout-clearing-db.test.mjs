// Run against isolated PostgreSQL only. Never creates orders or guest bookings.
// CHECKOUT_PGLITE_MODULE=/tmp/rate-test/node_modules/@electric-sql/pglite/dist/index.js node --test tests/checkout-clearing-db.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const modulePath=process.env.CHECKOUT_PGLITE_MODULE;
const migrations=['20261126153112_1fadc748-83ec-4a22-be0e-f9f80cea19ac.sql','20261126153800_bbc17dc7-f56e-4097-a063-9c5bd232b1bb.sql'];
const id='11111111-1111-4111-8111-111111111111';
const hold='22222222-2222-4222-8222-222222222222';
const order={id:'order_fixture',receipt:'hl_fixture',currency:'INR',amount:100000,amount_paid:0,status:'created'};
test('isolated PostgreSQL checkout release and late-payment fences',{skip:!modulePath},async(t)=>{
 const {PGlite}=await import(modulePath);const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema distribution_private;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create function public.is_admin_new() returns boolean language sql as $$select coalesce(nullif(current_setting('test.admin',true),'')::boolean,false)$$;
 create table distribution_private.reservations(id uuid primary key,request_id uuid,state text,booking_id uuid,provider_order_id text,room_unit_id uuid,room_type_id uuid,check_in date,check_out date,created_at timestamptz default now(),released_at timestamptz,release_reason text);
 create table distribution_private.payment_intents(request_id uuid primary key,hold_id uuid,owner_scope text,quote_fingerprint text,amount_paise bigint,currency text,receipt text,state text,provider_order_id text,intent jsonb,created_at timestamptz default now(),updated_at timestamptz,review_reason text);
 create table distribution_private.closed_checkout_requests(request_id uuid primary key,owner_scope text);
 create table distribution_private.captured_payments(order_id text);
 create table public.bookings(id uuid,payment_order_id text);
 create table public.room_units(id uuid,unit_number text);
 create table public.room_types(id uuid,category_id uuid,name text);
 create table public.room_categories(id uuid,name text);
 create function distribution_private.intent_record(p distribution_private.payment_intents) returns jsonb language sql as $$select jsonb_build_object('holdId',p.hold_id,'requestId',p.request_id,'ownerScope',p.owner_scope,'amountPaise',p.amount_paise,'currency',p.currency,'receipt',p.receipt,'quoteFingerprint',p.quote_fingerprint)$$;
 create function public.distribution_confirm_captured_payment(jsonb,jsonb) returns jsonb language sql as $$select '{"bookingId":"existing-legacy-result","unitId":"unit","reused":false}'::jsonb$$;
 insert into distribution_private.reservations(id,request_id,state,provider_order_id) values('${hold}','${id}','held','order_fixture');
 insert into distribution_private.payment_intents(request_id,hold_id,owner_scope,quote_fingerprint,amount_paise,currency,receipt,state,provider_order_id) values('${id}','${hold}','fixture-owner','fingerprint',100000,'INR','hl_fixture','ready','order_fixture');`);
 for(const migration of migrations)await db.exec(readFileSync(new URL('../supabase/migrations/'+migration,import.meta.url),'utf8'));
 const scalar=async(sql,args=[]) => (await db.query(sql,args)).rows[0].value;
 const clear=(o=order,payments=[],owner='fixture-owner')=>scalar('select public.distribution_abandon_unpaid_checkout($1::uuid,$2,$3::jsonb,$4::jsonb) as value',[id,owner,JSON.stringify(o),JSON.stringify(payments)]);
 const trial=async(name,fn)=>t.test(name,async()=>{await db.exec('begin');try{await fn();}finally{await db.exec('rollback');}});
 await trial('unpaid order releases inventory and permanently closes its request',async()=>{
  assert.equal(await clear(),true);
  assert.equal(await scalar('select state as value from distribution_private.reservations'),'released');
  assert.equal(await scalar('select provider_order_id as value from distribution_private.payment_intents'),'order_fixture');
  assert.equal(await scalar('select count(*)::int as value from distribution_private.closed_checkout_requests'),1);
  assert.equal(await clear(),true);
  assert.equal(await scalar('select public.distribution_checkout_session_available($1::uuid) as value',[id]),false);
 });
 await trial('failed attempts permit release',async()=>assert.equal(await clear({...order,status:'attempted'},[{order_id:order.id,status:'failed'}]),true));
 for(const status of ['authorized','captured','created','refunded'])await trial(status+' payment prevents release',async()=>{
  assert.equal(await clear(order,[{order_id:order.id,status}]),false);
  assert.equal(await scalar('select state as value from distribution_private.reservations'),'held');
 });
 await trial('wrong owner cannot release',async()=>assert.equal(await clear(order,[],'foreign-owner'),false));
 await trial('malformed order or list cannot release',async()=>{
  assert.equal(await clear({...order,status:null}),false);
  assert.equal(await clear({...order,amount:1}),false);
  assert.equal(await clear(order,null),false);
 });
 await trial('successful order cannot release',async()=>assert.equal(await clear({...order,status:'paid',amount_paid:100000}),false));
 await trial('confirmed booking wins over clearing',async()=>{
  await db.exec(`insert into bookings values('${hold}','order_fixture')`);
  assert.equal(await clear(),false);
 });
 await trial('late payment is recorded for review without booking or inventory allocation',async()=>{
  assert.equal(await clear(),true);
  const record=await scalar('select public.distribution_find_bound_order($1,$2) as value',[order.id,'fixture-owner']);
  const payment={id:'pay_late',order_id:order.id,status:'captured',amount:100000,currency:'INR'};
  const result=await scalar('select public.distribution_confirm_captured_payment($1::jsonb,$2::jsonb) as value',[JSON.stringify(record),JSON.stringify(payment)]);
  assert.equal(result.review_required,true);
  assert.equal(await scalar('select abandoned_payment->>\'id\' as value from distribution_private.payment_intents'),'pay_late');
  assert.equal(await scalar('select state as value from distribution_private.reservations'),'released');
  assert.equal(await scalar('select count(*)::int as value from bookings'),0);
  assert.equal(await clear(),false);
  await assert.rejects(()=>db.exec(`insert into bookings values('${hold}','order_fixture')`),/requires hotel review/);
 });
 await trial('active payment delegates to the existing booking finalizer unchanged',async()=>{
  const result=await scalar("select public.distribution_confirm_captured_payment('{}','{}') as value");
  assert.equal(result.bookingId,'existing-legacy-result');
 });
 await trial('guest roles cannot invoke clearing or webhook lookups',async()=>{
  assert.equal(await scalar("select has_function_privilege('anon','public.distribution_abandon_unpaid_checkout(uuid,text,jsonb,jsonb)','EXECUTE') as value"),false);
  assert.equal(await scalar("select has_function_privilege('authenticated','public.distribution_lookup_webhook_order(text)','EXECUTE') as value"),false);
 });
 }finally{await db.close();}
});