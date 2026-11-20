import { PGlite } from '@electric-sql/pglite'
import fs from 'node:fs/promises'
const db = new PGlite()
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $fn$
  SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$fn$;
CREATE FUNCTION public.is_admin_new() RETURNS boolean LANGUAGE sql STABLE AS $fn$
  SELECT auth.uid() = '73c3ddaa-034a-4621-9bfb-b940bbc30395'::uuid
$fn$;
CREATE TABLE public.meals(id uuid PRIMARY KEY, price numeric, is_active boolean);
INSERT INTO public.meals VALUES ('23c807e0-f881-4fe6-abfd-0a98506c8cda',270,true),('23c807e0-f881-4fe6-abfd-0a98506c8cdb',650,true),('23c807e0-f881-4fe6-abfd-0a98506c8cdc',650,true);
INSERT INTO public.meals
SELECT ('43c807e0-f881-4fe6-abfd-'||lpad(i::text,12,'0'))::uuid,
       CASE WHEN i<=9 THEN 90 ELSE 2500 END, i<=9
FROM generate_series(1,12) i;
CREATE FUNCTION public.get_guest_age_policy() RETURNS jsonb LANGUAGE sql STABLE AS $fn$
SELECT '{"revision":1,"bands":[{"key":"adult","meal_rule":"full"},{"key":"child","meal_rule":"full","min_age":4,"max_age":9},{"key":"infant","meal_rule":"free","min_age":0,"max_age":3},{"key":"inactive_guest","meal_rule":"full","enabled":false}]}'::jsonb
$fn$;
`)
const mi = await fs.readFile('supabase/migrations/20261120223001_meal_catalog_guest_pricing.sql','utf8')
const sql = await fs.readFile('supabase/tests/meal_catalog_guest_pricing.sql','utf8')
await db.exec(`BEGIN; ${mi} COMMIT;`)
const eligibility = await fs.readFile('supabase/migrations/20261120223428_meal_catalog_adult_only.sql','utf8')
await db.exec(`BEGIN; ${eligibility} COMMIT;`)
let misses=0
const trydeny = async (role, uid, sql) => {
  await db.exec(`set role ${role}; set request.jwt.claim.sub='${uid}';`)
  try { await db.exec(sql); misses++ } catch (e) { if(e.code!=='42501') throw e } finally { await db.exec('reset role;') }
}
await trydeny('anon', '', 'select public.get_meal_guest_prices();')
await trydeny('authenticated','13c3ddaa-034a-4621-9bfb-b940bbc30395','select public.get_meal_guest_prices();')
await trydeny('authenticated','13c3ddaa-034a-4621-9bfb-b940bbc30395',`select public.save_meal_guest_prices('23c807e0-f881-4fe6-abfd-0a98506c8cda','{"child":1}',0,1);`)
await trydeny('authenticated','73c3ddaa-034a-4621-9bfb-b940bbc30395','select * from meal_catalog_pricing_private.meal_guest_price_versions;')
await db.exec(await fs.readFile('scripts/install-meal-catalogue-child-50-seed.sql','utf8'))
await trydeny('authenticated','73c3ddaa-034a-4621-9bfb-b940bbc30395',"select meal_catalog_pricing_private.seed_buffet_child_50_percent(0,1,'{}',null,null);")
await trydeny('service_role','',"select meal_catalog_pricing_private.seed_buffet_child_50_percent(0,1,'{}',null,null);")
if(misses) throw Error(misses+' authorization paths unexpectedly succeeded')
await db.exec(`set role authenticated; set request.jwt.claim.sub='73c3ddaa-034a-4621-9bfb-b940bbc30395'; select public.get_meal_guest_prices(); reset role;`)
await db.exec(sql)
console.log('Catalogue migration, authorization fencing, optimistic locking and linked AND/OR price cases passed on PostgreSQL WASM.')
await db.exec(await fs.readFile('supabase/tests/meal_catalog_child_50_seed.sql','utf8'))
console.log('One-time Child seed passed atomic snapshot/revision matching, operator-only grants, half-up rounding, zero, unchanged Adult/active state, and idempotent retry.')
if(process.argv.includes('--quote-fixture')) {
 const baselinePath=process.argv[process.argv.indexOf('--quote-fixture')+1];
 if (!baselinePath) throw Error('--quote-fixture requires a path to trusted baseline keyed engine SQL');
 await db.exec(await fs.readFile('supabase/tests/meal_catalog_guest_pricing_engine_fixture.sql','utf8'))
 await db.exec(await fs.readFile(baselinePath,'utf8'))
 const q = async (i,o,guests) => (await db.query(`select public.calculate_keyed_rate_variants_engine(
     '33c807e0-f881-4fe6-abfd-0a98506c8cda',(now() AT TIME ZONE 'Asia/Kolkata')::date+$1::int,
     (now() AT TIME ZONE 'Asia/Kolkata')::date+$2::int,null,
     2,$3::int,$4::int,'direct',$5::jsonb) variants`,
     [i,o,guests.child??0,guests.infant??0,JSON.stringify(guests)])).rows[0].variants
 const eq=(actual,expected,msg)=>{if(JSON.stringify(actual)!==JSON.stringify(expected)) throw Error(msg+' got '+JSON.stringify(actual))}
 const before=await q(1,2,{adult:2,child:1})
 eq(before[1].meal_cost,2760,'fixture baseline')
 await db.exec(await fs.readFile('scripts/stage-meal-catalogue-quote-engine.sql','utf8'))
 await trydeny('anon','','select public.get_meal_catalogue_checkout_gate()')
 await trydeny('authenticated','73c3ddaa-034a-4621-9bfb-b940bbc30395','select public.get_meal_catalogue_checkout_gate()')
 if(misses) throw Error(misses+' checkout authorization paths unexpectedly succeeded')
 const gate=async () => {
  await db.exec('set role service_role;')
  try { return (await db.query('select public.get_meal_catalogue_checkout_gate() as active')).rows[0].active }
  finally { await db.exec('reset role;') }
 }
 eq(await gate(),false,'trusted checkout gate started off')
 eq(await q(1,2,{adult:2,child:1}),before,'off gate changed quotes/fingerprint')
 await db.exec('BEGIN;')
 try {
   const reviewed=(await db.query("select jsonb_object_agg(id,jsonb_build_object('adult',price,'active',is_active)) snapshot from public.meals")).rows[0].snapshot
   await db.query(`select meal_catalog_pricing_private.seed_buffet_child_50_percent(6,1,$1::jsonb,
   (select array_agg(id) from public.meals where price<2500),(select array_agg(id) from public.meals where price=2500))`,[JSON.stringify(reviewed)])
   eq(await q(1,2,{adult:2,child:1}),before,'unreleased one-time seed changed quote or fingerprint')
 } finally { await db.exec('ROLLBACK;') }

 await db.exec(`update public.meals set is_active=true;
  select public.save_meal_guest_prices('23c807e0-f881-4fe6-abfd-0a98506c8cda','{"child":135}',6,1);
  update public.guest_type_pricing_release set enabled=true;
  update meal_catalog_pricing_private.booking_release set enabled=true,
    effective_from=(now() AT TIME ZONE 'Asia/Kolkata')::date,published_revision=7,guest_policy_revision=1,
    plan_group_snapshot=(select jsonb_object_agg(plan_code,meal_choice_groups) from public.meal_plan_rules);
 `)
 eq(await gate(),true,'trusted checkout gate activates')
 let r=await q(1,2,{adult:2,child:1})
 eq(r[1].meal_cost,2300,'known EP target: 2 adults + child')
 eq(r[1].room_rate,4100,'EP source and child accommodation unchanged')
 eq(r[1].policy_adjustment,640,'percentage cancellation adjustment repriced')
 eq(r[1].total_price,7040,'new quote total')
 if(r[1].quote_fingerprint===before[1].quote_fingerprint) throw Error('changed quote fingerprint unchanged')
 eq((await q(1,2,{adult:2,infant:1}))[1].meal_cost,1840,'infant free')
 await db.exec('BEGIN;')
 try {
  const c='43c807e0-f881-4fe6-abfd-000000000010'
  await db.query("insert into meal_catalog_pricing_private.adult_only_meals values($1,7,(now() at time zone 'Asia/Kolkata')::date)",[c])
  const restricted=async counts=>(await db.query(`select meal_catalog_pricing_private.quote_target_meals(
    'HB', $1::jsonb, (now() at time zone 'Asia/Kolkata')::date, 650, $2::jsonb,
    (now() at time zone 'Asia/Kolkata')::date+1, 'ep_only') AS charge`, [JSON.stringify([{meal_ids:[c]}]),JSON.stringify(counts)])).rows[0].charge
  eq(await restricted({adult:2,child:1}),null,'adults-only Child is ineligible')
  eq(await restricted({adult:2,infant:1}),null,'adults-only Under 4 is ineligible, not zero')
  eq((await restricted({adult:2})).total,1300,'adults-only adult amount unchanged')
  await db.query('update meal_catalog_pricing_private.adult_only_meals set revision=8 where meal_id=$1',[c])
  eq((await restricted({adult:2,infant:1})).total,1300,'unreleased adults-only eligibility does not leak')
 } finally { await db.exec('ROLLBACK;') }

 eq((await q(0,2,{adult:2,child:1}))[1].nightly_breakdown.length,2,'known preserved and verified one record per night')
 eq((await q(0,2,{adult:2,child:1}))[1].meal_cost,4600,'known preserved and verified target meal totals')
 eq((await q(1,3,{adult:2,child:1})).map(x=>x.meal_plan_code),['RO'],'mixed opaque child cannot book paid options')
 eq((await q(2,3,{adult:2,child:1})).map(x=>x.meal_plan_code),['RO'],'wholly opaque child cannot book paid options')
 eq((await q(2,3,{adult:2})).map(x=>x.meal_plan_code),['RO','HB'],'adult legacy offers unchanged')
 await db.exec(`select public.save_meal_guest_prices('23c807e0-f881-4fe6-abfd-0a98506c8cdc','{"child":345}',7,1)`)
 eq(await q(1,2,{adult:2,child:1}),r,'unreviewed draft price changed released quote or fingerprint')
 await db.exec('update meal_catalog_pricing_private.booking_release set published_revision=8')
 eq((await q(1,2,{adult:2,child:1})).map(x=>x.meal_plan_code),['RO'],'unequal released OR fails closed only paid plan')
 console.log('Staged patch tested against a read-only snapshot of keyed engine with in-memory fixture overrides: off equivalence; verified/known EP/mixed/opaque; age rates and OR guard.')
}
await db.close()
