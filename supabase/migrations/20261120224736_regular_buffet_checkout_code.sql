-- Verified against live quotes in a rolled-back transaction; gate stays OFF.
-- While the new keyed quote flag stays OFF, both older numerical callers and
-- validated keyed callers dispatch through the same live v2 default engine.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE meal_catalog_pricing_private.regular_buffet_release (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  enabled boolean NOT NULL DEFAULT false,
  published_revision bigint CHECK (published_revision > 0),
  guest_policy_revision bigint CHECK (guest_policy_revision > 0),
  plan_group_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(plan_group_snapshot)='object'),
  CHECK (NOT enabled OR (published_revision IS NOT NULL AND guest_policy_revision IS NOT NULL
    AND plan_group_snapshot ?& ARRAY['BB','HB','FB']))
);
INSERT INTO meal_catalog_pricing_private.regular_buffet_release DEFAULT VALUES;
ALTER TABLE meal_catalog_pricing_private.regular_buffet_release ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON meal_catalog_pricing_private.regular_buffet_release FROM PUBLIC,anon,authenticated,service_role;

-- Invoker baseline v2 is also available directly to client roles, so this
-- narrow, fixed-search-path helper alone is definers' rights. It returns only
-- totals that customer-facing quotes can expose, and no private draft data.
-- NULL means not released / not in scope; {blocked:true} means release pinned
-- but inconsistent, so only this paid plan is withheld rather than overcharged.
CREATE FUNCTION public.get_regular_buffet_checkout_meal(
 p_room_type_id uuid,p_check_in date,p_check_out date,p_night date,p_meal_plan_id uuid,
 p_adult_rate numeric,p_adults int,p_children int,p_infants int
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
 r meal_catalog_pricing_private.regular_buffet_release%ROWTYPE;
 p jsonb;
 m public.meal_plan_rules%ROWTYPE;
 c numeric;
BEGIN
 IF p_room_type_id IS NULL OR p_room_type_id NOT IN (
  '8d3f3742-4c4d-4d2e-b25f-a50ed807dbf5'::uuid,'2fd9b1b5-d067-49af-a47d-64a17ce524eb'::uuid,
  '47b2ee9c-bd3b-4cbf-9795-ff9ca4c02d55'::uuid,'73dbc09f-64c2-4498-b58f-549151605ee4'::uuid
 ) OR p_check_in IS NULL OR p_check_out IS NULL OR NOT (
   (p_check_in>=DATE '2026-11-21' AND p_check_out<=DATE '2026-12-24')
   OR (p_check_in>=DATE '2027-01-02' AND p_check_out<=DATE '2027-04-01')
 ) OR p_night IS NULL OR p_night<p_check_in OR p_night>=p_check_out
   OR p_adults IS NULL OR p_adults<1 OR p_children IS NULL OR p_children<0 OR p_infants IS NULL OR p_infants<0
   OR p_adults::bigint+p_children+p_infants>100 OR p_children+p_infants=0 THEN
   RETURN NULL;
 END IF;
 SELECT * INTO STRICT r FROM meal_catalog_pricing_private.regular_buffet_release WHERE id;
 IF NOT r.enabled THEN RETURN NULL; END IF;
 SELECT * INTO m FROM public.meal_plan_rules
 WHERE id=p_meal_plan_id AND is_active AND plan_code IN ('BB','HB','FB');
 IF NOT FOUND THEN RETURN NULL; END IF;
 p:=guest_pricing_private.get_booking_guest_policy();
 IF (p->>'revision')::bigint IS DISTINCT FROM r.guest_policy_revision
    OR (p->>'keyed_pricing_active')::boolean IS DISTINCT FROM false
    OR r.published_revision>(SELECT revision FROM meal_catalog_pricing_private.state WHERE id)
    OR m.supplement_effective_from IS NULL OR m.supplement_effective_from>p_night
    OR jsonb_typeof(m.meal_choice_groups) IS DISTINCT FROM 'array'
    OR jsonb_array_length(m.meal_choice_groups)=0
    OR m.meal_choice_groups IS DISTINCT FROM r.plan_group_snapshot->m.plan_code
    OR meal_catalog_pricing_private.has_adult_only_plan_choice(m.meal_choice_groups,p_night,r.published_revision)
    OR meal_catalog_pricing_private.resolve_plan_unit_price(m.meal_choice_groups,'adult',p_night) IS DISTINCT FROM p_adult_rate THEN
    RETURN jsonb_build_object('blocked',true);
 END IF;
 c:=meal_catalog_pricing_private.resolve_plan_unit_price(m.meal_choice_groups,'child',p_night,r.published_revision);
 IF c IS NULL OR c<>round(p_adult_rate*0.5,2) THEN RETURN jsonb_build_object('blocked',true); END IF;
 RETURN jsonb_build_object('total',p_adults*p_adult_rate+p_children*c,'adult_unit',p_adult_rate,'child_unit',c,'infant_unit',0,
  'adults',p_adults,'children',p_children,'infants',p_infants,'catalogue_revision',r.published_revision);
END;
$fn$;
REVOKE ALL ON FUNCTION public.get_regular_buffet_checkout_meal(uuid,date,date,date,uuid,numeric,int,int,int)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_regular_buffet_checkout_meal(uuid,date,date,date,uuid,numeric,int,int,int)
 TO anon,authenticated,service_role;

DO $patch$
DECLARE
 v_sql text;
 v_token text;
 v_checks text[]:=ARRAY[
  'v_meal numeric; v_total_room',
  'for v_plan in select * from public.meal_plan_rules where is_active order by display_order loop',
  'v_meal:=v_target_rate*v_all_guests;',
  'v_breakdown:=v_breakdown||jsonb_build_object(''date'',v_date,''anchor_id'',',
  '''selected_meal_rate'',v_target_rate,''selected_meal_version'',v_target_version,''meal_guests'',v_all_guests,''meal_cost'',v_meal);'
 ];
BEGIN
 v_sql:=pg_get_functiondef('public.calculate_rate_variants_v2(uuid,date,date,uuid,integer,integer,integer,text)'::regprocedure);
 IF md5(v_sql) IS DISTINCT FROM '90a3a8ff359aff97d6c527e4e45ee219' THEN
   RAISE EXCEPTION 'Regular buffet quote stage patch aborted: reviewed v2 baseline has drifted';
 END IF;
 FOREACH v_token IN ARRAY v_checks LOOP
  IF (length(v_sql)-length(replace(v_sql,v_token,'')))<>length(v_token) THEN
   RAISE EXCEPTION 'Regular buffet quote stage patch aborted: expected exactly one occurrence of %',v_token;
  END IF;
 END LOOP;
 v_sql:=replace(v_sql,'v_meal numeric; v_total_room','v_buffet jsonb; v_regular_buffet_stay boolean; v_meal numeric; v_total_room');
 v_sql:=replace(v_sql,'for v_plan in select * from public.meal_plan_rules where is_active order by display_order loop',
  'v_regular_buffet_stay:=(p_children_count>0 OR p_infants_count>0) AND v_covered AND ('||
  '(p_check_in>=DATE ''2026-11-21'' AND p_check_out<=DATE ''2026-12-24'') OR '||
  '(p_check_in>=DATE ''2027-01-02'' AND p_check_out<=DATE ''2027-04-01'')) AND NOT EXISTS ('||
  'SELECT 1 FROM jsonb_array_elements(v_coverage) x '||
  'WHERE x->''anchor''->>''source_meal_plan_code'' IS DISTINCT FROM ''RO'' OR '||
  'public.get_pricing_preservation_policy(p_room_type_id,(x->>''date'')::date) IS NOT NULL); '||
  '<<buffet_plan_loop>> for v_plan in select * from public.meal_plan_rules where is_active order by display_order loop');
 v_sql:=replace(v_sql,'v_meal:=v_target_rate*v_all_guests;',
  'v_meal:=v_target_rate*v_all_guests; v_buffet:=NULL;'||chr(10)||
  '     IF v_regular_buffet_stay AND v_plan.plan_code IN (''BB'',''HB'',''FB'') THEN'||chr(10)||
  '       v_buffet:=public.get_regular_buffet_checkout_meal(p_room_type_id,p_check_in,p_check_out,v_date,v_plan.id,v_target_rate,p_adults_count,p_children_count,p_infants_count);'||chr(10)||
  '       IF coalesce((v_buffet->>''blocked'')::boolean,false) THEN CONTINUE buffet_plan_loop; END IF;'||chr(10)||
  '       IF v_buffet IS NOT NULL THEN v_meal:=(v_buffet->>''total'')::numeric; END IF;'||chr(10)||
  '     END IF;');
 v_sql:=replace(v_sql,'v_breakdown:=v_breakdown||jsonb_build_object(''date'',v_date,''anchor_id'',',
  'v_breakdown:=v_breakdown||(jsonb_build_object(''date'',v_date,''anchor_id'',');
 v_sql:=replace(v_sql,'''selected_meal_rate'',v_target_rate,''selected_meal_version'',v_target_version,''meal_guests'',v_all_guests,''meal_cost'',v_meal);',
  '''selected_meal_rate'',v_target_rate,''selected_meal_version'',v_target_version,''meal_guests'',v_all_guests,''meal_cost'',v_meal)'||
  '||(CASE WHEN v_buffet IS NULL THEN ''{}''::jsonb ELSE jsonb_build_object(''guest_type_meals'',v_buffet) END));');
 EXECUTE v_sql;
END;
$patch$;
COMMIT;