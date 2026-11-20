import { test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const modulePath=process.env.AGE_POLICY_PGLITE_MODULE;
const bands=[{key:'infant',min_age:0,max_age:3,accommodation_rule:'free',meal_rule:'free'},{key:'child',min_age:4,max_age:9,accommodation_rule:'child',meal_rule:'full'},{key:'adult',min_age:10,max_age:null,accommodation_rule:'adult',meal_rule:'full'}];
let db;
const sql=async(query,params=[]) => (await db.query(query,params)).rows[0]?.value;
before(async()=>{
 if(!modulePath)return;
 const {PGlite}=await import(modulePath);db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create function public.is_admin_new() returns boolean language sql as $$select coalesce(nullif(current_setting('test.admin',true),''),'false')::boolean$$;
 create function public.guest_age_meal_pricing_active() returns boolean language sql as $$select false$$;
 create function record_activity_log() returns trigger language plpgsql as $$begin return coalesce(new,old);end$$;
 create table guest_age_policy_versions(revision integer primary key,bands jsonb,updated_at timestamptz default now(),updated_by uuid);
 grant select on guest_age_policy_versions to authenticated;
 create function get_guest_age_policy() returns jsonb language sql as $$select jsonb_build_object('revision',revision,'bands',bands,'active',false,'updated_at',updated_at) from public.guest_age_policy_versions order by revision desc limit 1$$;
 create table rate_plan_anchors(id integer primary key,extra_adult_per_night numeric,extra_child_per_night numeric,extra_infant_per_night numeric);
 create table guest_composition_rules(id integer primary key,extra_adult_charge numeric,extra_child_charge numeric,extra_infant_charge numeric);
 create table tactical_overrides(id uuid primary key,created_at timestamptz default now(),occupancy_type text,is_active boolean,room_category_id uuid,room_type_id uuid,room_unit_id uuid,start_date date,end_date date,day_type text,min_nights integer,max_nights integer,meal_plan_code text,adjustment_type text,adjustment_value numeric);
 set check_function_bodies=off;
 create function save_meal_age_pricing_policy(p_expected_revision integer,p_rules jsonb,p_expected_guest_age_revision integer,p_expected_meal_workspace_revision bigint) returns jsonb language plpgsql as $$begin
 perform 1 from guest_pricing_private.release_state where id and active for share;
 if not found then raise exception 'GUEST_PRICING_NOT_ACTIVE: age and meal pricing are staged; publish and activate the matching booking frontend before editing'; end if;
 return p_rules;end$$;`);
 await db.query('insert into guest_age_policy_versions(revision,bands) values(1,$1)',[JSON.stringify(bands)]);
 for(const file of ['20261120173258_405372e3-36c0-421a-9ab7-eb2252bf6198.sql','20261120173535_e31c57c3-8c2a-4b25-9a75-a491f6cc05be.sql','20261120174609_1de4fedf-4125-46e8-9900-316ebed22d9e.sql','20261120174853_f07f3b33-b4d0-4664-a328-06e69abdcdd4.sql','20261120175306_245ac7e3-be68-46d8-8957-368276eb3672.sql','20261120175550_cb17fc8c-da47-4a31-950a-9c2a2c975917.sql','20261120180650_5628f0b1-f434-4430-b1d9-3008346ddb70.sql','20261120180908_e99c518b-3e88-4b83-a9a2-8c97af90bb5a.sql','20261120181107_945623dc-91d7-4ba8-bb25-fa5660154d1b.sql','20261120182349_096b3f18-670c-4576-b6dd-99b5ec84bf9d.sql']) await db.exec(readFileSync(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
 await db.exec('set check_function_bodies=on');
});
after(async()=>{if(db)await db.close();});
beforeEach(async()=>{if(db)await db.exec("begin;select set_config('test.uid','11111111-1111-4111-8111-111111111111',true);select set_config('test.admin','true',true)");});
afterEach(async()=>{if(db)await db.exec('rollback');});
const options={skip:!modulePath && 'Set AGE_POLICY_PGLITE_MODULE to run isolated PostgreSQL tests'};

test('database blocks deactivation without an alternate policy',options,async()=>{
 await assert.rejects(db.query('select set_guest_type_policy_status(1,$1,false)',[JSON.stringify(bands[1])]),/NO_ALTERNATE_POLICY/);
});
test('deactivation atomically activates the alternate and rejects stale writes',options,async()=>{
 const updated=bands.map(b=>b.key==='child'?{...b,meal_rule:'free'}:b);
 await sql('select save_guest_age_policy(1,$1) value',[JSON.stringify(updated)]);
 const result=await sql('select set_guest_type_policy_status(2,$1,false) value',[JSON.stringify(updated[1])]);
 assert.equal(result.revision,3);assert.equal(result.bands.find(b=>b.key==='child').meal_rule,'full');
 assert.equal(result.bands.filter(b=>b.key==='child'&&b.enabled!==false).length,1);
 await assert.rejects(db.query('select set_guest_type_policy_status(2,$1,true)',[JSON.stringify(updated[1])]),/AGE_POLICY_CHANGED/);
});
test('database accepts typed adult segments but rejects overlapping active ranges',options,async()=>{
 const next=[...bands.slice(0,2),{...bands[2],max_age:59},{key:'senior',name:'Senior',min_age:60,max_age:null,accommodation_rule:'guest_type',meal_rule:'full'}];
 assert.equal(await sql('select validate_guest_age_bands($1) value',[JSON.stringify(next)]),true);
 assert.equal(await sql('select validate_guest_age_bands($1) value',[JSON.stringify([...bands,next[3]])]),false);
 const result=await sql('select save_guest_age_policy(1,$1) value',[JSON.stringify(next)]);
 assert.equal(result.active,false);assert.equal(result.bands.length,4);
 const rules=['RO','BB','HB','FB'].flatMap(plan_code=>next.map(b=>({plan_code,band_key:b.key,mode:plan_code==='RO'?'free':'full',value:null})));
 assert.equal(await sql('select validate_meal_age_pricing_rules($1) value',[JSON.stringify(rules)]),true);
});
test('non-admins cannot save or change guest policy status',options,async()=>{
 await db.exec("select set_config('test.admin','false',true)");
 await assert.rejects(db.query('select save_guest_age_policy(1,$1)',[JSON.stringify(bands)]),/Administrator required/);
});
test('full policy save cannot bypass the alternate-policy safeguard',options,async()=>{
 await assert.rejects(db.query('select save_guest_age_policy(1,$1)',[JSON.stringify(bands.map(b=>b.key==='child'?{...b,enabled:false}:b))]),/alternate policy/);
});
test('both accommodation tables keep Same as Adult linked after adult edits',options,async()=>{
 for(const [table,adult,child,infant] of [['rate_plan_anchors','extra_adult_per_night','extra_child_per_night','extra_infant_per_night'],['guest_composition_rules','extra_adult_charge','extra_child_charge','extra_infant_charge']]){
  await db.query(`insert into ${table}(id,${adult},${child},${infant},guest_type_charges) values(1,1000,600,0,$1)`,[JSON.stringify({child:{mode:'same_as_adult'},senior:{mode:'fixed',amount:450}})]);
  assert.equal(Number(await sql(`select ${child} value from ${table} where id=1`)),1000);
  await db.exec(`update ${table} set ${adult}=1500 where id=1`);
  assert.equal(Number(await sql(`select ${child} value from ${table} where id=1`)),1500);
  assert.equal(Number(await sql(`select ${infant} value from ${table} where id=1`)),0);
 }
});
test('legacy override child rate follows only its matching adult rate',options,async()=>{
 await db.exec(`insert into tactical_overrides(id,occupancy_type,is_active,start_date,end_date,day_type,min_nights,meal_plan_code,adjustment_value) values('11111111-1111-4111-8111-111111111111','extra_adult',true,'2026-12-01','2026-12-02','weekday',1,'all_meals_inclusive',1000);
 insert into tactical_overrides(id,occupancy_type,is_active,start_date,end_date,day_type,min_nights,meal_plan_code,adjustment_value,guest_charge_mode) values('22222222-2222-4222-8222-222222222222','extra_child',true,'2026-12-01','2026-12-02','weekday',1,'all_meals_inclusive',600,'same_as_adult');`);
 assert.equal(Number(await sql("select adjustment_value value from tactical_overrides where occupancy_type='extra_child'")),1000);
 await db.exec("update tactical_overrides set adjustment_value=1500 where occupancy_type='extra_adult'");
 assert.equal(Number(await sql("select adjustment_value value from tactical_overrides where occupancy_type='extra_child'")),1500);
});
test('a conflicting draft saves without changing the authoritative revision',options,async()=>{
 const d=await sql('select save_guest_policy_draft($1) value',[JSON.stringify({...bands[1],min_age:2})]);
 assert.equal(d.status,'draft');
 assert.equal(await sql('select max(revision) value from guest_age_policy_versions'),1);
 assert.equal((await sql('select list_guest_policy_drafts() value')).length,1);
});
test('saving Infant 0–1 activates the matching Child 2–9 draft in one revision',options,async()=>{
 await db.exec('create or replace function guest_age_meal_pricing_active() returns boolean language sql as $$select true$$');
 await sql('select save_guest_policy_draft($1) value',[JSON.stringify({...bands[1],min_age:2})]);
 const infant={...bands[0],max_age:1};
 const plan=await sql('select apply_guest_policy_with_drafts(1,$1,false) value',[JSON.stringify(infant)]);
 assert.equal(plan.drafts.length,1);
 assert.equal(await sql('select max(revision) value from guest_age_policy_versions'),1);
 const result=await sql('select apply_guest_policy_with_drafts(1,$1,true,$2) value',[JSON.stringify(infant),JSON.stringify(plan)]);
 assert.equal(result.revision,2);
 assert.equal(result.bands.find(b=>b.key==='infant').max_age,1);
 assert.equal(result.bands.find(b=>b.key==='child').min_age,2);
 assert.equal((await sql('select list_guest_policy_drafts() value')).length,0);
 assert.equal(await sql('select count(*)::int value from guest_age_policy_versions'),2);
});
test('missing draft or overlapping draft cannot activate an uncovered policy',options,async()=>{
 await sql('select save_guest_policy_draft($1) value',[JSON.stringify({...bands[1],min_age:1})]);
 await assert.rejects(db.query('select apply_guest_policy_with_drafts(1,$1,false)',[JSON.stringify({...bands[0],max_age:1})]),/No compatible draft/);
});
test('ambiguous matching drafts are not silently selected',options,async()=>{
 for(const meal_rule of ['full','free']) await sql('select save_guest_policy_draft($1) value',[JSON.stringify({...bands[1],min_age:2,meal_rule})]);
 await assert.rejects(db.query('select apply_guest_policy_with_drafts(1,$1,false)',[JSON.stringify({...bands[0],max_age:1})]),/More than one draft/);
});
test('stale draft preview cannot change policies or consume drafts',options,async()=>{
 const draft=await sql('select save_guest_policy_draft($1) value',[JSON.stringify({...bands[1],min_age:2})]);
 const infant={...bands[0],max_age:1};
 const plan=await sql('select apply_guest_policy_with_drafts(1,$1,false) value',[JSON.stringify(infant)]);
 await sql('select save_guest_policy_draft($1,$2,$3) value',[JSON.stringify({...draft.band,meal_rule:'free'}),draft.id,draft.updated_at]);
 await db.exec('savepoint activation');
 await assert.rejects(db.query('select apply_guest_policy_with_drafts(1,$1,true,$2)',[JSON.stringify(infant),JSON.stringify(plan)]),/DRAFT_CHANGED/);
 await db.exec('rollback to activation');
 assert.equal(await sql('select max(revision) value from guest_age_policy_versions'),1);
 assert.equal((await sql('select list_guest_policy_drafts() value')).length,1);
});
test('custom upper-age drafts cannot bypass the live pricing release guard',options,async()=>{
 await db.exec('create or replace function guest_age_meal_pricing_active() returns boolean language sql as $$select true$$');
 await sql('select save_guest_policy_draft($1) value',[JSON.stringify({key:'senior',min_age:61,max_age:null,accommodation_rule:'guest_type',meal_rule:'full'})]);
 await assert.rejects(db.query('select apply_guest_policy_with_drafts(1,$1,false)',[JSON.stringify({...bands[2],max_age:60})]),/activation needs matching booking/);
});
test('draft actions reject non-administrators',options,async()=>{
 await db.exec("select set_config('test.admin','false',true)");
 await assert.rejects(db.query('select save_guest_policy_draft($1)',[JSON.stringify(bands[1])]),/Administrator required/);
});
test('draft deletion leaves active age coverage and revision unchanged',options,async()=>{
 const d=await sql('select save_guest_policy_draft($1) value',[JSON.stringify({...bands[1],min_age:2})]);
 await db.query('select delete_guest_policy(1,$1,$2,$3)',[JSON.stringify(d.band),d.id,d.updated_at]);
 assert.equal((await sql('select list_guest_policy_drafts() value')).length,0);
 assert.equal(await sql('select max(revision) value from guest_age_policy_versions'),1);
 assert.equal(await sql('select guest_policy_complete(bands) value from guest_age_policy_versions where revision=1'),true);
});
test('active policy cannot be deleted',options,async()=>{
 await assert.rejects(db.query('select delete_guest_policy(1,$1)',[JSON.stringify(bands[1])]),/Active policies cannot be deleted/);
});
test('deleted historical policies retain history but cannot reactivate',options,async()=>{
 const next=bands.map(b=>b.key==='child'?{...b,meal_rule:'free'}:b);
 await sql('select save_guest_age_policy(1,$1) value',[JSON.stringify(next)]);
 await db.query('select delete_guest_policy(2,$1)',[JSON.stringify(bands[1])]);
 assert.equal((await sql('select deleted_guest_policies() value')).length,1);
 assert.equal(await sql('select count(*)::int value from guest_age_policy_versions'),2);
 await assert.rejects(db.query('select save_guest_age_policy(2,$1)',[JSON.stringify(bands)]),/policy was deleted/);
});
test('different guest keys cannot use case-insensitive duplicate names in drafts',options,async()=>{
 await assert.rejects(db.query('select save_guest_policy_draft($1)',[JSON.stringify({key:'junior',name:' CHILD ',min_age:4,max_age:9,meal_rule:'full',accommodation_rule:'guest_type'})]),/already uses this name/);
});
test('activation cannot assign two guest types the same normalized name',options,async()=>{
 const next=bands.map(b=>b.key==='child'?{...b,name:' ADULT '}:b);
 await assert.rejects(db.query('select save_guest_age_policy(1,$1)',[JSON.stringify(next)]),/already uses this name|cannot use the same name/);
});
test('completed-year ranges have no gaps at 3–4 or 9–10',options,async()=>{
 assert.equal(await sql('select guest_policy_complete($1) value',[JSON.stringify(bands)]),true);
 assert.equal(await sql('select guest_policy_complete($1) value',[JSON.stringify(bands.map(b=>b.key==='child'?{...b,min_age:5}:b))]),false);
});