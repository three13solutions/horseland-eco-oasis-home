-- OPERATOR-ONLY ACTIVATION; never run as part of the backend-only migration batch.
-- Requires: matching public/admin frontend published, new-checkout client-version
-- enforcement deployed (old clients must refresh), preserved saved-intent resume,
-- and full price/fingerprint + promo regression tests against production data.
-- Rehearse first inside a transaction that is ROLLED BACK, without provider orders.
-- Explicit operator acknowledgement in this connection before running this file:
-- SET horseland.guest_age_meal_release = 'frontend-ready';
-- Merely flipping release_state.active does NOT activate or roll back engine code.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
do $preflight$
declare f record; n integer;
begin
 if current_setting('horseland.guest_age_meal_release',true) is distinct from 'frontend-ready' then
  raise exception 'FRONTEND_NOT_CONFIRMED: activation requires the matching published frontend and old-client handling';
 end if;
 perform 1 from guest_pricing_private.release_state where id and not active for update;
 if not found then raise exception 'Guest pricing already active or release state missing'; end if;
 if exists(select from guest_pricing_private.pre_activation_functions) then
  raise exception 'Prior activation backup exists: review rollback/re-activation manually; never overwrite it';
 end if;
 -- Capture exact original CREATE OR REPLACE bodies before changing any live engine.
 -- Existing function signatures and grants are retained by CREATE OR REPLACE.
 for f in select p.oid from pg_proc p where p.pronamespace='public'::regnamespace
 and p.proname in ('calculate_rate_variants_v2','calculate_dynamic_price',
 'calculate_dynamic_price_legacy_20261025','calculate_rate_variants',
 'calculate_rate_variants_legacy_20261025','calculate_legacy_rate_night_context',
 'attach_guest_age_policy') loop
  insert into guest_pricing_private.pre_activation_functions(signature,definition)
  values(f.oid::regprocedure::text,pg_get_functiondef(f.oid));
 end loop;
 select count(*) into n from guest_pricing_private.pre_activation_functions;
 if n<>7 then raise exception 'Expected seven original functions, found %; review overloads before activation',n; end if;
end $preflight$;

-- Guarded updates preserve all live rate/date/meal/modifier policies and fail closed
-- if the canonical engine has changed since this release was prepared.
do $patch$
declare d text; f record; before_d text;
begin
 d:=pg_get_functiondef('public.calculate_rate_variants_v2(uuid,date,date,uuid,integer,integer,integer,text)'::regprocedure);
 if strpos(d,'v_all_guests int:=p_adults_count+p_children_count+p_infants_count;')=0
 or strpos(d,'v_target_rate*v_all_guests')=0
 or strpos(d,'+p_children_count*coalesce(v_anchor.extra_child_per_night,0)+p_infants_count*v_anchor.extra_infant_per_night')=0
 or strpos(d,'return v_result;')=0 then raise exception 'Guest policy canonical pricing patch precondition failed'; end if;
 d:=replace(d,'v_all_guests int:=p_adults_count+p_children_count+p_infants_count;',
 'v_all_guests int:=p_adults_count+p_children_count+p_infants_count; v_chargeable_children int:=public.guest_policy_charge_count(''child'',p_adults_count,p_children_count,p_infants_count); v_meal_guests int:=public.guest_policy_charge_count(''meal'',p_adults_count,p_children_count,p_infants_count);');
 d:=replace(d,'v_target_rate*v_all_guests','v_target_rate*v_meal_guests');
 d:=replace(d,'''meal_guests'',v_all_guests','''meal_guests'',v_meal_guests');
 d:=replace(d,'p_children_count>0 and v_anchor.extra_child_per_night is null','v_chargeable_children>0 and v_anchor.extra_child_per_night is null');
 d:=replace(d,'+p_children_count*coalesce(v_anchor.extra_child_per_night,0)+p_infants_count*v_anchor.extra_infant_per_night',
 '+v_chargeable_children*coalesce(v_anchor.extra_child_per_night,0)');
 d:=replace(d,'''extra_children'',p_children_count','''extra_children'',v_chargeable_children');
 d:=replace(d,'return v_result;','return public.attach_guest_age_policy(v_result,p_adults_count,p_children_count,p_infants_count);');
 execute d;
 -- Existing dynamic/legacy children rates are preserved; only which bands incur
 -- that rate changes. No fabricated adult-rate percentage or festive price.
 for f in select oid,proname from pg_proc where pronamespace='public'::regnamespace and proname in
  ('calculate_dynamic_price','calculate_dynamic_price_legacy_20261025','calculate_rate_variants','calculate_rate_variants_legacy_20261025','calculate_legacy_rate_night_context') loop
   d:=pg_get_functiondef(f.oid);before_d:=d;
   if strpos(d,'p_children_count')=0 then continue; end if;
   d:=replace(d,'v_extra_children := p_children_count;', 'v_extra_children := public.guest_policy_charge_count(''child'',p_adults_count,p_children_count,p_infants_count);');
   d:=replace(d,'v_extra_children integer:=p_children_count;', 'v_extra_children integer:=public.guest_policy_charge_count(''child'',p_adults_count,p_children_count,p_infants_count);');
   -- These functions expose original headcounts for operational use, not charge quantities.
   if d=before_d then raise exception 'Guest policy legacy pricing patch precondition failed for %',f.oid::regprocedure; end if;
   execute d;
 end loop;
end $patch$;

do $patch$
declare d text; f text; old_loop text:=E'FOR v_meal_plan IN SELECT * FROM meal_plan_rules WHERE is_active = true ORDER BY display_order\n  LOOP';
begin
 d:=pg_get_functiondef('public.calculate_rate_variants_v2(uuid,date,date,uuid,integer,integer,integer,text)'::regprocedure);
 if strpos(d,'v_target_rate*v_meal_guests')=0 or strpos(d,'v_meal:=v_target_rate*v_meal_guests;')=0
 or strpos(d,'''meal_guests'',v_meal_guests')=0 or strpos(d,'v_total_room:=v_total_room+v_legacy_night;')=0 or strpos(d,'for v_plan in select * from public.meal_plan_rules')=0 then raise exception 'Meal age quote patch precondition failed'; end if;
 d:=replace(d,'for v_plan in select * from public.meal_plan_rules','<<meal_plan_loop>> for v_plan in select * from public.meal_plan_rules');
 d:=replace(d,'v_target_rate*v_meal_guests','(public.calculate_meal_age_charge(v_plan.plan_code,v_target_rate,p_adults_count,p_children_count,p_infants_count)->>''total'')::numeric');
 d:=replace(d,'''meal_guests'',v_meal_guests', '''meal_guests'',(public.calculate_meal_age_charge(v_plan.plan_code,v_target_rate,p_adults_count,p_children_count,p_infants_count)->>''chargeable_guest_count'')::integer,''meal_age_pricing'',public.calculate_meal_age_charge(v_plan.plan_code,v_target_rate,p_adults_count,p_children_count,p_infants_count)');
 -- Guard only opaque fallback nights. Preserved EP has a known selected adult meal rate.
 d:=replace(d,'v_total_room:=v_total_room+v_legacy_night;', E'v_total_room:=v_total_room+v_legacy_night;\n       if v_preservation is null or coalesce(v_preservation->>''preservation_mode'','''')<>''ep_only'' or not coalesce((v_preservation->>''preserve_legacy_ep'')::boolean,false) then if not public.legacy_meal_age_supported(v_plan.plan_code,p_adults_count,p_children_count,p_infants_count) then continue meal_plan_loop; end if; end if;');
 execute d;
 foreach f in array array['calculate_rate_variants','calculate_rate_variants_legacy_20261025'] loop
  d:=pg_get_functiondef(format('public.%I(uuid,date,date,uuid,integer,integer,integer,text)',f)::regprocedure);
  if strpos(d,old_loop)=0 then raise exception 'Meal age legacy guard precondition failed for %',f; end if;
  d:=replace(d,old_loop,old_loop||E'\n    if not public.legacy_meal_age_supported(v_meal_plan.plan_code,p_adults_count,p_children_count,p_infants_count) then continue; end if;');
  execute d;
 end loop;
end $patch$;

-- Append immutable policy snapshots and include policy revisions in stale-quote checks.
alter function public.attach_guest_age_policy(jsonb,integer,integer,integer) rename to attach_guest_age_policy_before_meal_rates;
create function public.attach_guest_age_policy(p_variants jsonb,p_adults integer,p_children integer,p_infants integer)
returns jsonb language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare base jsonb; v jsonb; result jsonb:='[]'; policy jsonb:=public.get_meal_age_pricing_policy(); charge jsonb;
begin
 if policy is null then raise exception 'Meal age policy unavailable'; end if;
 base:=public.attach_guest_age_policy_before_meal_rates(p_variants,p_adults,p_children,p_infants);
 for v in select value from jsonb_array_elements(base) loop
  select x->'meal_age_pricing' into charge from jsonb_array_elements(coalesce(v->'nightly_breakdown','[]')) x where x ? 'meal_age_pricing' limit 1;
  result:=result||jsonb_build_array(v||jsonb_build_object('meal_age_pricing_policy',policy,
   'chargeable_meal_guests',coalesce((charge->>'chargeable_guest_count')::integer,(v->>'chargeable_meal_guests')::integer),
   'quote_fingerprint',md5(jsonb_build_array(v->>'quote_fingerprint',policy)::text)));
 end loop;
 return result;
end $$;
revoke all on function public.attach_guest_age_policy(jsonb,integer,integer,integer) from public;
grant execute on function public.attach_guest_age_policy(jsonb,integer,integer,integer) to anon,authenticated,service_role;

-- Code and status become visible atomically. No historical bookings are rewritten.
UPDATE guest_pricing_private.release_state SET active=true,activated_at=now() WHERE id;
COMMIT;

-- Emergency rollback: coordinate with frontend/checkout contract handling first.
-- Execute the entire block below as database owner after checking current functions
-- have not been independently changed since activation. Never overwrite later work.
-- BEGIN;
-- SET LOCAL lock_timeout = '5s';
-- SELECT 1 FROM guest_pricing_private.release_state WHERE id FOR UPDATE;
-- DO $rollback$
-- DECLARE f record;
-- BEGIN
--   IF (SELECT count(*) FROM guest_pricing_private.pre_activation_functions)<>7 THEN
--     RAISE EXCEPTION 'Original function backup incomplete';
--   END IF;
--   FOR f IN SELECT definition FROM guest_pricing_private.pre_activation_functions LOOP
--     EXECUTE f.definition;
--   END LOOP;
-- END $rollback$;
-- DROP FUNCTION public.attach_guest_age_policy_before_meal_rates(jsonb,integer,integer,integer);
-- UPDATE guest_pricing_private.release_state SET active=false,activated_at=null WHERE id;
-- COMMIT;
-- Original snapshot backup intentionally retained for investigation/review.
