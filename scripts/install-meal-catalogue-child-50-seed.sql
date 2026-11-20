-- OPERATOR/STAGING ONLY. Install after both additive catalogue migrations.
-- Installs a private function and receipt, but does not assign any price.
-- Use the exact reviewed Adults/active-state snapshot, both revisions, and two disjoint UUID lists.
BEGIN;
SET LOCAL lock_timeout = '5s';

-- Keep historical v1 receipts but remove the superseded blanket operator endpoint.
DROP FUNCTION IF EXISTS meal_catalog_pricing_private.seed_child_50_percent(bigint,bigint,jsonb);
CREATE TABLE IF NOT EXISTS meal_catalog_pricing_private.buffet_seed_runs (
  operation text PRIMARY KEY CHECK (operation='buffet-child-50-percent-v2'),
  expected_catalogue_revision bigint NOT NULL,
  expected_guest_policy_revision bigint NOT NULL,
  adult_snapshot jsonb NOT NULL,
  buffet_ids uuid[] NOT NULL,
  adult_only_ids uuid[] NOT NULL,
  receipt jsonb NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  recorded_by_role name NOT NULL
);
ALTER TABLE meal_catalog_pricing_private.buffet_seed_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON meal_catalog_pricing_private.buffet_seed_runs FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION meal_catalog_pricing_private.seed_buffet_child_50_percent(
  p_expected_revision bigint, p_expected_guest_policy_revision bigint, p_expected_adult_snapshot jsonb,
  p_buffet_ids uuid[], p_adult_only_ids uuid[]
)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_policy jsonb;
  v_snapshot jsonb;
  v_previous meal_catalog_pricing_private.buffet_seed_runs%ROWTYPE;
  v_revision bigint;
  v_matched int;
  v_changed int;
  v_eligibility_changed int;
  v_buffet uuid[];
  v_adult_only uuid[];
  v_effective date := (transaction_timestamp() AT TIME ZONE 'Asia/Kolkata')::date;
  v_receipt jsonb;
  v_child_matches int;
  v_infant_matches int;
BEGIN
  IF p_expected_revision IS NULL OR p_expected_guest_policy_revision IS NULL
      OR jsonb_typeof(p_expected_adult_snapshot) IS DISTINCT FROM 'object'
      OR p_expected_adult_snapshot='{}'::jsonb THEN
    RAISE EXCEPTION 'Expected both revisions and a nonempty reviewed meal snapshot' USING ERRCODE='22023';
  END IF;
  SELECT array_agg(x ORDER BY x) INTO v_buffet FROM unnest(p_buffet_ids) t(x);
  SELECT array_agg(x ORDER BY x) INTO v_adult_only FROM unnest(p_adult_only_ids) t(x);
  IF cardinality(v_buffet) IS DISTINCT FROM 12 OR cardinality(v_adult_only) IS DISTINCT FROM 3
    OR (SELECT count(DISTINCT x) FROM unnest(v_buffet||v_adult_only) t(x))<>15 THEN
    RAISE EXCEPTION 'Expected 12 distinct buffet IDs and 3 distinct adults-only IDs' USING ERRCODE='22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('guest_age_policy_versions'));
  SELECT revision INTO STRICT v_revision FROM meal_catalog_pricing_private.state WHERE id FOR UPDATE;
  SELECT * INTO v_previous FROM meal_catalog_pricing_private.buffet_seed_runs WHERE operation='buffet-child-50-percent-v2';
  IF FOUND THEN
    IF v_previous.expected_catalogue_revision IS DISTINCT FROM p_expected_revision
       OR v_previous.expected_guest_policy_revision IS DISTINCT FROM p_expected_guest_policy_revision
       OR v_previous.adult_snapshot IS DISTINCT FROM p_expected_adult_snapshot
       OR v_previous.buffet_ids IS DISTINCT FROM v_buffet OR v_previous.adult_only_ids IS DISTINCT FROM v_adult_only THEN
      RAISE EXCEPTION 'The one-time Child seed already ran for a different reviewed snapshot' USING ERRCODE='22023';
    END IF;
    RETURN v_previous.receipt || jsonb_build_object('already_applied',true);
  END IF;
  v_policy := public.get_guest_age_policy();
  IF jsonb_typeof(v_policy->'bands') IS DISTINCT FROM 'array'
     OR (v_policy->>'revision')::bigint IS DISTINCT FROM p_expected_guest_policy_revision
     OR v_revision IS DISTINCT FROM p_expected_revision THEN
    RAISE EXCEPTION 'Meal catalogue or guest policy changed; review again before seeding' USING ERRCODE='40001';
  END IF;
  SELECT count(*) FILTER (WHERE j->>'key'='child' AND j->>'meal_rule'='full' AND j->>'min_age'='4' AND j->>'max_age'='9'),
         count(*) FILTER (WHERE j->>'key'='infant' AND j->>'meal_rule'='free' AND j->>'min_age'='0' AND j->>'max_age'='3')
  INTO v_child_matches,v_infant_matches
  FROM jsonb_array_elements(v_policy->'bands') j WHERE coalesce((j->>'enabled')::boolean,true);
  IF v_child_matches<>1 OR v_infant_matches<>1 THEN
    RAISE EXCEPTION 'Expected enabled 4–9 Child paid and Under 4 free bands; no amounts assigned' USING ERRCODE='22023';
  END IF;

  -- Lock Adult catalogue writes (not reads/quotes) during the bounded operation.
  LOCK TABLE public.meals IN SHARE MODE;
  SELECT count(*), coalesce(jsonb_object_agg(id,jsonb_build_object('adult',price,'active',is_active)),'{}'::jsonb)
    INTO v_matched,v_snapshot FROM public.meals;
  IF v_snapshot IS DISTINCT FROM p_expected_adult_snapshot
     OR EXISTS (SELECT 1 FROM public.meals WHERE price IS NULL OR price < 0 OR price > 99999999.99
       OR price<>round(price,2) OR is_active IS NULL) THEN
    RAISE EXCEPTION 'Reviewed Adult catalogue no longer matches (IDs, prices and activation); no amounts assigned' USING ERRCODE='40001';
  END IF;

  IF v_matched<>15 OR EXISTS (SELECT 1 FROM public.meals WHERE NOT(id=ANY(v_buffet||v_adult_only)))
    OR EXISTS (SELECT 1 FROM public.meals WHERE id=ANY(v_adult_only) AND is_active)
    OR EXISTS (SELECT 1 FROM meal_catalog_pricing_private.adult_only_meals WHERE NOT(meal_id=ANY(v_adult_only))) THEN
    RAISE EXCEPTION 'Reviewed groups no longer match the exact catalogue or adults-only meals are not all inactive' USING ERRCODE='40001';
  END IF;

  INSERT INTO meal_catalog_pricing_private.adult_only_meals (meal_id,revision,effective_from)
  SELECT id,v_revision+1,v_effective FROM unnest(v_adult_only) x(id) ON CONFLICT (meal_id) DO NOTHING;
  GET DIAGNOSTICS v_eligibility_changed = ROW_COUNT;

  WITH draft_changes AS (
    SELECT m.id, coalesce(v.prices,'{}'::jsonb) AS prior,
           CASE WHEN m.id=ANY(v_buffet) THEN coalesce(v.prices,'{}'::jsonb)||jsonb_build_object('child',round(m.price * 0.50,2))
                ELSE '{}'::jsonb END AS next_prices
    FROM public.meals m LEFT JOIN LATERAL (
      SELECT prices FROM meal_catalog_pricing_private.meal_guest_price_versions v
      WHERE v.meal_id=m.id ORDER BY revision DESC LIMIT 1
    ) v ON true
  )
  INSERT INTO meal_catalog_pricing_private.meal_guest_price_versions
    (meal_id,revision,effective_from,prices,recorded_by)
  SELECT id,v_revision+1,v_effective,next_prices,'00000000-0000-0000-0000-000000000000'::uuid
    FROM draft_changes WHERE (next_prices) IS DISTINCT FROM prior;
  GET DIAGNOSTICS v_changed = ROW_COUNT;
  IF v_changed>0 OR v_eligibility_changed>0 THEN
    v_revision:=v_revision+1;
    UPDATE meal_catalog_pricing_private.state SET revision=v_revision WHERE id;
  END IF;
  v_receipt:=jsonb_build_object('catalogue_revision',v_revision,'guest_policy_revision',p_expected_guest_policy_revision,
    'rows_matched',v_matched,'rows_updated',v_changed,'adults_only_rows_marked',v_eligibility_changed,'effective_from',v_effective,'already_applied',false);
  INSERT INTO meal_catalog_pricing_private.buffet_seed_runs VALUES
    ('buffet-child-50-percent-v2',p_expected_revision,p_expected_guest_policy_revision,p_expected_adult_snapshot,v_buffet,v_adult_only,
     v_receipt,transaction_timestamp(),session_user);
  RETURN v_receipt;
END;
$$;
REVOKE ALL ON FUNCTION meal_catalog_pricing_private.seed_buffet_child_50_percent(bigint,bigint,jsonb,uuid[],uuid[])
FROM PUBLIC, anon, authenticated, service_role;
COMMIT;
