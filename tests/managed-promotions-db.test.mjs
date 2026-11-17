// Isolated PostgreSQL migration validation, not a complete Supabase upgrade test.
// Install @electric-sql/pglite@0.3.14 in a temporary directory, then run:
// PROMO_PGLITE_MODULE=/tmp/horseland-age-dbtest/node_modules/@electric-sql/pglite/dist/index.js node --test tests/managed-promotions-db.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const modulePath=process.env.PROMO_PGLITE_MODULE;
test('isolated PostgreSQL promotion migration, authorization, preservation and revisions',{skip:(!modulePath||!existsSync(modulePath))&&'Set PROMO_PGLITE_MODULE to an installed PGlite module'},async()=>{
 const {PGlite}=await import(modulePath);const db=new PGlite();
 try{
 await db.exec(`create role anon; create role authenticated; create role service_role;
 create schema auth;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create function public.is_admin_new() returns boolean language sql stable as $$select nullif(current_setting('test.admin',true),'')::boolean$$;
 create function public.is_pricing_weekend(date,integer[],uuid) returns boolean language sql stable as $$select extract(dow from $1)=6$$;
 create table public.room_categories(id uuid primary key);insert into room_categories values('22222222-2222-4222-8222-222222222222');
 create table public.website_promo_rollout(id boolean primary key,enabled boolean);insert into website_promo_rollout values(true,true);
 create table public.website_promotions(code text primary key,label text not null,amount_per_night numeric not null,amount_per_booking numeric not null,is_active boolean not null,revision integer not null default 1,updated_at timestamptz not null default now(),updated_by uuid,
 constraint website_promotions_discount_policy_check check((code='EP300' and amount_per_night=300 and amount_per_booking=0) or(code='DIRECT1000' and amount_per_night=0 and amount_per_booking=1000)));
 insert into website_promotions(code,label,amount_per_night,amount_per_booking,is_active)values('EP300','EP offer',300,0,true),('DIRECT1000','Direct offer',0,1000,true);
 create table audit_fixture(code text);
 create function record_activity_log() returns trigger language plpgsql as $$begin insert into public.audit_fixture values(new.code);return new;end$$;
 create trigger zz_activity_log after insert or update on website_promotions for each row execute function record_activity_log();
 alter table website_promotions enable row level security;`);
 const before=(await db.query('select code,label,amount_per_night,amount_per_booking,is_active,revision,updated_at from website_promotions order by code')).rows;
 await db.exec(readFileSync(new URL('../supabase/migrations/20261118000200_managed_website_promotions.sql',import.meta.url),'utf8'));
 await db.exec(readFileSync(new URL('../supabase/migrations/20261118000300_promotion_booking_restrictions.sql',import.meta.url),'utf8'));
 assert.deepEqual((await db.query('select code,label,amount_per_night,amount_per_booking,is_active,revision,updated_at from website_promotions order by code')).rows,before);
 const config={code:'TEST100',label:'Test only',discount_kind:'fixed',discount_basis:'booking',discount_value:100,day_scope:'both',mixed_stay_mode:null,is_active:false,is_public:false,booking_from:null,booking_to:null,stay_from:null,stay_to:null};
 const save=(c=config,revision=null)=>db.query('select save_managed_website_promotion($1::jsonb,$2::integer) as value',[JSON.stringify(c),revision]);
 await assert.rejects(save(),/Administrator required/);
 await db.exec(`set test.uid='00000000-0000-0000-0000-000000000001';`);
 await assert.rejects(save(),/Administrator required/); // null admin result
 await assert.rejects(db.query('select website_promotion_settings()'),/Administrator required/);
 await db.exec(`set test.admin='false';`);await assert.rejects(save(),/Administrator required/);
 await db.exec(`set test.admin='true';`);
 const made=(await save()).rows[0].value;assert.equal(made.code,'TEST100');assert.equal(made.is_active,false);assert.equal(made.is_public,false);
 const edited=(await save({...config,is_active:true},made.revision)).rows[0].value;assert.equal(edited.revision,made.revision+1);assert.equal(edited.is_active,true);
 await assert.rejects(save(config,made.revision),/Promotion changed/);
 for(const change of [{day_scope:'weekend'},{day_scope:'weekend',mixed_stay_mode:'eligible_nights'},{discount_kind:'percentage',discount_value:101},{discount_value:null},{booking_from:'2026-11-22',booking_to:'2026-11-20'}])await assert.rejects(save({...config,...change},edited.revision));
 const legacy=(await db.query("select * from website_promotions where code='DIRECT1000'")).rows[0];
 const preserved=(await save({...legacy,amount_per_booking:99999,discount_value:99999,discount_kind:'percentage',discount_basis:'night'},legacy.revision)).rows[0].value;
 assert.equal(preserved.amount_per_booking,1000);assert.equal(preserved.discount_kind,'legacy');assert.equal(preserved.discount_value,null);
 const days=(await db.query("select website_promotion_eligible_dates('00000000-0000-0000-0000-000000000001','2026-11-20','2026-11-23','weekend') as days")).rows[0].days;
 assert.deepEqual(days,['2026-11-21']);
 assert.ok((await db.query("select count(*)::integer as n from audit_fixture")).rows[0].n>=3);
 const grants=(await db.query("select has_function_privilege('anon','save_managed_website_promotion(jsonb,integer)','execute') as anonymous_write,has_function_privilege('authenticated','website_promotion_eligible_dates(uuid,date,date,text)','execute') as client_calendar")).rows[0];
 assert.equal(grants.anonymous_write,false);assert.equal(grants.client_calendar,false);
 const restrictions={eligible_room_category_ids:['22222222-2222-4222-8222-222222222222'],eligible_meal_plan_codes:['FB'],min_stay_nights:2,excluded_stay_dates:['2026-12-25'],mixed_stay_mode:'all_nights'};
 const restricted=(await save({...config,...restrictions},edited.revision)).rows[0].value;
 assert.deepEqual(restricted.eligible_room_category_ids,restrictions.eligible_room_category_ids);assert.deepEqual(restricted.eligible_meal_plan_codes,['FB']);assert.equal(restricted.min_stay_nights,2);assert.deepEqual(restricted.excluded_stay_dates,['2026-12-25']);
 for(const change of [{eligible_room_category_ids:[]},{eligible_room_category_ids:['33333333-3333-4333-8333-333333333333']},{eligible_meal_plan_codes:['AP']},{eligible_meal_plan_codes:[]},{min_stay_nights:1.5},{min_stay_nights:0},{excluded_stay_dates:['2026-02-30']},{excluded_stay_dates:['2026-12-25'],mixed_stay_mode:null}]) await assert.rejects(save({...config,...restrictions,...change},restricted.revision));
 // Older clients omitting restriction fields preserve them rather than clearing them.
 const retained=(await save({...config,mixed_stay_mode:'all_nights'},restricted.revision)).rows[0].value;
 assert.deepEqual(retained.eligible_room_category_ids,restrictions.eligible_room_category_ids);assert.equal(retained.min_stay_nights,2);
 const cleared=(await save({...config,eligible_room_category_ids:null,eligible_meal_plan_codes:null,min_stay_nights:null,excluded_stay_dates:[]},retained.revision)).rows[0].value;
 assert.equal(cleared.eligible_room_category_ids,null);assert.equal(cleared.min_stay_nights,null);assert.deepEqual(cleared.excluded_stay_dates,[]);
 assert.equal((await db.query("select has_function_privilege('authenticated','save_managed_website_promotion_pre_restrictions(jsonb,integer)','execute') as value")).rows[0].value,false);

 // Execute the real 002 -> 003 -> 004 wrapper chain, not only standalone stubs.
 await db.exec(`create schema distribution_private;create table distribution_private.payment_intents(request_id uuid primary key,intent jsonb,state text,created_at timestamptz default now());`);
 await db.exec(readFileSync(new URL('../supabase/migrations/20261118000400_promo_usage_caps.sql',import.meta.url),'utf8'));
 const capped=(await save({...config,total_usage_limit:10,per_guest_usage_limit:1},cleared.revision)).rows[0].value;
 assert.equal(capped.total_usage_limit,10);assert.equal(capped.per_guest_usage_limit,1);
 const capRetained=(await save(config,capped.revision)).rows[0].value;
 assert.equal(capRetained.total_usage_limit,10);assert.equal(capRetained.per_guest_usage_limit,1);
 for(const change of [{total_usage_limit:0},{per_guest_usage_limit:-1},{per_guest_usage_limit:1.5}])await assert.rejects(save({...config,...change},capRetained.revision));
 const capClear=(await save({...config,total_usage_limit:null,per_guest_usage_limit:null},capRetained.revision)).rows[0].value;
 assert.equal(capClear.total_usage_limit,null);assert.equal(capClear.per_guest_usage_limit,null);
 assert.equal((await db.query("select has_function_privilege('authenticated','save_managed_website_promotion_pre_caps(jsonb,integer)','execute') as value")).rows[0].value,false);

 }finally{await db.close()}
});
