-- STAGING ONLY. Never run on production or via automatic migrations.
-- Apply the additive catalogue migration first. The second gate defaults OFF.
-- The separate keyed guest-types flag and authenticated checkout/manual gates
-- must be rehearsed before use. Read docs/meal-catalogue-guest-pricing.md.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE meal_catalog_pricing_private.booking_release (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  enabled boolean NOT NULL DEFAULT false,
  effective_from date,
  published_revision bigint CHECK (published_revision > 0),
  guest_policy_revision bigint CHECK (guest_policy_revision > 0),
  plan_group_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(plan_group_snapshot)='object'),
  CHECK (NOT enabled OR (effective_from IS NOT NULL AND published_revision IS NOT NULL
    AND guest_policy_revision IS NOT NULL AND plan_group_snapshot <> '{}'::jsonb))
);
INSERT INTO meal_catalog_pricing_private.booking_release DEFAULT VALUES;
ALTER TABLE meal_catalog_pricing_private.booking_release ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON meal_catalog_pricing_private.booking_release FROM PUBLIC, anon, authenticated;
CREATE FUNCTION meal_catalog_pricing_private.is_effective(p_night date) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT coalesce((SELECT enabled AND effective_from <= p_night
    FROM meal_catalog_pricing_private.booking_release r
    JOIN meal_catalog_pricing_private.state s ON s.id=r.id
    WHERE r.id AND r.published_revision<=s.revision), false)
    AND coalesce((SELECT enabled AND frontend_release='keyed-guest-v1'
      FROM public.guest_type_pricing_release WHERE id), false)
$$;
REVOKE ALL ON FUNCTION meal_catalog_pricing_private.is_effective(date) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION meal_catalog_pricing_private.has_nonadult_guests(p_counts jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM jsonb_each_text(p_counts) e WHERE e.key <> 'adult' AND e.value::integer > 0)
$$;
REVOKE ALL ON FUNCTION meal_catalog_pricing_private.has_nonadult_guests(jsonb) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION meal_catalog_pricing_private.quote_target_meals(
  p_plan text, p_groups jsonb, p_group_effective date, p_adult_rate numeric, p_counts jsonb,
  p_night date, p_preservation text
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_policy jsonb;
  v_guest jsonb;
  v_guest_key text;
  v_count int;
  v_unit numeric;
  v_total numeric := 0;
  v_charged int := 0;
  v_lines jsonb := '[]'::jsonb;
  v_release meal_catalog_pricing_private.booking_release%ROWTYPE;
BEGIN
  -- The released code has exactly the old breakdown and fingerprint while off.
  -- Specifically never change source/snapshot pricing or full-preservation dates.
  IF NOT meal_catalog_pricing_private.is_effective(p_night) OR p_preservation='full_pricing'
      OR p_plan='RO' OR NOT meal_catalog_pricing_private.has_nonadult_guests(p_counts) THEN
    RETURN guest_pricing_private.guest_type_meal_charge(p_plan,p_adult_rate,p_counts);
  END IF;
  v_policy := guest_pricing_private.get_booking_guest_policy();
  SELECT * INTO STRICT v_release FROM meal_catalog_pricing_private.booking_release WHERE id;
  FOR v_guest IN SELECT value FROM jsonb_array_elements(v_policy->'bands') LOOP
    v_guest_key:=v_guest->>'key';
    v_count:=coalesce((p_counts->>v_guest_key)::int,0);
    IF v_count=0 THEN CONTINUE; END IF;
    IF v_guest->>'meal_rule'='free' THEN v_unit:=0;
    ELSIF v_guest_key='adult' THEN v_unit:=p_adult_rate;
    ELSIF (v_policy->>'revision')::bigint IS DISTINCT FROM v_release.guest_policy_revision
        OR p_groups IS DISTINCT FROM (v_release.plan_group_snapshot->p_plan)
        OR p_group_effective IS NULL OR p_group_effective>p_night
        OR jsonb_typeof(p_groups) IS DISTINCT FROM 'array' OR jsonb_array_length(p_groups)=0
        OR meal_catalog_pricing_private.resolve_plan_unit_price(p_groups,'adult',p_night) IS DISTINCT FROM p_adult_rate THEN
      -- Current group links may not describe a historic or independently pinned supplement.
      RETURN NULL;
    ELSE v_unit:=meal_catalog_pricing_private.resolve_plan_unit_price(p_groups,v_guest_key,p_night,v_release.published_revision);
    END IF;
    IF v_unit IS NULL THEN RETURN NULL; END IF;
    v_total:=v_total+v_unit*v_count;
    IF v_unit>0 THEN v_charged:=v_charged+v_count; END IF;
    v_lines:=v_lines||jsonb_build_array(jsonb_build_object(
      'guest_type_key',v_guest_key,'count',v_count,'unit_price',v_unit,'total',v_unit*v_count,
      'mode',CASE WHEN v_guest->>'meal_rule'='free' THEN 'free' WHEN v_guest_key='adult' THEN 'full' ELSE 'catalogue' END));
  END LOOP;
  RETURN jsonb_build_object('total',v_total,'bands',v_lines,'chargeable_guest_count',v_charged,
    'catalogue_guest_price_revision',v_release.published_revision,'catalogue_guest_policy_revision',v_policy->'revision');
END;
$$;
REVOKE ALL ON FUNCTION meal_catalog_pricing_private.quote_target_meals(text,jsonb,date,numeric,jsonb,date,text) FROM PUBLIC, anon, authenticated;

-- Guard all source substitutions. Any drift aborts the entire staging script.
DO $patch$
DECLARE
  v_sql text;
  v_checks text[] := ARRAY[
    'v_meal numeric; v_total_room',
    'for v_plan in select * from public.meal_plan_rules where is_active order by display_order loop',
    'return v_result;'||chr(10)||' end if;'||chr(10)||' for v_plan',
    'v_total_meal:=v_total_meal+(guest_pricing_private.guest_type_meal_charge(v_plan.plan_code,v_target_rate,p_guest_counts)->>''total'')::numeric;',
    '''meal_guests'',v_all_guests,''meal_cost'',(guest_pricing_private.guest_type_meal_charge(v_plan.plan_code,v_target_rate,p_guest_counts)->>''total'')::numeric,',
    'v_meal:=(guest_pricing_private.guest_type_meal_charge(v_plan.plan_code,v_target_rate,p_guest_counts)->>''total'')::numeric;',
    '''guest_type_meals'',guest_pricing_private.guest_type_meal_charge(v_plan.plan_code,v_target_rate,p_guest_counts),',
    'v_legacy_night:=public.calculate_legacy_rate_night_context',
    'v_breakdown:=v_breakdown||jsonb_build_object(''date'',v_date,''pricing_status'',''preserved_policy_ep'',',
    'v_result:=v_result||(v_variant||jsonb_build_object(''pricing_status'',''legacy_basis_unverified'',',
    '''pricing_message'',''Date-specific policy retains existing EP calculation; current selected meals are added.'');'
  ];
  token text;
  v_charge constant text := 'meal_catalog_pricing_private.quote_target_meals(v_plan.plan_code,v_plan.meal_choice_groups,v_plan.supplement_effective_from,v_target_rate,p_guest_counts,v_date,v_preservation->>''preservation_mode'')';
BEGIN
  v_sql:=pg_get_functiondef('public.calculate_keyed_rate_variants_engine(uuid,date,date,uuid,integer,integer,integer,text,jsonb)'::regprocedure);
  FOREACH token IN ARRAY v_checks LOOP
    IF (length(v_sql)-length(replace(v_sql,token,'')))<>length(token) THEN
      RAISE EXCEPTION 'Keyed engine drift; staging patch was not applied (%).',left(token,40);
    END IF;
  END LOOP;
  -- The exact fallback exception preserves full-policy stays, while refusing
  -- paid options with an opaque meal amount for a new-age-priced family.
  v_sql:=replace(v_sql,'v_meal numeric; v_total_room','v_catalogue_meal jsonb; v_meal numeric; v_total_room');
  v_sql:=replace(v_sql,'for v_plan in select * from public.meal_plan_rules where is_active order by display_order loop',
    '<<plan_loop>> for v_plan in select * from public.meal_plan_rules where is_active order by display_order loop');
  v_sql:=replace(v_sql,'v_result:=v_result||(v_variant||jsonb_build_object(''pricing_status'',''legacy_basis_unverified'',',
    'IF NOT v_all_full_preservation AND meal_catalog_pricing_private.is_effective(p_check_out-1) AND meal_catalog_pricing_private.has_nonadult_guests(p_guest_counts) AND v_variant->>''meal_plan_code'' <> ''RO'' THEN CONTINUE; END IF; '||
    'v_result:=v_result||(v_variant||jsonb_build_object(''pricing_status'',''legacy_basis_unverified'',');
  v_sql:=replace(v_sql,'v_legacy_night:=public.calculate_legacy_rate_night_context',
    'IF meal_catalog_pricing_private.is_effective(v_date) AND meal_catalog_pricing_private.has_nonadult_guests(p_guest_counts) AND v_plan.plan_code<>''RO'' AND NOT coalesce(v_preservation->>''preservation_mode''=''full_pricing'',false) AND NOT coalesce(v_preservation->>''preservation_mode''=''ep_only'' AND (v_preservation->>''preserve_legacy_ep'')::boolean,false) THEN CONTINUE plan_loop; END IF; '||
    'v_legacy_night:=public.calculate_legacy_rate_night_context');
  v_sql:=replace(v_sql,'v_total_meal:=v_total_meal+(guest_pricing_private.guest_type_meal_charge(v_plan.plan_code,v_target_rate,p_guest_counts)->>''total'')::numeric;',
    'v_catalogue_meal:='||v_charge||'; IF v_catalogue_meal IS NULL THEN CONTINUE plan_loop; END IF; '||
    'v_total_meal:=v_total_meal+(v_catalogue_meal->>''total'')::numeric;');
  v_sql:=replace(v_sql,'''meal_guests'',v_all_guests,''meal_cost'',(guest_pricing_private.guest_type_meal_charge(v_plan.plan_code,v_target_rate,p_guest_counts)->>''total'')::numeric,',
    '''meal_guests'',v_all_guests,''meal_cost'',(v_catalogue_meal->>''total'')::numeric,');
  v_sql:=replace(v_sql,'v_breakdown:=v_breakdown||jsonb_build_object(''date'',v_date,''pricing_status'',''preserved_policy_ep'',',
    'v_breakdown:=v_breakdown||(jsonb_build_object(''date'',v_date,''pricing_status'',''preserved_policy_ep'',');
  v_sql:=replace(v_sql,'''pricing_message'',''Date-specific policy retains existing EP calculation; current selected meals are added.'');',
    '''pricing_message'',''Date-specific policy retains existing EP calculation; current selected meals are added.'')'||chr(10)||
    '|| CASE WHEN v_catalogue_meal ? ''catalogue_guest_price_revision'' THEN jsonb_build_object(''guest_type_meals'',v_catalogue_meal) ELSE ''{}''::jsonb END);');
  v_sql:=replace(v_sql,'v_meal:=(guest_pricing_private.guest_type_meal_charge(v_plan.plan_code,v_target_rate,p_guest_counts)->>''total'')::numeric;',
    'v_catalogue_meal:='||v_charge||'; IF v_catalogue_meal IS NULL THEN CONTINUE plan_loop; END IF; '||
    'v_meal:=(v_catalogue_meal->>''total'')::numeric;');
  v_sql:=replace(v_sql,'''guest_type_meals'',guest_pricing_private.guest_type_meal_charge(v_plan.plan_code,v_target_rate,p_guest_counts),',
    '''guest_type_meals'',v_catalogue_meal,');
  IF strpos(v_sql,'guest_pricing_private.guest_type_meal_charge(v_plan.plan_code,v_target_rate,p_guest_counts)')>0 THEN
    RAISE EXCEPTION 'Unexpected keyed meal charge call still present.';
  END IF;
  EXECUTE v_sql;
END;
$patch$;
COMMIT;
