import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {PGlite}=await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const plan=JSON.parse(readFileSync(new URL('../docs/ep-rollout-staged.json',import.meta.url)));
const db=new PGlite();
await db.exec(`create role anon; create role authenticated; create table room_types(id uuid primary key,category_id uuid,pricing_status text); create table room_units(id uuid,room_type_id uuid,category_id uuid);
create table rate_plan_anchors(id uuid primary key default gen_random_uuid(),name text,room_type_id uuid,room_unit_id uuid,room_category_id uuid,amount numeric,source_meal_plan_code text,quoted_nights int default1,included_adults int default2,start_date date,end_date date,min_nights int default1,max_nights int,day_type text,extra_adult_per_night numeric,extra_child_per_night numeric,extra_infant_per_night numeric default0,priority int default200,is_active bool default true,verified_basis bool default true,updated_at timestamptz default now(),los_min_nights int,los_adjustment_type text,los_adjustment_value numeric,source_override_id uuid,modifier_policy text default 'none');
create table meal_supplement_versions(id uuid default gen_random_uuid(),meal_plan_id uuid,plan_code text,amount numeric,effective_from date,recorded_at timestamptz default now());
create table meal_plan_rules(id uuid default gen_random_uuid(),plan_code text,plan_name text,description text,included_meal_types text[],is_active bool default true,display_order int,is_featured bool default false);
create table cancellation_policy_rules(policy_code text,policy_name text,cancellation_terms text,is_active bool default true,display_order int,adjustment_type text,adjustment_value numeric,is_featured bool default false);
insert into cancellation_policy_rules values('base','Base','',true,1,'fixed',0,false);
create function calculate_rate_variants_legacy_20261025(uuid,date,date,uuid,int,int,int,text) returns jsonb language sql as $$select '[{"total_price":99999}]'::jsonb$$;
create function apply_accommodation_modifiers(uuid,uuid,date,text,numeric,numeric,numeric) returns jsonb language sql as $$select '{}'::jsonb$$;`.replace(/default(\d)/g,'default $1'));
let source=readFileSync(new URL('./fixtures/live-v2-before-weekend.sql',import.meta.url),'utf8');
// Same production expression replacement used by weekend migration, activated in this isolated test only.
source=source.replace('extract(dow from v_date) in (0,5,6)','extract(dow from v_date) = 6');
await db.exec(source);
for(const [code,amount] of Object.entries({RO:0,BB:270,HB:920,FB:1510})){
 const id=(await db.query('insert into meal_plan_rules(plan_code,plan_name,display_order) values($1,$1,1) returning id',[code])).rows[0].id;
 await db.query("insert into meal_supplement_versions(meal_plan_id,plan_code,amount,effective_from) values($1,$2,$3,'2026-11-17')",[id,code,amount]);
}
for(const room of plan.rooms){
 await db.query("insert into room_types values($1,null,'legacy')",[room.id]);
 await db.query('insert into room_units values(gen_random_uuid(),$1,null)',[room.id]);
 for(const [start,end] of [[plan.proposed_effective_from,'2026-12-23'],['2027-01-02',plan.last_stay_night]]) for(const day of ['weekday','weekend']){
 await db.query('insert into rate_plan_anchors(name,room_type_id,amount,source_meal_plan_code,start_date,end_date,day_type,extra_adult_per_night,extra_child_per_night) values($1,$2,$3,\'RO\',$4,$5,$6,$7,$8)',[room.name,room.id,room[day],start,end,day,room[day+'_adult'],room[day+'_child']]);
 }
}
let checks=0;
async function quote(room,start,end,adults=2,children=0,infants=0){return (await db.query('select calculate_rate_variants_v2($1,$2,$3,null,$4,$5,$6,\'direct\') q',[room.id,start,end,adults,children,infants])).rows[0].q;}
for(const room of plan.rooms){
 for(const [date,kind] of [['2026-11-20','weekday'],['2026-11-21','weekend'],['2026-11-22','weekday']]){
  const next=new Date(date+'T00:00:00Z');next.setUTCDate(next.getUTCDate()+1);
  const rows=await quote(room,date,next.toISOString().slice(0,10));
  assert.equal(rows.find(x=>x.meal_plan_code==='RO').total_price,room[kind]);checks++;
  assert.equal(rows.find(x=>x.meal_plan_code==='FB').total_price,room[kind]+3020);checks++;
 }
 let rows=await quote(room,'2026-11-20','2026-11-23');assert.equal(rows.find(x=>x.meal_plan_code==='RO').total_price,2*room.weekday+room.weekend);checks++;
 rows=await quote(room,'2026-11-20','2026-11-21',3,1,1);assert.equal(rows.find(x=>x.meal_plan_code==='FB').total_price,room.weekday+room.weekday_adult+room.weekday_child+5*1510);checks++;
}
assert.equal((await db.query('select count(*)::int n from rate_plan_anchors')).rows[0].n,16);checks++;
assert.equal((await db.query("select count(*)::int n from rate_plan_anchors where start_date<='2027-01-01' and end_date>='2026-12-24'")).rows[0].n,0);checks++;
// Document existing whole-stay legacy fallback when even one occupied night lacks an anchor.
const mixed=await quote(plan.rooms[0],'2026-12-23','2026-12-25');assert.equal(mixed[0].pricing_status,'legacy_basis_unverified');assert.equal(mixed[0].total_price,99999);checks++;
await db.exec(`create function is_admin_new() returns boolean language sql as $$select true$$;
create function record_activity_log() returns trigger language plpgsql as $$begin return new; end$$;
create table pricing_day_rules(revision bigint,published_at timestamptz,effective_from date,effective_to date,weekend_days int[]);
insert into pricing_day_rules values(1,now(),'2026-11-17',null,array[6]);
create function is_pricing_weekend(date,integer[]) returns boolean language sql as $$select extract(dow from $1)=6$$;
create table tactical_overrides(id uuid default gen_random_uuid(),is_active bool default true,start_date date,end_date date,override_price numeric,occupancy_type text,day_type text,min_nights int,max_nights int,min_adults int,max_adults int,room_unit_id uuid,room_type_id uuid,room_category_id uuid,created_at timestamptz default now(),adjustment_value numeric);
create function rate_override_disabled(uuid) returns boolean language sql as $$select false$$;
create function calculate_dynamic_price_legacy_20261025(uuid,uuid,date,int,int,int,text) returns table(final_price numeric) language sql as $$select 9000::numeric$$;`);
await db.exec(readFileSync(new URL('../scripts/pricing-migrations/20261117115203_mixed_night_rate_fallback.sql',import.meta.url),'utf8'));
await db.query("insert into tactical_overrides(start_date,end_date,override_price,room_type_id,min_nights,occupancy_type) values('2026-12-24','2027-01-01',8888,$1,1,'double'),('2026-12-24','2027-01-01',7777,$1,2,'double')",[plan.rooms[0].id]);
const fixed=await quote(plan.rooms[0],'2026-12-23','2026-12-25');
assert.equal(fixed.find(x=>x.meal_plan_code==='RO').total_price,9777);checks++;
assert.equal(fixed.find(x=>x.meal_plan_code==='FB').total_price,12797);checks++;
assert.equal(fixed[0].pricing_status,'legacy_basis_unverified');assert.equal(fixed[0].pricing_mode,'mixed_verified_and_legacy');checks++;
assert.equal(fixed[0].nightly_breakdown[1].legacy_inclusive_amount,7777);checks++;
assert.equal(fixed[0].nightly_breakdown[1].promo_eligible_ep,false);checks++;
assert.equal(fixed[0].nightly_breakdown[1].room_only,undefined);checks++;
assert.equal(fixed[0].nightly_breakdown[0].source_plan,'RO');checks++;
assert.ok(fixed[0].quote_fingerprint);checks++;
const backwards=await quote(plan.rooms[0],'2027-01-01','2027-01-03');
assert.equal(backwards.find(x=>x.meal_plan_code==='RO').total_price,7777+3500);checks++;
assert.equal((await quote(plan.rooms[0],'2026-12-24','2026-12-26'))[0].total_price,99999);checks++;
await db.exec("update cancellation_policy_rules set adjustment_type='percentage',adjustment_value=-10");
const discounted=await quote(plan.rooms[0],'2026-12-23','2026-12-25');assert.equal(discounted.find(x=>x.meal_plan_code==='RO').total_price,8799.3);checks++;
await db.exec("update cancellation_policy_rules set adjustment_type='fixed',adjustment_value=0");
await db.query("insert into pricing_preservation_periods(name,room_type_id,start_date,end_date,source_meal_rate,fb_constraint_rate,source_snapshot,is_active) values('Test festive policy',$1,'2026-12-24','2027-01-01',1000,1000,'{}',true)",[plan.rooms[0].id]);
const protectedMixed=await quote(plan.rooms[0],'2026-12-23','2026-12-25');
assert.equal(protectedMixed.find(x=>x.meal_plan_code==='RO').total_price,9777);checks++;
assert.equal(protectedMixed.find(x=>x.meal_plan_code==='FB').total_price,9777+6040);checks++;
assert.equal(protectedMixed[0].pricing_status,'verified');checks++;
assert.equal(protectedMixed[0].nightly_breakdown[1].pricing_status,'preserved_policy_ep');checks++;
assert.equal(protectedMixed[0].nightly_breakdown[1].promo_eligible_ep,false);checks++;
assert.ok(protectedMixed[0].nightly_breakdown[1].preservation_policy_id);checks++;
assert.equal((await db.query("select is_pricing_weekend('2026-12-27',array[0,6]) w")).rows[0].w,true);checks++;
assert.equal((await db.query("select is_pricing_weekend('2027-01-03',array[0,6]) w")).rows[0].w,false);checks++;
// Anchor-backed preservation pins old source conversion while new meal charges increase.
await db.query("insert into pricing_preservation_periods(name,room_type_id,start_date,end_date,source_meal_rate,fb_constraint_rate,source_snapshot,is_active) values('Anchor festive policy',$1,'2026-12-24','2027-01-01',1000,1000,'{}',true)",[plan.rooms[2].id]);
await db.query("insert into rate_plan_anchors(name,room_type_id,amount,source_meal_plan_code,start_date,end_date,day_type,extra_adult_per_night,extra_child_per_night) values('OldFB',$1,6000,'FB','2026-12-24','2027-01-01','all',1500,800)",[plan.rooms[2].id]);
const protectedAnchor=await quote(plan.rooms[2],'2026-12-24','2026-12-25');
assert.equal(protectedAnchor.find(x=>x.meal_plan_code==='RO').total_price,4000);checks++;
assert.equal(protectedAnchor.find(x=>x.meal_plan_code==='FB').total_price,7020);checks++;
assert.equal(protectedAnchor[0].nightly_breakdown[0].source_meal_rate,1000);checks++;
// Execute actual live dynamic modifier body, not a stub: lead-time, channels and FB limits.
await db.exec(`create table seasons(id uuid,is_active bool);create table season_periods(season_id uuid,year int,start_month int,end_month int,start_day int,end_day int);
create table occupancy_yield_rules(id uuid,rule_name text,is_active bool,occupancy_threshold int,applies_to text,room_type_id uuid,season_id uuid,priority int,price_adjustment_type text,price_adjustment numeric);
create table lead_time_rules(id uuid default gen_random_uuid(),rule_name text,is_active bool,days_before_checkin_min int,days_before_checkin_max int,applies_to text,room_type_id uuid,season_id uuid,priority int,price_adjustment_type text,price_adjustment numeric);
create table channel_rules(id uuid default gen_random_uuid(),channel_name text,is_active bool,channel_id uuid,applies_to text,room_type_id uuid,season_id uuid,adjustment_type text,adjustment_value numeric);
create table pricing_constraints(id uuid default gen_random_uuid(),is_active bool,room_unit_id uuid,room_type_id uuid,floor_price numeric,ceiling_price numeric);
create function resolve_distribution_channel_id(text) returns uuid language sql as $$select '00000000-0000-0000-0000-000000000001'::uuid$$;
insert into lead_time_rules(rule_name,is_active,days_before_checkin_min,days_before_checkin_max,applies_to,priority,price_adjustment_type,price_adjustment) values('Early bird',true,-9999,9999,'all',1,'percentage',-10);
insert into channel_rules(channel_name,is_active,channel_id,applies_to,adjustment_type,adjustment_value) values('Direct',true,'00000000-0000-0000-0000-000000000001','all','percentage',-5);`);
await db.exec(readFileSync(new URL('./fixtures/live-accommodation-modifiers.sql',import.meta.url),'utf8'));
await db.query("update rate_plan_anchors set modifier_policy='accommodation_dynamic' where name='OldFB'");
let dynamic=await quote(plan.rooms[2],'2026-12-24','2026-12-25');
assert.equal(dynamic.find(x=>x.meal_plan_code==='RO').total_price,3420);checks++;
assert.equal(dynamic.find(x=>x.meal_plan_code==='FB').total_price,6440);checks++;
// Updated lead-time remains dynamic rather than flattened festive tariff.
await db.exec("update lead_time_rules set price_adjustment=-20");
dynamic=await quote(plan.rooms[2],'2026-12-24','2026-12-25');assert.equal(dynamic.find(x=>x.meal_plan_code==='RO').total_price,3040);checks++;
await db.query("insert into pricing_constraints(is_active,room_type_id,floor_price) values(true,$1,5500)",[plan.rooms[2].id]);
dynamic=await quote(plan.rooms[2],'2026-12-24','2026-12-25');assert.equal(dynamic.find(x=>x.meal_plan_code==='RO').total_price,3500);checks++;
// With extra adult + child, old accommodation charges persist, meals apply to all five including infant.
await db.exec('delete from pricing_constraints;update lead_time_rules set price_adjustment=-10');
dynamic=await quote(plan.rooms[2],'2026-12-24','2026-12-25',3,1,1);
assert.equal(dynamic.find(x=>x.meal_plan_code==='RO').total_price,(3600+1500+800)*.95);checks++;
assert.equal(dynamic.find(x=>x.meal_plan_code==='FB').total_price,(3600+1500+800)*.95+5*1510);checks++;
// Validate exact activation fragment against isolated schema; clock guard is retained in production.
await db.exec(`alter table room_types add column name text;
delete from rate_plan_anchors; delete from pricing_preservation_periods;
update meal_supplement_versions set amount=1000 where plan_code='FB';
create function save_pricing_day_rule(date,date,integer[],bigint) returns void language plpgsql as $$begin insert into pricing_day_rules(revision,effective_from,effective_to,weekend_days) values($4+1,$1,$2,$3);end$$;`);
for(const room of plan.rooms) await db.query('update room_types set name=$2 where id=$1',[room.id,room.name]);
let activation=readFileSync(new URL('../scripts/activate-approved-ep-policy.sql',import.meta.url),'utf8');
activation=activation.replace("(now() at time zone 'Asia/Kolkata')::date <> date '2026-11-17'", "false /* isolated test clock */");
await db.exec(activation);
assert.equal((await db.query('select count(*)::int n from rate_plan_anchors')).rows[0].n,16);checks++;
assert.equal((await db.query('select count(*)::int n from pricing_preservation_periods where is_active')).rows[0].n,4);checks++;
assert.equal((await db.query('select weekend_days from pricing_day_rules order by revision desc limit 1')).rows[0].weekend_days.join(','),'6');checks++;
await assert.rejects(()=>db.exec(activation),/already present/);checks++;
console.log(`${checks} staged EP/canonical checks passed: mixed LOS, preserved festive legacy EP/anchor EP, new meals, day boundary.`);
await db.close();
