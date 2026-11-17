// Isolated PostgreSQL tests, not proof that a complete Supabase database upgrade passes.
// Install @electric-sql/pglite@0.3.14 in a temporary directory, then run:
// AGE_POLICY_PGLITE_MODULE=/tmp/age-db/node_modules/@electric-sql/pglite/dist/index.js node --test tests/guest-age-policy-db.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const modulePath=process.env.AGE_POLICY_PGLITE_MODULE;
const migration=readFileSync(new URL('../supabase/migrations/20261117163903_dynamic_guest_age_policy.sql',import.meta.url),'utf8');
// Read-only pg_get_functiondef capture from Horseland before the change; no guest data.
const definitions=JSON.parse(readFileSync(new URL('./fixtures/age-policy-pricing-pre-migration.json',import.meta.url),'utf8'));

test('migration patches all six observed live pricing definitions without implicit infant charges',()=>{
 assert.equal(definitions.length,6);
 for(const {proname,definition} of definitions) {
  if(proname==='calculate_rate_variants_v2') {
   for(const pattern of ['v_all_guests int:=p_adults_count+p_children_count+p_infants_count;','v_target_rate*v_all_guests','+p_children_count*coalesce(v_anchor.extra_child_per_night,0)+p_infants_count*v_anchor.extra_infant_per_night','return v_result;']) assert.ok(definition.includes(pattern),`${proname} ${pattern}`);
  } else assert.ok(definition.includes('v_extra_children := p_children_count;')||definition.includes('v_extra_children integer:=p_children_count;'),proname);
 }
 assert.match(migration,/not coalesce\(public.is_admin_new\(\),false\)/);
 assert.match(migration,/pg_advisory_xact_lock/);
 assert.match(migration,/enable row level security/);
 assert.doesNotMatch(migration,/update public\.(bookings|payments)|delete from public\.(bookings|payments)/i);
});

test('isolated Postgres executes policy schema, guarded patches, revision and authorization checks',{skip:!modulePath && 'Set AGE_POLICY_PGLITE_MODULE to run isolated PostgreSQL validation'},async()=>{
 const {PGlite}=await import(modulePath);
 const db=new PGlite();
 try {
 await db.exec(`create role anon; create role authenticated; create role service_role;
 create schema auth;
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
 await db.exec(migration);
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
 for(const [date,base,childRate] of [['2026-11-22',2500,600],['2026-11-21',3500,900],['2026-12-25',5000,600]]) {
   const baseline=await quote(date,2,0,0), free=await quote(date,2,0,2), child=await quote(date,2,1,2);
   for(const code of ['RO','BB','HB','FB']) {
    const b=baseline.find(x=>x.meal_plan_code===code), f=free.find(x=>x.meal_plan_code===code), c=child.find(x=>x.meal_plan_code===code);
    const meal={RO:0,BB:270,HB:920,FB:1510}[code];
    assert.equal(f.room_rate,base);assert.equal(f.meal_cost,meal*2);assert.equal(f.total_price,b.total_price);
    assert.equal(c.room_rate,base+childRate);assert.equal(c.meal_cost,meal*3);
    assert.equal(f.actual_guest_count,4);assert.equal(f.chargeable_meal_guests,2);
   }
 }
 const mixed=(await quote('2026-12-24',2,0,1,'2026-12-26')).find(x=>x.meal_plan_code==='FB');
 assert.equal(mixed.room_rate,7500);assert.equal(mixed.meal_cost,6040);assert.equal(mixed.actual_guest_count,3);
 const single=(await quote('2026-11-22',1,0,1)).find(x=>x.meal_plan_code==='FB');
 assert.equal(single.room_rate,2500);assert.equal(single.meal_cost,1510);

 const policy=await scalar('select get_guest_age_policy() as value');
 assert.equal(policy.revision,1);
 assert.deepEqual(policy.bands.map(b=>[b.min_age,b.max_age]),[[0,3],[4,9],[10,null]]);
 for(const [a,c,i,child,meal] of [[2,0,1,0,2],[2,1,1,1,3],[1,0,3,0,1]]) {
  assert.equal(await scalar("select guest_policy_charge_count('child',$1,$2,$3) as value",[a,c,i]),child);
  assert.equal(await scalar("select guest_policy_charge_count('meal',$1,$2,$3) as value",[a,c,i]),meal);
 }
 for(const bad of [[],[...policy.bands,policy.bands[0]],policy.bands.map(b=>b.key==='child'?{...b,min_age:3}:b),policy.bands.map(b=>b.key==='child'?{...b,min_age:5}:b),policy.bands.map(b=>b.key==='infant'?{...b,min_age:-1}:b),policy.bands.map(b=>b.key==='adult'?{...b,max_age:99}:b),policy.bands.map(b=>b.key==='child'?{...b,meal_rule:'half'}:b)]) {
  assert.equal(await scalar('select validate_guest_age_bands($1::jsonb) as value',[JSON.stringify(bad)]),false);
 }
 await assert.rejects(db.query('select save_guest_age_policy(1,$1::jsonb)',[JSON.stringify(policy.bands)]),/Administrator/);
 await db.exec("select set_config('test.uid','11111111-1111-4111-8111-111111111111',false)");
 // NULL is_admin_new must not authorize.
 await assert.rejects(db.query('select save_guest_age_policy(1,$1::jsonb)',[JSON.stringify(policy.bands)]),/Administrator/);
 await db.exec("select set_config('test.admin','true',false)");
 const revised=policy.bands.map(b=>b.key==='infant'?{...b,max_age:4}:b.key==='child'?{...b,min_age:5,meal_rule:'free'}:b);
 const updated=await scalar('select save_guest_age_policy(1,$1::jsonb) as value',[JSON.stringify(revised)]);
 assert.equal(updated.revision,2);
 assert.equal(await scalar("select guest_policy_charge_count('meal',2,1,3) as value"),2);
 assert.equal(await scalar('select count(*)::int as value from guest_age_policy_versions'),2);
 await assert.rejects(db.query('select save_guest_age_policy(1,$1::jsonb)',[JSON.stringify(revised)]),/AGE_POLICY_CHANGED/);
 await assert.rejects(db.exec('update guest_age_policy_versions set revision=3 where revision=1'),/Immutable/);
 await assert.rejects(db.exec('delete from guest_age_policy_versions where revision=1'),/Immutable/);
 const original={quote_fingerprint:'old',total_price:1234};
 const quoted=await scalar('select attach_guest_age_policy($1::jsonb,2,1,3) as value',[JSON.stringify([original])]);
 assert.equal(quoted[0].actual_guest_count,6);assert.equal(quoted[0].infants_count,3);assert.equal(quoted[0].chargeable_meal_guests,2);
 assert.equal(quoted[0].total_price,1234);assert.notEqual(quoted[0].quote_fingerprint,'old');assert.equal(quoted[0].guest_age_policy.revision,2);
 // Canonical patched SQL includes normal AND preserved-EP branches; headcount guard unchanged.
 const patched=await scalar("select pg_get_functiondef('public.calculate_rate_variants_v2(uuid,date,date,uuid,integer,integer,integer,text)'::regprocedure) as value");
 assert.doesNotMatch(patched,/v_target_rate\*v_all_guests|p_infants_count\*v_anchor.extra_infant_per_night/);
 assert.match(patched,/v_total_meal:=v_total_meal\+v_target_rate\*v_meal_guests/);
 assert.match(patched,/v_all_guests>100/);
 assert.equal((patched.match(/return public.attach_guest_age_policy/g)||[]).length,2);
 // New public table is read-only and no unauthenticated save endpoint is exposed.
 assert.equal(await scalar("select has_function_privilege('anon','public.save_guest_age_policy(integer,jsonb)','execute') as value"),false);
 assert.equal(await scalar("select has_table_privilege('authenticated','public.guest_age_policy_versions','INSERT') as value"),false);
 await db.exec('set role anon');
 assert.equal(await scalar('select get_guest_age_policy()->>\'revision\' as value'),'2');
 await assert.rejects(db.exec('select updated_by from guest_age_policy_versions'),/permission denied/);
 } finally { await db.close(); }
});
