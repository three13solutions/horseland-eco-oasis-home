import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';
const r=fileURLToPath(new URL('../',import.meta.url));
const modulePath=process.env.AGE_POLICY_PGLITE_MODULE;
test('dormant deployment preserves exact engines; activation and rollback are explicit and atomic',{skip:!modulePath&&'Set AGE_POLICY_PGLITE_MODULE to run isolated PostgreSQL validation'},async()=>{
const {PGlite}=await import(modulePath);
const db=new PGlite();try{
const defs=JSON.parse(readFileSync(r+'tests/fixtures/age-policy-pricing-pre-migration.json'));
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
create function auth.uid() returns uuid language sql as $$select '11111111-1111-4111-8111-111111111111'::uuid$$;
create function public.is_admin_new() returns boolean language sql as $$select true$$;
create function public.record_activity_log() returns trigger language plpgsql as $$begin return coalesce(new,old);end$$;
create function public.prevent_audit_log_changes() returns trigger language plpgsql as $$begin raise exception 'Immutable';end$$;
set check_function_bodies=off;`);
for(const {definition} of defs)await db.exec(definition);
const snapshot=async()=> (await db.query(`select proname,pg_get_functiondef(oid) definition from pg_proc where pronamespace='public'::regnamespace and proname in ('calculate_rate_variants_v2','calculate_dynamic_price','calculate_dynamic_price_legacy_20261025','calculate_rate_variants','calculate_rate_variants_legacy_20261025','calculate_legacy_rate_night_context') order by proname`)).rows;
const before=await snapshot();
await db.exec(readFileSync(r+'supabase/migrations/20261119081127_dynamic_guest_age_policy_dormant.sql','utf8'));
await db.exec(readFileSync(r+'supabase/migrations/20261119081136_meal_age_pricing_policy_dormant.sql','utf8'));
assert.deepEqual(await snapshot(),before);console.log('PASS dormant schema retains exact six function definitions');
assert.equal((await db.query('select guest_age_meal_pricing_active() active')).rows[0].active,false);
for(const q of [`select save_guest_age_policy(1,(get_guest_age_policy()->'bands'))`,`select save_meal_age_pricing_policy(1,get_meal_age_pricing_policy()->'rules',1,1)`])await assert.rejects(db.query(q),/GUEST_PRICING_NOT_ACTIVE/);
console.log('PASS inactive policy writes blocked');
await db.exec('set role anon');assert.equal((await db.query("select (get_guest_age_policy()->>'active')::boolean active")).rows[0].active,false);await db.exec('reset role');
const activate=readFileSync(r+'scripts/activate-guest-age-meal-pricing.sql','utf8');
await assert.rejects(db.exec(activate),/FRONTEND_NOT_CONFIRMED/);await db.exec('rollback');
await db.exec("set horseland.guest_age_meal_release='frontend-ready'");
await db.exec(activate);
assert.equal((await db.query('select guest_age_meal_pricing_active() active')).rows[0].active,true);
const after=await snapshot();for(let i=0;i<6;i++)assert.notEqual(after[i].definition,before[i].definition);
assert.equal((await db.query('select count(*)::int n from guest_pricing_private.pre_activation_functions')).rows[0].n,7);
console.log('PASS activation modifies six functions atomically with seven backups');
const rollback=activate.slice(activate.indexOf('-- BEGIN;',activate.indexOf('-- Emergency rollback'))).split('\n').filter(l=>l.startsWith('-- ')).map(l=>l.slice(3)).join('\n').replace('Original snapshot backup intentionally retained for investigation/review.','');
await db.exec(rollback);assert.deepEqual(await snapshot(),before);assert.equal((await db.query('select guest_age_meal_pricing_active() active')).rows[0].active,false);
console.log('PASS documented rollback restores exact six pricing definitions and inactive status');}finally{await db.close();}
});
