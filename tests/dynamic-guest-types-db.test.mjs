import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const modulePath=process.env.AGE_POLICY_PGLITE_MODULE;
let db;
const migration=readFileSync(new URL('../supabase/migrations/20261120185153_3efe91d0-ebde-4dc7-9251-ca4f9b8968e5.sql',import.meta.url),'utf8');
const id='11111111-1111-4111-8111-111111111111';
const bands=[{key:'infant',min_age:0,max_age:1,accommodation_rule:'free',meal_rule:'free'},{key:'toddler',min_age:2,max_age:3,accommodation_rule:'guest_type',meal_rule:'full'},{key:'child',min_age:4,max_age:9,accommodation_rule:'child',meal_rule:'full'},{key:'adult',min_age:10,max_age:59,accommodation_rule:'adult',meal_rule:'full'},{key:'senior',min_age:60,max_age:null,accommodation_rule:'guest_type',meal_rule:'full'}];
const options={skip:!modulePath&&'Set AGE_POLICY_PGLITE_MODULE to run isolated PostgreSQL tests'};
before(async()=>{
 if(!modulePath)return;
 const {PGlite}=await import(modulePath);db=new PGlite();
 const base=readFileSync(new URL('./combined-pricing-activation.mjs',import.meta.url),'utf8');
 const sql=base.slice(base.indexOf('await db.exec(`')+15,base.indexOf("`.replace(/default(\\d)/g,'default $1')"));
 await db.exec(sql.replace(/default(\d)/g,'default $1'));
 await db.exec(`create role service_role;create schema auth;create function auth.uid() returns uuid language sql as $$select '${id}'::uuid$$;create function auth.role() returns text language sql as $$select 'service_role'::text$$;
 create function public.is_admin_new() returns boolean language sql as $$select true$$;
 alter table rate_plan_anchors add column guest_type_charges jsonb default '{}';
 create table guest_age_policy_versions(revision integer,bands jsonb,updated_at timestamptz default now());
 create table meal_age_pricing_versions(revision integer,rules jsonb);
 create table guest_policy_drafts(band jsonb,status text);
 create table guest_type_pricing_release(id boolean,enabled boolean,frontend_release text);
 insert into guest_type_pricing_release values(true,true,'keyed-guest-v1');
 create function get_guest_age_policy() returns jsonb language sql as $$select jsonb_build_object('revision',revision,'bands',bands,'active',false) from public.guest_age_policy_versions order by revision desc limit 1$$;
 create function get_pricing_preservation_policy(uuid,date) returns jsonb language sql as $$select null::jsonb$$;
 create function preserved_meal_version(jsonb,text,date) returns jsonb language sql as $$select null::jsonb$$;
 create function calculate_legacy_rate_night_context(uuid,date,date,uuid,int,int,int,text,date) returns numeric language sql as $$select 9999$$;
 create function is_pricing_weekend(date,integer[],uuid) returns boolean language sql as $$select false$$;
 create function distribution_website_type_availability(uuid,date,date) returns integer language sql as $$select 10$$;
 create function calculate_website_rate_variants(uuid,date,date,uuid,int,int,int,text) returns jsonb language sql as $$select '[]'::jsonb$$;`);
 await db.query('insert into guest_age_policy_versions(revision,bands) values(4,$1)',[JSON.stringify(bands)]);
 const rules=['RO','BB','HB','FB'].flatMap(plan_code=>bands.map(b=>({plan_code,band_key:b.key,mode:plan_code==='RO'?'free':b.key==='toddler'?'fixed':'full',value:plan_code!=='RO'&&b.key==='toddler'?200:null})));
 await db.query('insert into meal_age_pricing_versions values(1,$1)',[JSON.stringify(rules)]);
 await db.exec(readFileSync(new URL('./fixtures/live-v2-before-weekend.sql',import.meta.url),'utf8'));
 for(const name of ['get_booking_guest_policy','validate_guest_type_counts','guest_type_accommodation_charge','guest_type_meal_charge','calculate_guest_type_rate_variants']){
  const start=migration.indexOf('CREATE FUNCTION public.'+name+'(');const end=migration.indexOf('END $$;',start)+7;assert.ok(start>=0&&end>start);await db.exec(migration.slice(start,end));
 }
 const engineStart=migration.indexOf('DO $$ DECLARE d text;');const engineEnd=migration.indexOf('END $$;',engineStart)+7;
 await db.exec(migration.slice(engineStart,engineEnd));
 await db.exec(`insert into room_types(id,pricing_status) values('${id}','legacy');insert into room_units values(gen_random_uuid(),'${id}',null);
 insert into rate_plan_anchors(id,name,room_type_id,amount,source_meal_plan_code,quoted_nights,included_adults,min_nights,day_type,extra_adult_per_night,extra_child_per_night,extra_infant_per_night,priority,is_active,verified_basis,guest_type_charges) values('${id}','EP Base','${id}',3000,'RO',1,2,1,'all',1000,500,0,1,true,true,'{"toddler":{"mode":"fixed","amount":350},"senior":{"mode":"same_as_adult"}}');
 insert into meal_plan_rules(id,plan_code,plan_name,included_meal_types,is_active,display_order) values('${id}','RO','Room Only','{}',true,1),('22222222-2222-4222-8222-222222222222','FB','Full Board','{}',true,2);
 insert into meal_supplement_versions(meal_plan_id,plan_code,amount,effective_from) values('${id}','RO',0,'2026-01-01'),('22222222-2222-4222-8222-222222222222','FB',1000,'2026-01-01');`);
});
after(async()=>{if(db)await db.close();});
const scalar=async(sql,params=[]) => (await db.query(sql,params)).rows[0]?.value;
test('SQL prices Toddler and Senior by mapped rates, with included Adult allowance used once',options,async()=>{
 const charge=await scalar('select guest_type_accommodation_charge((select to_jsonb(a) from rate_plan_anchors a limit 1),$1) value',[JSON.stringify({adult:3,child:1,infant:1,toddler:2,senior:1})]);
 assert.equal(Number(charge.total),3200);assert.equal(charge.bands.find(b=>b.guest_type_key==='senior').unit_price,1000);
});
test('SQL Same as Adult follows later adult edits and explicit zero remains zero',options,async()=>{
 await db.exec('begin;update rate_plan_anchors set extra_adult_per_night=1500');
 const c=await scalar('select guest_type_accommodation_charge((select to_jsonb(a) from rate_plan_anchors a limit 1),$1) value',[JSON.stringify({adult:2,senior:1,infant:2})]);assert.equal(Number(c.total),1500);assert.equal(c.bands.find(b=>b.guest_type_key==='infant').unit_price,0);await db.exec('rollback');
});
test('SQL meal mapping prices custom fixed rates and keeps EP and infant meals free',options,async()=>{
 const counts=JSON.stringify({adult:2,toddler:2,infant:1,senior:1});
 const meal=await scalar("select guest_type_meal_charge('FB',1000,$1) value",[counts]);assert.equal(Number(meal.total),3400);
 assert.equal(Number((await scalar("select guest_type_meal_charge('RO',0,$1) value",[counts])).total),0);
});
test('SQL rejects unknown keys and stale policy revisions',options,async()=>{
 await assert.rejects(scalar('select validate_guest_type_counts($1,4) value',[JSON.stringify({adult:2,unknown:1})]),/Unknown guest type/);
 await assert.rejects(scalar('select validate_guest_type_counts($1,3) value',[JSON.stringify({adult:2,toddler:1})]),/AGE_POLICY_CHANGED/);
});
test('canonical SQL engine prices a custom guest over two nights without client arithmetic',options,async()=>{
 const variants=await scalar("select calculate_guest_type_rate_variants($1,'2026-12-10','2026-12-12',$2,4) value",[id,JSON.stringify({adult:2,toddler:1,senior:1,infant:1})]);
 const ep=variants.find(v=>v.meal_plan_code==='RO');const ap=variants.find(v=>v.meal_plan_code==='FB');
 assert.equal(Number(ep.room_rate),8700);assert.equal(Number(ep.meal_cost),0);assert.equal(Number(ap.meal_cost),6400);assert.equal(Number(ap.total_price),15100);assert.equal(ap.actual_guest_count,5);assert.equal(ap.guest_counts.senior,1);
});
test('unmapped nonzero custom quantities are rejected instead of priced free',options,async()=>{
 await db.exec("begin;update rate_plan_anchors set guest_type_charges='{}'");
 await assert.rejects(scalar('select guest_type_accommodation_charge((select to_jsonb(a) from rate_plan_anchors a limit 1),$1) value',[JSON.stringify({adult:2,toddler:1})]),/GUEST_TYPE_RATE_NOT_CONFIGURED/);await db.exec('rollback');
});
