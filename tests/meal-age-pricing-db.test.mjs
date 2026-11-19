// Isolated PostgreSQL integration using synthetic rate data; not a full Supabase upgrade.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const modulePath=process.env.AGE_POLICY_PGLITE_MODULE;
const migration=readFileSync(new URL('../supabase/migrations/20261119081136_meal_age_pricing_policy_dormant.sql',import.meta.url),'utf8');
const activation=readFileSync(new URL('../scripts/activate-guest-age-meal-pricing.sql',import.meta.url),'utf8');
// Compare the old age-only pricing stage to the complete active meal engine.
const ageOnlyPatch=activation.slice(activation.indexOf('do $patch$'),activation.indexOf('end $patch$;')+'end $patch$;'.length);
const definitions=JSON.parse(readFileSync(new URL('./fixtures/age-policy-pricing-pre-migration.json',import.meta.url),'utf8'));
test('meal-age migration defaults preserve existing prices; configured percentages/fixed/free and safety guards work',{skip:!modulePath&&'Set AGE_POLICY_PGLITE_MODULE to run PostgreSQL integration'},async()=>{
 const {PGlite}=await import(modulePath);const db=new PGlite();try{
 await db.exec(`create role anon; create role authenticated; create role service_role;
 create schema auth;create schema meal_pricing_private;create table meal_pricing_private.state(id boolean primary key,revision bigint);insert into meal_pricing_private.state values(true,1);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create function public.is_admin_new() returns boolean language sql stable as $$select nullif(current_setting('test.admin',true),'')::boolean$$;
 create function public.record_activity_log() returns trigger language plpgsql as $$begin return coalesce(new,old);end$$;
 create function public.prevent_audit_log_changes() returns trigger language plpgsql as $$begin raise exception 'Immutable';end$$;
 create table public.rate_plan_anchors(id uuid,name text,room_type_id uuid,room_unit_id uuid,room_category_id uuid,is_active boolean,verified_basis boolean,start_date date,end_date date,min_nights integer,max_nights integer,included_adults integer,day_type text,priority integer,updated_at timestamptz,amount numeric,quoted_nights integer,source_meal_plan_code text,los_min_nights integer,los_adjustment_type text,los_adjustment_value numeric,extra_adult_per_night numeric,extra_child_per_night numeric,extra_infant_per_night numeric,modifier_policy text,source_override_id uuid);
 create table public.room_types(id uuid,category_id uuid,pricing_status text);
 create table public.room_units(id uuid,room_type_id uuid,category_id uuid);
 create table public.meal_plan_rules(id uuid,plan_code text,plan_name text,description text,is_active boolean,display_order integer,included_meal_types jsonb,is_featured boolean);
 create table public.meal_supplement_versions(id uuid,meal_plan_id uuid,plan_code text,effective_from date,recorded_at timestamptz,amount numeric);
 create table public.cancellation_policy_rules(policy_code text,policy_name text,cancellation_terms text,adjustment_type text,adjustment_value numeric,is_active boolean,display_order integer,is_featured boolean);
 create function public.get_pricing_preservation_policy(uuid,date) returns jsonb language sql stable as $$select case when $2='2026-12-25' then '{"id":"preserved-fixture","preservation_mode":"ep_only","preserve_legacy_ep":true}'::jsonb else null end$$;
 create function public.is_pricing_weekend(date,integer[],uuid) returns boolean language sql stable as $$select extract(dow from $1)=6$$;
 set check_function_bodies=off;`);
 for(const {definition} of definitions) await db.exec(definition);
 await db.exec(readFileSync(new URL('../supabase/migrations/20261119081127_dynamic_guest_age_policy_dormant.sql',import.meta.url),'utf8'));
 await db.exec(ageOnlyPatch);
 await db.exec('set check_function_bodies=on');
 const scalar=async(sql,params=[]) => (await db.query(sql,params)).rows[0].value;
 // Synthetic rates, not production data. Exercise the real patched canonical function.
 await db.exec(`
 insert into room_types values('11111111-1111-4111-8111-111111111111',null,'ready');
 insert into room_units values('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111',null);
 insert into meal_plan_rules select ('00000000-0000-4000-8000-00000000000'||n)::uuid,code,code,'',true,n,'[]',false from (values(1,'RO'),(2,'BB'),(3,'HB'),(4,'FB')) x(n,code);
 insert into meal_supplement_versions select id,id,plan_code,'2026-01-01',now(),case plan_code when 'RO' then 0 when 'BB' then 270 when 'HB' then 920 else 1510 end from meal_plan_rules;
 insert into cancellation_policy_rules values('standard','standard','','percentage',0,true,1,false);
 insert into rate_plan_anchors(id,name,room_type_id,is_active,verified_basis,start_date,end_date,min_nights,included_adults,day_type,priority,updated_at,amount,quoted_nights,source_meal_plan_code,extra_adult_per_night,extra_child_per_night,extra_infant_per_night,modifier_policy)
 values('33333333-3333-4333-8333-333333333333','fixture','11111111-1111-4111-8111-111111111111',true,true,'2026-01-01','2026-12-24',1,2,'weekday',1,now(),2500,1,'RO',1000,600,999,'none'),
 ('44444444-4444-4444-8444-444444444444','fixture Saturday','11111111-1111-4111-8111-111111111111',true,true,'2026-01-01','2026-12-24',1,2,'weekend',1,now(),3500,1,'RO',1500,900,999,'none');
 -- The legacy source is isolated here; assert actual legacy patch patterns separately.
 create or replace function public.calculate_legacy_rate_night_context(p_room_type_id uuid,p_check_in date,p_check_out date,p_room_unit_id uuid,p_adults_count integer,p_children_count integer,p_infants_count integer,p_booking_channel text,p_pricing_date date) returns numeric language sql stable as $$select 5000+public.guest_policy_charge_count('child',p_adults_count,p_children_count,p_infants_count)*600$$;
 `);
 const quote=async(date,adults,children,infants,out=null)=>scalar("select calculate_rate_variants_v2('11111111-1111-4111-8111-111111111111',$1::date,coalesce($5::date,$1::date+1),null,$2,$3,$4,'direct') as value",[date,adults,children,infants,out]);

 await db.exec("update cancellation_policy_rules set adjustment_value=-5;update meal_supplement_versions set amount=270.005 where plan_code='BB'");
 const cases=[['2026-11-22',2,1,1,null],['2026-11-21',2,2,2,null],['2026-12-25',2,1,1,null],['2026-12-24',1,1,2,'2026-12-26']];
 const before=[];for(const args of cases)before.push(await quote(...args));
 // Restore exact pre-activation functions so the complete release script validates
 // its real deployment preconditions, before re-installing the isolated fallback.
 await db.exec('set check_function_bodies=off');
 for(const {definition} of definitions) await db.exec(definition);
 await db.exec(migration);
 await db.exec("set horseland.guest_age_meal_release='frontend-ready'");
 await db.exec(activation);
 await db.exec('set check_function_bodies=on');
 await db.exec(`create or replace function public.calculate_legacy_rate_night_context(p_room_type_id uuid,p_check_in date,p_check_out date,p_room_unit_id uuid,p_adults_count integer,p_children_count integer,p_infants_count integer,p_booking_channel text,p_pricing_date date) returns numeric language sql stable as $$select 5000+public.guest_policy_charge_count('child',p_adults_count,p_children_count,p_infants_count)*600$$;`);
 const monetary=rows=>rows.map(v=>[v.meal_plan_code,v.room_rate,v.meal_cost,v.policy_adjustment,v.total_price,v.price_per_night]);
 for(let i=0;i<cases.length;i++) {
   const after=await quote(...cases[i]);assert.deepEqual(monetary(after),monetary(before[i]));
   assert.notEqual(after[0].quote_fingerprint,before[i][0].quote_fingerprint);
   assert.equal(after[0].meal_age_pricing_policy.revision,1);
 }
 await db.exec("update meal_supplement_versions set amount=270.01 where plan_code='BB'");
 const policy=await scalar('select get_meal_age_pricing_policy() as value');assert.equal(policy.rules.length,12);
 assert.equal(policy.rules.find(r=>r.plan_code==='FB'&&r.band_key==='child').mode,'full');
 const save=async(rules,rev=1)=>scalar('select save_meal_age_pricing_policy($1,$2::jsonb,1,1) as value',[rev,JSON.stringify(rules)]);
 await assert.rejects(save(policy.rules),/Administrator/);
 await db.exec("set test.uid='11111111-1111-4111-8111-111111111111'");await assert.rejects(save(policy.rules),/Administrator/);
 await db.exec("set test.admin='true'");
 const changed=policy.rules.map(r=>r.band_key==='child'&&r.plan_code==='BB'?{...r,mode:'percentage',value:50}:r.band_key==='child'&&r.plan_code==='HB'?{...r,mode:'fixed',value:123.45}:r.band_key==='child'&&r.plan_code==='FB'?{...r,mode:'free',value:null}:r.band_key==='infant'&&r.plan_code==='BB'?{...r,mode:'fixed',value:100}:r);
 await assert.rejects(scalar('select save_meal_age_pricing_policy(1,$1::jsonb,1,99) as value',[JSON.stringify(changed)]),/MEAL_CATALOGUE_CHANGED/);
 await assert.rejects(scalar('select save_meal_age_pricing_policy(1,$1::jsonb,99,1) as value',[JSON.stringify(changed)]),/GUEST_AGE_POLICY_CHANGED/);
 assert.equal((await save(changed)).revision,2);
 await assert.rejects(save(changed),/MEAL_AGE_POLICY_CHANGED/);
 for(const rule of [{plan_code:'BB',band_key:'adult',mode:'fixed',value:1},{plan_code:'RO',band_key:'child',mode:'full',value:null},{plan_code:'BB',band_key:'child',mode:'percentage',value:101},{plan_code:'BB',band_key:'child',mode:'fixed',value:1.111},{plan_code:'BB',band_key:'child',mode:'fixed',value:-1}]) {
   const bad=policy.rules.map(r=>r.plan_code===rule.plan_code&&r.band_key===rule.band_key?rule:r);
   await assert.rejects(save(bad,2),/Invalid meal age pricing/);
 }
 const charge=async(plan,rate,a=2,c=1,i=1)=>scalar('select calculate_meal_age_charge($1,$2,$3,$4,$5) as value',[plan,rate,a,c,i]);
 const bb=await charge('BB',270.01);assert.equal(bb.total,675.03);assert.equal(bb.bands.find(x=>x.band_key==='child').unit_price,135.01);assert.equal(bb.bands.find(x=>x.band_key==='infant').unit_price,0);assert.equal(bb.bands.find(x=>x.band_key==='infant').global_free_override,true);
 assert.equal((await charge('BB',300)).total,750);assert.equal((await charge('HB',920)).total,1963.45);assert.equal((await charge('FB',1510)).total,3020);assert.equal((await charge('RO',9999)).total,0);
 for(const date of ['2026-11-22','2026-11-21','2026-12-25']) {
   const rows=await quote(date,2,1,1);assert.equal(rows.find(v=>v.meal_plan_code==='BB').meal_cost,675.03);
   assert.equal(rows.find(v=>v.meal_plan_code==='HB').meal_cost,1963.45);assert.equal(rows.find(v=>v.meal_plan_code==='FB').meal_cost,3020);
   const night=rows.find(v=>v.meal_plan_code==='BB').nightly_breakdown[0];assert.equal(night.meal_age_pricing.meal_age_policy_revision,2);assert.equal(night.meal_age_pricing.adult_plan_rate,270.01);
 }
 const mixed=await quote('2026-12-24',2,1,1,'2026-12-26');assert.equal(mixed.find(v=>v.meal_plan_code==='BB').meal_cost,1350.06);
 await db.exec("update meal_supplement_versions set amount=300 where plan_code='BB'");
 assert.equal((await quote('2026-11-22',2,1,1)).find(v=>v.meal_plan_code==='BB').meal_cost,750);
 // A configured child discount cannot silently apply to an opaque inclusive fallback rate.
 await assert.rejects(scalar("select assert_legacy_meal_age_supported('BB',2,1,0) as value"),/MEAL_AGE_BASIS_UNVERIFIED/);
 await scalar("select assert_legacy_meal_age_supported('BB',2,0,1) as value");
 await scalar("select assert_legacy_meal_age_supported('RO',2,1,1) as value");
 const opaque=await quote('2026-12-24',2,1,1,'2026-12-27');assert.deepEqual(opaque.map(x=>x.meal_plan_code),['RO']);
 const globalAge=await scalar('select get_guest_age_policy() as value');
 await scalar('select save_guest_age_policy($1,$2::jsonb) as value',[globalAge.revision,JSON.stringify(globalAge.bands.map(b=>b.key==='child'?{...b,meal_rule:'free'}:b))]);
 await assert.rejects(scalar("select assert_legacy_meal_age_supported('BB',2,1,0) as value"),/MEAL_AGE_BASIS_UNVERIFIED/);
 assert.equal((await charge('BB',300)).total,600); // global free overrides even a saved child percentage
 assert.equal((await scalar('select get_meal_age_pricing_policy() as value')).revision,2);
 await assert.rejects(db.exec('delete from meal_age_pricing_versions where revision=1'),/Immutable/);
 assert.equal(await scalar("select has_function_privilege('anon','save_meal_age_pricing_policy(integer,jsonb,integer,bigint)','execute') as value"),false);
 assert.equal(await scalar("select has_table_privilege('authenticated','meal_age_pricing_versions','INSERT') as value"),false);
 await db.exec('set role anon');assert.equal((await scalar('select get_meal_age_pricing_policy() as value')).revision,2);await assert.rejects(db.exec('select updated_by from meal_age_pricing_versions'),/permission denied/);
 }finally{await db.close()}
});
