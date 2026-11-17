-- Policy-backed preservation for rooms/dates outside the approved EP sheet.
alter table public.pricing_preservation_periods add column preservation_mode text not null default 'ep_only' check(preservation_mode in ('ep_only','full_pricing'));
alter table public.pricing_preservation_periods add column meal_version_snapshot jsonb not null default '[]'::jsonb check(jsonb_typeof(meal_version_snapshot)='array');

-- Scope day-definition preservation to the room; unmapped rooms must not change
-- the selected weekday for mapped rooms on the same date.
create or replace function public.is_pricing_weekend(p_date date,p_legacy_days integer[] default array[0,5,6])
returns boolean language sql stable security invoker set search_path=public as $$
 select extract(dow from p_date)::integer=any(coalesce((select weekend_days from pricing_day_rules where effective_from<=p_date and(effective_to is null or effective_to>=p_date) order by revision desc limit 1),p_legacy_days));
$$;
create function public.is_pricing_weekend(p_date date,p_legacy_days integer[],p_room_type_id uuid)
returns boolean language sql stable security invoker set search_path=public as $$
 select case when coalesce((get_pricing_preservation_policy(p_room_type_id,p_date)->>'preserve_legacy_days')::boolean,false)
 then extract(dow from p_date)::integer=any(p_legacy_days) else is_pricing_weekend(p_date,p_legacy_days) end;
$$;
create function public.preserved_meal_version(p_policy jsonb,p_plan_code text,p_date date)
returns jsonb language sql stable security invoker set search_path=public as $$
 select v from jsonb_array_elements(p_policy->'meal_version_snapshot') v where v->>'plan_code'=p_plan_code and (v->>'effective_from')::date<=p_date
 order by (v->>'effective_from')::date desc,(v->>'recorded_at')::timestamptz desc,(v->>'id')::uuid limit 1;
$$;

do $patch$
declare d text; f record; before_d text;
begin
 -- All current pricing call paths now pass the room ID into the day resolver.
 for f in select oid from pg_proc where pronamespace='public'::regnamespace and proname in ('calculate_rate_variants_v2','calculate_rate_variants','calculate_rate_variants_legacy_20261025','calculate_legacy_rate_night_context','get_base_price_for_date') loop
  d:=pg_get_functiondef(f.oid);before_d:=d;
  d:=replace(d,'public.is_pricing_weekend(v_date, array[0,5,6])','public.is_pricing_weekend(v_date, array[0,5,6],p_room_type_id)');
  d:=replace(d,'public.is_pricing_weekend(p_date, array[0,6])','public.is_pricing_weekend(p_date, array[0,6],p_room_type_id)');
  if d=before_d then raise exception 'Scoped weekend patch precondition failed for %',f.oid::regprocedure;end if;
  execute d;
 end loop;
 d:=pg_get_functiondef('public.calculate_rate_variants_v2(uuid,date,date,uuid,integer,integer,integer,text)'::regprocedure);
 d:=replace(d,'v_preservation jsonb;','v_preservation jsonb; v_preserved_version jsonb; v_all_full_preservation boolean;');
 d:=replace(d,' -- Resolve all nights before pricing.',E' select bool_and(coalesce(get_pricing_preservation_policy(p_room_type_id,ds::date)->>\'preservation_mode\',\'\')=\'full_pricing\') into v_all_full_preservation from generate_series(p_check_in,p_check_out-1,\'1 day\') ds;\n -- Resolve all nights before pricing.');
 d:=replace(d,'if v_preservation is null then v_covered:=false; else v_has_verified:=true; end if;','if v_preservation is null or v_preservation->>''preservation_mode''=''full_pricing'' then v_covered:=false; else v_has_verified:=true; end if;');
 d:=replace(d,'if not v_covered and not v_has_verified then','if not v_covered and (not v_has_verified or v_all_full_preservation) then');
 d:=replace(d,$a$if v_preservation is not null and (v_preservation->>'preserve_legacy_ep')::boolean then$a$,$b$if v_preservation is not null and v_preservation->>'preservation_mode'='ep_only' and (v_preservation->>'preserve_legacy_ep')::boolean then$b$);
 d:=replace(d,'     if v_source_rate is null then',$s$     if v_preservation->>'preservation_mode'='full_pricing' then
       v_preserved_version:=public.preserved_meal_version(v_preservation,v_anchor.source_meal_plan_code,v_date);
       v_source_rate:=(v_preserved_version->>'amount')::numeric;v_source_version:=(v_preserved_version->>'id')::uuid;
     end if;
     if v_source_rate is null then$s$);
 d:=replace(d,'     if v_target_rate is null then',$s$     if v_preservation->>'preservation_mode'='full_pricing' then
       v_preserved_version:=public.preserved_meal_version(v_preservation,v_plan.plan_code,v_date);
       v_target_rate:=(v_preserved_version->>'amount')::numeric;v_target_version:=(v_preserved_version->>'id')::uuid;
     end if;
     if v_target_rate is null then$s$);
 d:=replace(d,'       if v_fb_rate is null then',$s$       if v_preservation->>'preservation_mode'='full_pricing' then
       v_preserved_version:=public.preserved_meal_version(v_preservation,'FB',v_date);v_fb_rate:=(v_preserved_version->>'amount')::numeric;
       end if;
       if v_fb_rate is null then$s$);
 d:=replace(d,$a$'promo_eligible_ep',v_anchor.source_meal_plan_code='RO'$a$,$b$'promo_eligible_ep',v_anchor.source_meal_plan_code='RO' and coalesce(v_preservation->>'preservation_mode','')<>'full_pricing'$b$);
 -- Legacy quotes historically retain fractional paise in policy percentages.
 -- Preserve that representation when every occupied night uses legacy EP policy;
 -- anchor-based/mixed canonical quotes retain their existing rounding contract.
 d:=replace(d,'v_all_full_preservation boolean;','v_all_full_preservation boolean; v_has_anchor boolean:=false;');
 d:=replace(d,E'   v_has_verified:=true;\n   v_coverage',E'   v_has_verified:=true;v_has_anchor:=true;\n   v_coverage');
 d:=replace(d,'v_policy:=round(v_policy,2);v_total:=round(v_total_room+v_total_meal+v_policy,2);',
   'if v_has_anchor then v_policy:=round(v_policy,2);v_total:=round(v_total_room+v_total_meal+v_policy,2);else v_total:=v_total_room+v_total_meal+v_policy;end if;');
 d:=replace(d,'round(v_total/v_nights,2)','case when v_has_anchor then round(v_total/v_nights,2) else v_total/v_nights end');
 execute d;
end $patch$;
