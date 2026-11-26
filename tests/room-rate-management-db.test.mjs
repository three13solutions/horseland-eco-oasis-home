import { test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
const modulePath = process.env.RATE_MANAGEMENT_PGLITE_MODULE;
const options = { skip: !modulePath && 'Set RATE_MANAGEMENT_PGLITE_MODULE to run isolated PostgreSQL saves' };
let db;
const category = '11111111-1111-4111-8111-111111111111';
const type = '22222222-2222-4222-8222-222222222222';
const read = async (query, params = []) => (await db.query(query, params)).rows;
const grid = async () => (await read("select room_rate_management_grid('2026-11-26','2026-11-28') value"))[0].value;
const save = async changes => (await read('select save_room_rate_management($1::jsonb) value', [JSON.stringify(changes)]))[0].value;
before(async () => {
  if (!modulePath) return;
  const { PGlite } = await import(modulePath); db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
    create function auth.uid() returns uuid language sql as $$select '33333333-3333-4333-8333-333333333333'::uuid$$;
    create function is_admin_new() returns boolean language sql as $$select coalesce(current_setting('test.admin',true),'false')='true'$$;
    create table room_categories(id uuid primary key,name text,is_active boolean default true,sort_order integer default 0);
    create table room_types(id uuid primary key,name text,category_id uuid references room_categories(id),pricing_status text default 'legacy');
    create table room_units(id uuid primary key,room_type_id uuid references room_types(id));
    create table tactical_overrides(id uuid primary key);
    create table pricing_day_rules(id integer); create table pricing_preservation_periods(id integer);
    create function is_pricing_weekend(date,integer[],uuid) returns boolean language sql as $$select extract(dow from $1)=6$$;
    create function get_pricing_preservation_policy(uuid,date) returns jsonb language sql as $$select case when $2='2026-12-25' then '{}'::jsonb else null end$$;`);
  const root = new URL('../supabase/migrations/', import.meta.url);
  const initial = readFileSync(new URL('20261025214450_unified_rate_plan_anchors.sql', root),'utf8');
  await db.exec(initial.slice(0,initial.indexOf('alter table public.meal_plan_rules')));
  await db.exec("alter table rate_plan_anchors add column guest_type_charges jsonb not null default '{}'::jsonb; alter table rate_plan_anchors add column modifier_policy text not null default 'all';");
  const linked = readFileSync(new URL('20261120173258_405372e3-36c0-421a-9ab7-eb2252bf6198.sql',root),'utf8');
  await db.exec(linked.slice(linked.indexOf('CREATE OR REPLACE FUNCTION public.sync_guest_type_charge_inputs()'),linked.indexOf('CREATE TRIGGER sync_guest_type_charge_inputs BEFORE INSERT OR UPDATE ON public.guest_composition_rules')));
  for (const file of readdirSync(root).filter(name => /^20261126114/.test(name)).sort()) await db.exec(readFileSync(new URL(file,root),'utf8'));
  await db.exec(`insert into room_categories(id,name) values('${category}','Standard'); insert into room_types(id,name,category_id) values('${type}','Standard','${category}'); insert into room_units values(gen_random_uuid(),'${type}');`);
});
after(async () => { if (db) await db.close(); });
beforeEach(async () => { if (db) { await db.exec("begin; set test.admin='true'"); await db.query(`insert into rate_plan_anchors(name,room_type_id,amount,source_meal_plan_code,start_date,end_date,extra_adult_per_night,extra_child_per_night,is_active,verified_basis,guest_type_charges) values('Existing EP',$1,2500,'RO','2026-11-01','2026-12-01',900,600,true,true,'{"child":{"mode":"fixed","amount":600},"toddler":{"mode":"same_as_adult"}}')`,[type]); } });
afterEach(async () => { if (db) await db.exec('rollback'); });
const patch = entry => ({ type_id:entry.type_id,date:entry.date,fingerprint:entry.fingerprint });
test('save reads back EP while preserving adjacent nights, guest charges and history',options,async()=>{
  const before = await grid(); const result = await save([{...patch(before.entries[1]),ep:3000}]); assert.equal(result.saved,1);
  const after = await grid(); assert.deepEqual(after.entries.map(e=>e.ep),[2500,3000,2500]); assert.deepEqual(after.entries.map(e=>e.adult),[900,900,900]);
  const rows=await read("select guest_type_charges from rate_plan_anchors where is_active and start_date='2026-11-27' and end_date='2026-11-27'");assert.equal(rows[0].guest_type_charges.toddler.mode,'same_as_adult');assert.ok((await read('select count(*) n from rate_plan_anchor_versions'))[0].n>0);
});
test('one batch updates several nights without losing EP meal basis',options,async()=>{
  const before=await grid();await save(before.entries.map(e=>({...patch(e),adult:1100,child:700})));
  const after=await grid();assert.deepEqual(after.entries.map(e=>[e.ep,e.adult,e.child]),[[2500,1100,700],[2500,1100,700],[2500,1100,700]]);
  assert.equal((await read("select count(*) n from rate_plan_anchors where is_active and source_meal_plan_code<>'RO'"))[0].n,0);
});
test('stale mixed batch is rejected atomically',options,async()=>{
  const before=await grid();await db.exec('savepoint rejected');await assert.rejects(save([{...patch(before.entries[0]),ep:3000},{...patch(before.entries[1]),fingerprint:'stale',ep:4000}]),/Rates changed/);await db.exec('rollback to rejected');assert.deepEqual((await grid()).entries.map(e=>e.ep),[2500,2500,2500]);
});
test('admin check rejects non-admin readers and writers',options,async()=>{
  const before=await grid();await db.exec("set test.admin='false';savepoint denied");await assert.rejects(grid(),/Administrator access/);await db.exec('rollback to denied');await assert.rejects(save([{...patch(before.entries[0]),ep:3000}]),/Administrator access/);
});
test('explicit child rates override adult links but adult-only edits preserve those links',options,async()=>{
  await db.exec("update rate_plan_anchors set guest_type_charges='{"+ '"child":{"mode":"same_as_adult"}' +"}'");
  let before=await grid();await save([{...patch(before.entries[0]),adult:1200}]);let next=await grid();assert.equal(next.entries[0].child,1200);
  await save([{...patch(next.entries[0]),child:750}]);next=await grid();assert.equal(next.entries[0].child,750);
});
test('all EP stay tiers remain distinct when their date is edited',options,async()=>{
  await db.query(`insert into rate_plan_anchors(name,room_type_id,amount,source_meal_plan_code,quoted_nights,min_nights,max_nights,start_date,end_date,is_active,verified_basis) values('Two-night EP',$1,4000,'RO',2,2,4,'2026-11-01','2026-12-01',true,true)`,[type]);
  const before=await grid();await save([{...patch(before.entries[0]),ep:3000}]);
  const tier=(await read("select amount,quoted_nights,min_nights,max_nights from rate_plan_anchors where is_active and quoted_nights=2 and start_date='2026-11-26' and end_date='2026-11-26'"))[0];assert.deepEqual({...tier,amount:Number(tier.amount)},{amount:6000,quoted_nights:2,min_nights:2,max_nights:4});
});
test('unit-level rates are never altered by category editing',options,async()=>{
  const unit=(await read('select id from room_units limit 1'))[0].id;
  await db.query("insert into rate_plan_anchors(name,room_unit_id,amount,source_meal_plan_code,start_date,end_date,is_active,verified_basis) values('Unit exception',$1,4500,'RO','2026-11-01','2026-12-01',true,true)",[unit]);
  const before=await grid();await save([{...patch(before.entries[0]),ep:3000}]);assert.equal(Number((await read("select amount from rate_plan_anchors where name='Unit exception'"))[0].amount),4500);
});
test('protected periods reject saves and numeric validation rejects negative prices',options,async()=>{
  const protectedEntry=(await read("select room_rate_management_grid('2026-12-25','2026-12-25') value"))[0].value.entries[0];assert.equal(protectedEntry.editable,false);
  await db.exec('savepoint protected');await assert.rejects(save([{...patch(protectedEntry),ep:3000}]),/Protected/);await db.exec('rollback to protected');
  const before=await grid();await assert.rejects(save([{...patch(before.entries[0]),child:-1}]),/non-negative/);
});