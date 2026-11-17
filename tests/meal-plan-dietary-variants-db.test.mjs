// Configuration-only PostgreSQL validation. No live database or image upload.
// PROMO_PGLITE_MODULE=/tmp/horseland-age-dbtest/node_modules/@electric-sql/pglite/dist/index.js node --test tests/meal-plan-dietary-variants-db.test.mjs
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';
const path=process.env.PROMO_PGLITE_MODULE;
const migration=readFileSync(new URL('../supabase/migrations/20261118000600_meal_plan_dietary_variants.sql',import.meta.url),'utf8');
test('dietary config is not wired to live prices or guest allocation',()=>{
 assert.doesNotMatch(migration,/create or replace function.*calculate_|update public\.(meal_plan_rules|bookings|payments)|insert into public\.meal_plan_dietary_variants[^\n]*values\s*\('/i);
 assert.match(migration,/ADMIN CONFIGURATION ONLY/);assert.match(migration,/create trigger zz_activity_log/);
});
test('dietary variant admin authorization, media references, revisions and immutable existing data',{skip:(!path||!existsSync(path))&&'Set PROMO_PGLITE_MODULE to installed PGlite'},async()=>{
 const {PGlite}=await import(path);const db=new PGlite();
 const ids={plan:'11111111-1111-4111-8111-111111111111',image:'22222222-2222-4222-8222-222222222222',video:'33333333-3333-4333-8333-333333333333',unsafe:'44444444-4444-4444-8444-444444444444'};
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create function public.is_admin_new() returns boolean language sql stable as $$select nullif(current_setting('test.admin',true),'')::boolean$$;
 create table public.audit_fixture(operation text,id uuid);
 create function public.record_activity_log() returns trigger language plpgsql set search_path=public as $$begin insert into audit_fixture values(tg_op,new.id);return new;end$$;
 create table public.meal_plan_rules(id uuid primary key,plan_code text,plan_name text,original_rate numeric);
 insert into meal_plan_rules values('${ids.plan}','FB','Full board',1510);
 create table public.gallery_images(id uuid primary key,media_type text,image_url text,title text,hardcoded_key text);
 insert into gallery_images values('${ids.image}','image','https://example.com/existing.jpg','Existing dish','dish-key'),('${ids.video}','video','https://example.com/movie.mp4','Video',null),('${ids.unsafe}','image','javascript:alert(1)','Invalid',null);
 create table public.bookings(id integer,rate_breakdown jsonb);insert into bookings values(1,'{"original_total":1234}');`);
 const plans=(await db.query('select * from meal_plan_rules')).rows,bookings=(await db.query('select * from bookings')).rows;
 await db.exec(migration);
 const get=()=>db.query('select admin_meal_plan_dietary_variants() as rows');
 const config={meal_plan_id:ids.plan,dietary_type:'veg',description:'Proposed vegetarian menu',rate_per_person_inr:123.45,gallery_image_id:ids.image,is_active:false};
 const save=(c=config,r=null)=>db.query('select save_meal_plan_dietary_variant($1,$2) as row',[JSON.stringify(c),r]);
 await assert.rejects(get(),/Administrator required/);await assert.rejects(save(),/Administrator required/);
 await db.exec("set test.uid='00000000-0000-4000-8000-000000000001'");await assert.rejects(save(),/Administrator required/); // NULL admin result
 await db.exec("set test.admin='false'");await assert.rejects(get(),/Administrator required/);await assert.rejects(save(),/Administrator required/);
 await db.exec("set test.admin='true'");assert.deepEqual((await get()).rows[0].rows,[]); // no seeded variant
 const made=(await save()).rows[0].row;assert.equal(made.rate_per_person_inr,123.45);assert.equal(made.picture_url,'https://example.com/existing.jpg');assert.equal(made.picture_key,'dish-key');assert.equal(made.is_active,false);assert.equal(made.revision,1);
 await assert.rejects(save(),/already has/);
 const updated=(await save({...config,id:made.id,description:'Reviewed proposal',rate_per_person_inr:0,is_active:true,gallery_image_id:null},1)).rows[0].row;
 assert.equal(updated.revision,2);assert.equal(updated.rate_per_person_inr,0);assert.equal(updated.picture_url,null);
 await assert.rejects(save({...config,id:made.id},1),/changed/);
 await assert.rejects(save({...config,id:made.id,dietary_type:'jain'},2),/cannot change/);
 for(const changes of [{rate_per_person_inr:null},{rate_per_person_inr:-1},{rate_per_person_inr:0.001},{rate_per_person_inr:10000000000},{gallery_image_id:ids.video},{gallery_image_id:ids.unsafe},{dietary_type:'anything'},{is_active:null}])await assert.rejects(save({...config,id:made.id,...changes},2));
 for(const dietary_type of ['nonveg','jain'])await save({...config,dietary_type,gallery_image_id:null});
 assert.equal((await get()).rows[0].rows.length,3);
 assert.deepEqual((await db.query('select * from meal_plan_rules')).rows,plans);assert.deepEqual((await db.query('select * from bookings')).rows,bookings);
 assert.equal((await db.query('select count(*)::integer as n from audit_fixture')).rows[0].n,4);
 const access=(await db.query("select has_table_privilege('authenticated','meal_plan_dietary_variants','insert') as direct_write,has_function_privilege('anon','save_meal_plan_dietary_variant(jsonb,integer)','execute') as public_write")).rows[0];assert.equal(access.direct_write,false);assert.equal(access.public_write,false);
 }finally{await db.close()}
});
