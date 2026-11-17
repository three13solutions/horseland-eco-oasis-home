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

const mealRoot=process.env.MEAL_WORKTREE || '.';
await db.exec(`create role service_role;create schema auth;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table admin_profiles(user_id uuid primary key);
create function is_admin() returns bool language sql stable as $$select exists(select 1 from admin_profiles where user_id=auth.uid())$$;
create function is_admin_new() returns bool language sql stable as $$select is_admin()$$;
create function record_activity_log() returns trigger language plpgsql as $$begin return new;end$$;
alter table room_types add column name text,add column base_price numeric default 4000;
alter table meal_plan_rules alter column included_meal_types type jsonb using to_jsonb(included_meal_types);
alter table meal_plan_rules add column preferred_variant text default 'veg',add column supplement_per_person_inr numeric,add column supplement_effective_from date default '2026-01-01',add column supplement_period text default 'per_night',add column supplement_guest_basis text default 'all_guests',add column supplement_pricing_enabled bool default true,add column updated_at timestamptz default now();
alter table meal_supplement_versions add column period text,add column guest_basis text;
create table meals(id uuid primary key default gen_random_uuid(),title text,meal_type text,variant text,price numeric,is_active bool default true,updated_at timestamptz default now());
create function record_meal_supplement_version() returns trigger language plpgsql as $$begin if TG_OP='INSERT' or new.supplement_per_person_inr is distinct from old.supplement_per_person_inr or new.supplement_effective_from is distinct from old.supplement_effective_from then insert into public.meal_supplement_versions(meal_plan_id,plan_code,amount,effective_from,period,guest_basis) values(new.id,new.plan_code,new.supplement_per_person_inr,new.supplement_effective_from,new.supplement_period,new.supplement_guest_basis);end if;return new;end$$;
create trigger version after insert or update on meal_plan_rules for each row execute function record_meal_supplement_version();
insert into meals(title,meal_type,variant,price) select kind,kind,variant,amount from (values('breakfast',270),('lunch',500),('dinner',650),('high_tea',90)) q(kind,amount) cross join (values('veg'),('non_veg'),('jain')) v(variant);
insert into meal_plan_rules(plan_code,plan_name,included_meal_types,supplement_per_person_inr) values('RO','Room Only','[]',0),('BB','Breakfast','["breakfast"]',150),('HB','Half Board','["breakfast","dinner"]',550),('FB','Full Board','["breakfast","lunch","dinner"]',1000);
create table tactical_overrides(id uuid default gen_random_uuid(),is_active bool default true,start_date date,end_date date,override_price numeric,occupancy_type text,day_type text,min_nights int,max_nights int,min_adults int,max_adults int,room_unit_id uuid,room_type_id uuid,room_category_id uuid,created_at timestamptz default now(),adjustment_value numeric,adjustment_type text,reason text);
create function rate_override_disabled(uuid) returns boolean language sql as $$select false$$;
create table seasons(id uuid,is_active bool);create table season_periods(season_id uuid,year int,start_month int,end_month int,start_day int,end_day int);
create table day_types(id uuid,slug text,is_active bool);create table holidays(date date);create table seasonal_pricing(room_type_id uuid,season_id uuid,day_type_id uuid,price numeric);
create table guest_composition_rules(is_active bool,room_type_id uuid,base_guests_count int,extra_adult_charge numeric,extra_child_charge numeric);
create table occupancy_yield_rules(id uuid,rule_name text,is_active bool,occupancy_threshold int,applies_to text,room_type_id uuid,season_id uuid,priority int,price_adjustment_type text,price_adjustment numeric);
create table lead_time_rules(id uuid default gen_random_uuid(),rule_name text,is_active bool,days_before_checkin_min int,days_before_checkin_max int,applies_to text,room_type_id uuid,season_id uuid,priority int,price_adjustment_type text,price_adjustment numeric);
create table channel_rules(id uuid default gen_random_uuid(),channel_name text,is_active bool,channel_id uuid,applies_to text,room_type_id uuid,season_id uuid,adjustment_type text,adjustment_value numeric);
create table pricing_constraints(id uuid default gen_random_uuid(),is_active bool,room_unit_id uuid,room_type_id uuid,floor_price numeric,ceiling_price numeric);
create table distribution_channels(id uuid,code text);
insert into distribution_channels values('00000000-0000-0000-0000-000000000001','website');
insert into lead_time_rules(rule_name,is_active,days_before_checkin_min,days_before_checkin_max,applies_to,priority,price_adjustment_type,price_adjustment) values('Early bird',true,-9999,9999,'all',1,'percentage',-10);
insert into channel_rules(channel_name,is_active,channel_id,applies_to,adjustment_type,adjustment_value) values('Direct',true,'00000000-0000-0000-0000-000000000001','all','percentage',-5);
`);
const fixture=name=>readFileSync(new URL('./fixtures/'+name,import.meta.url),'utf8');
for(const f of ['live-resolve_distribution_channel_id.sql','live-get_base_price_for_date.sql','live-calculate_dynamic_price_legacy_20261025.sql','live-accommodation-modifiers.sql','live-v2-before-weekend.sql','live-legacy-before-mixed.sql']) await db.exec(fixture(f));
// Live wrapper body is unnecessary for canonical quotes, but preserve its exact patchable weekend expression.
await db.exec(`create function calculate_rate_variants(uuid,date,date,uuid,int,int,int,text) returns jsonb language plpgsql as $$declare v_day_of_week int;begin if v_day_of_week IN (0, 5, 6) then null;end if; return '[]'::jsonb;end$$;`);
for(const room of plan.rooms){await db.query("insert into room_types(id,pricing_status,name) values($1,'legacy',$2)",[room.id,room.name]);await db.query('insert into room_units values(gen_random_uuid(),$1,null)',[room.id]);}
// Existing Deluxe FB anchor uses actual dynamic modifier; Basement/Standard have legacy fallback.
await db.query("insert into rate_plan_anchors(name,room_type_id,amount,source_meal_plan_code,start_date,end_date,day_type,extra_adult_per_night,extra_child_per_night,priority,modifier_policy) values('OldFB',$1,6000,'FB','2026-01-01',null,'all',1500,800,0,'accommodation_dynamic')",[plan.rooms[2].id]);
const quote=async(room,start,end,a=2,c=0,i=0)=>(await db.query("select calculate_rate_variants_v2($1,$2,$3,null,$4,$5,$6,'direct') q",[room.id,start,end,a,c,i])).rows[0].q;

// Private real-data snapshots are supplied externally; never commit their contents.
const readSnapshot=path=>JSON.parse(readFileSync(path,'utf8'));
const data={...readSnapshot('/tmp/pre-rollout-20261117.json')[0].backup,...readSnapshot('/tmp/additional-pricing-20261117.json')[0].backup,...readSnapshot('/tmp/horseland-remaining-real.json')};
await db.exec(`drop trigger version on meal_plan_rules;create table rate_plan_managed_overrides(override_id uuid,enabled bool);
create or replace function rate_override_disabled(p_id uuid) returns bool language sql stable as $$select exists(select 1 from rate_plan_managed_overrides where override_id=p_id and not enabled)$$;`);
for(const table of ['meals','meal_plan_rules','meal_supplement_versions','rate_plan_anchors','room_units','room_types','seasons','season_periods','seasonal_pricing','tactical_overrides','pricing_constraints','rate_plan_managed_overrides','guest_composition_rules','lead_time_rules','occupancy_yield_rules','channel_rules','distribution_channels','day_types','holidays','cancellation_policy_rules']){
 await db.exec(`delete from ${table}`);
 const allowed=(await db.query("select column_name from information_schema.columns where table_schema='public' and table_name=$1",[table])).rows.map(x=>x.column_name);
 for(const row of data[table]||[]){const cols=Object.keys(row).filter(k=>allowed.includes(k));await db.query(`insert into ${table}(${cols.join(',')}) select ${cols.join(',')} from jsonb_populate_record(null::${table},$1::jsonb)`,[JSON.stringify(row)]);}
}
await db.exec(`create trigger version after insert or update on meal_plan_rules for each row execute function record_meal_supplement_version();`);
const expected=readSnapshot('/workspace/scratch/27c70578a884/artifacts/horseland-db-preflight/festive-quotes-before.json').filter(x=>x.plan==='RO');
const snapshots=[];let checks=0;
for(const c of expected){const room=plan.rooms.find(r=>r.name===c.name);const q=(await quote(room,c.from,c.to,c.adults,c.children,c.infants)).find(v=>v.meal_plan_code===c.plan&&v.cancellation_policy_code===c.policy);assert.equal(q.total_price,c.total,JSON.stringify(c));snapshots.push({c,room});checks++;}
const outside=[];
for(const room of data.room_types) for(const [from,to] of [['2026-11-13','2026-11-16'],['2027-04-02','2027-04-05'],...(!plan.rooms.some(r=>r.id===room.id)?[['2026-11-20','2026-11-23']]:[])]) for(const [a,c,i] of [[2,0,0],[3,1,1]]){
 const values=(await quote(room,from,to,a,c,i)).map(v=>({plan:v.meal_plan_code,policy:v.cancellation_policy_code,total:v.total_price}));outside.push({room,from,to,a,c,i,values});
}
await db.exec(readFileSync(mealRoot+'/scripts/pricing-migrations/20261117113432_shared_meal_pricing.sql','utf8'));
await db.exec(readFileSync(mealRoot+'/scripts/pricing-migrations/20261117115741_activate_shared_meal_pricing.sql','utf8'));
for(const name of ['20261117113505_effective_weekend_rules.sql','20261117115203_mixed_night_rate_fallback.sql','20261117121711_preserve_out_of_scope_pricing.sql']) await db.exec(readFileSync(new URL('../scripts/pricing-migrations/'+name,import.meta.url),'utf8'));
let activation=readFileSync(new URL('../scripts/activate-approved-ep-policy.sql',import.meta.url),'utf8').replace("(now() at time zone 'Asia/Kolkata')::date <> date '2026-11-17'","false");
await db.exec('begin');await db.exec(activation);await db.exec(readFileSync(new URL('../scripts/activate-out-of-scope-preservation.sql',import.meta.url),'utf8'));await db.exec('select meal_pricing_private.activate_live()');
for(const {c,room} of snapshots){const q=(await quote(room,c.from,c.to,c.adults,c.children,c.infants)).find(v=>v.meal_plan_code===c.plan&&v.cancellation_policy_code===c.policy);assert.equal(q.total_price,c.total,JSON.stringify({case:c,newtotal:q.total_price}));checks++;}
for(const x of outside){assert.deepEqual((await quote(x.room,x.from,x.to,x.a,x.c,x.i)).map(v=>({plan:v.meal_plan_code,policy:v.cancellation_policy_code,total:v.total_price})),x.values,JSON.stringify(x));checks++;}
await db.exec('commit');console.log(`${checks} actual-data festive EP before/after comparisons passed.`);await db.close();
