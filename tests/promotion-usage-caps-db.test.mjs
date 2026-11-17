// Isolated PostgreSQL execution, not a multi-session concurrency stress test.
// PROMO_PGLITE_MODULE=/tmp/horseland-age-dbtest/node_modules/@electric-sql/pglite/dist/index.js node --test tests/promotion-usage-caps-db.test.mjs
// Production concurrency requires two independent PostgreSQL sessions racing begin-intent.
// PGlite serializes work in one session; Promise.all below verifies queued contenders,
// while SELECT FOR UPDATE in the trigger is the production serialization mechanism.
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';
const modulePath=process.env.PROMO_PGLITE_MODULE;
test('cap migration reserves/redeems atomically, backfills, fences retries and enforces limits',{skip:(!modulePath||!existsSync(modulePath))&&'Set PROMO_PGLITE_MODULE to installed PGlite'},async()=>{
 const {PGlite}=await import(modulePath);const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema distribution_private;
 create function auth.uid() returns uuid language sql as $$select '00000000-0000-0000-0000-000000000001'::uuid$$;
 create function public.is_admin_new() returns boolean language sql as $$select true$$;
 create function public.is_pricing_weekend(date,integer[],uuid) returns boolean language sql as $$select extract(dow from $1)=6$$;
 create table public.room_units(id uuid,category_id uuid);create table public.room_types(id uuid,category_id uuid);insert into room_types values('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002');
 create table public.website_promotions(code text primary key,is_active boolean,revision integer,discount_basis text,day_scope text,booking_from date,booking_to date,stay_from date,stay_to date,mixed_stay_mode text,min_stay_nights integer,eligible_meal_plan_codes text[],eligible_room_category_ids uuid[],excluded_stay_dates date[] not null default '{}');
 insert into website_promotions(code,is_active,revision,discount_basis,day_scope) values('CAP',true,1,'booking','both'),('HIST',true,1,'booking','both'),('GUEST',true,1,'booking','both');
 create table distribution_private.payment_intents(request_id uuid primary key,intent jsonb,state text,created_at timestamptz default now());
 create function public.save_managed_website_promotion(p_settings jsonb,p_expected_revision integer default null) returns jsonb language plpgsql set search_path=public as $$declare r jsonb;begin if not exists(select from website_promotions where code=p_settings->>'code' and revision=p_expected_revision for update) then raise exception 'Stale';end if;update website_promotions set revision=revision+1 where code=p_settings->>'code' returning to_jsonb(website_promotions.*) into r;return r;end$$;`);
 const uuid=i=>`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`;
 const intent=(code,email='Guest@Example.com',revision=1,change={})=>({bookingMetadata:{guest:{email}},quoteSnapshot:{promotion:{code,revision},request:{promo_code:code,room_type_id:'00000000-0000-0000-0000-000000000001',check_in:'2027-02-01',check_out:'2027-02-03',meal_plan_code:'RO',...change}},selection:{roomTypeId:'00000000-0000-0000-0000-000000000001',checkIn:'2027-02-01',checkOut:'2027-02-03'}});
 await db.query('insert into distribution_private.payment_intents(request_id,intent,state) values($1,$2,\'confirmed\')',[uuid(1),JSON.stringify(intent('HIST'))]);
 await db.exec(readFileSync(new URL('../supabase/migrations/20261118000400_promo_usage_caps.sql',import.meta.url),'utf8'));
 const count=async(table)=>Number((await db.query(`select count(*) as n from distribution_private.${table}`)).rows[0].n);
 assert.equal(await count('promotion_uses'),1);
 assert.equal((await db.query("select state from distribution_private.promotion_uses")).rows[0].state,'redeemed');
 const save=async(code,total,guest)=>db.query('select save_managed_website_promotion($1,1)',[JSON.stringify({code,total_usage_limit:total,per_guest_usage_limit:guest})]);
 await save('CAP',1,null);await save('GUEST',null,1);await save('HIST',null,1);
 const add=(i,code,email,rev=2,change={})=>db.query("insert into distribution_private.payment_intents(request_id,intent,state) values($1,$2,'creating') on conflict(request_id) do nothing",[uuid(i),JSON.stringify(intent(code,email,rev,change))]);
 const contenders=await Promise.allSettled([add(2,'CAP','a@x.com'),add(3,'CAP','b@x.com')]);
 assert.equal(contenders.filter(x=>x.status==='fulfilled').length,1);assert.equal(contenders.filter(x=>x.status==='rejected').length,1);
 assert.equal(await count('payment_intents'),2);assert.equal(await count('promotion_uses'),2); // loser fully rolled back
 await add(2,'CAP','a@x.com');assert.equal(await count('promotion_uses'),2); // retry no double use
 await add(4,'GUEST',' Guest@Example.com ');await assert.rejects(add(5,'GUEST','guest@example.COM'),/PROMO_GUEST_LIMIT/);
 await assert.rejects(add(6,'HIST','guest@example.com'),/PROMO_GUEST_LIMIT/); // backfilled use counts
 await db.query("update distribution_private.payment_intents set state='confirmed' where request_id=$1",[uuid(4)]);
 await db.query("update distribution_private.payment_intents set state='confirmed' where request_id=$1",[uuid(4)]);
 assert.equal((await db.query('select state from distribution_private.promotion_uses where request_id=$1',[uuid(4)])).rows[0].state,'redeemed');
 await db.query("update distribution_private.payment_intents set state='released' where request_id=$1",[uuid(4)]);
 await assert.rejects(add(7,'GUEST','guest@example.com'),/PROMO_GUEST_LIMIT/); // unsafe label/timeout cannot restore use
 await assert.rejects(add(8,'GUEST','different@example.com',1),/PROMO_CHANGED/);
 await assert.rejects(add(9,'GUEST','different@example.com',2,{check_out:'2027-02-04'}),/Quote selection mismatch/);
 await db.exec("update website_promotions set booking_to='2000-01-01' where code='GUEST'");await assert.rejects(add(10,'GUEST','different@example.com'),/Booking window closed/);
 const before=await count('payment_intents');await db.exec("update website_promotions set booking_to=null,is_active=false where code='GUEST'");await assert.rejects(add(11,'GUEST','different@example.com'),/PROMO_CHANGED/);assert.equal(await count('payment_intents'),before);
 await db.exec("update website_promotions set is_active=true,discount_basis='night',day_scope='weekend',mixed_stay_mode='eligible_nights' where code='GUEST'");
 const calendarIntent=intent('GUEST','calendar@example.com',2);calendarIntent.quoteSnapshot.request.check_in='2027-02-05';calendarIntent.quoteSnapshot.request.check_out='2027-02-07';calendarIntent.selection.checkIn='2027-02-05';calendarIntent.selection.checkOut='2027-02-07';
 calendarIntent.quoteSnapshot.promotion.eligible_dates=['2027-02-05'];
 await assert.rejects(db.query("insert into distribution_private.payment_intents(request_id,intent,state) values($1,$2,'creating')",[uuid(12),JSON.stringify(calendarIntent)]),/Stay-day eligibility changed/);
 delete calendarIntent.quoteSnapshot.promotion.eligible_dates;calendarIntent.quoteSnapshot.promotion.nightly_discounts=[{date:'2027-02-05',discount:100}];
 await assert.rejects(db.query("insert into distribution_private.payment_intents(request_id,intent,state) values($1,$2,'creating')",[uuid(13),JSON.stringify(calendarIntent)]),/discounted night is no longer eligible/);
 const stored=(await db.query('select guest_email_hash from distribution_private.promotion_uses limit 1')).rows[0].guest_email_hash;assert.match(stored,/^[a-f0-9]{64}$/);assert.equal(stored.includes('@'),false);
 assert.equal((await db.query("select has_table_privilege('service_role','distribution_private.promotion_uses','insert') as permitted")).rows[0].permitted,false);
 }finally{await db.close()}
});
