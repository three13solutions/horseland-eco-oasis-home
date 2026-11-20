-- Additive catalogue pricing; no seeding of existing meal prices, no quote changes,
-- no release activation. Adult prices keep the existing reviewed workflow.
SET LOCAL lock_timeout = '5s';

CREATE SCHEMA meal_catalog_pricing_private;
REVOKE ALL ON SCHEMA meal_catalog_pricing_private FROM PUBLIC, anon, authenticated;

CREATE TABLE meal_catalog_pricing_private.state (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  revision bigint NOT NULL DEFAULT 0 CHECK (revision BETWEEN 0 AND 9007199254740991)
);
INSERT INTO meal_catalog_pricing_private.state DEFAULT VALUES;

-- Append-only. The UUID is intentionally not a cascading FK: catalog rows can
-- be retired/deleted, but an already recorded price version remains evidence.
CREATE TABLE meal_catalog_pricing_private.meal_guest_price_versions (
  meal_id uuid NOT NULL,
  revision bigint NOT NULL CHECK (revision > 0),
  effective_from date NOT NULL,
  prices jsonb NOT NULL CHECK (jsonb_typeof(prices) = 'object'),
  recorded_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  recorded_by uuid NOT NULL,
  PRIMARY KEY (meal_id, revision)
);
CREATE INDEX meal_guest_price_versions_effective_idx
  ON meal_catalog_pricing_private.meal_guest_price_versions (meal_id, effective_from DESC, revision DESC);

ALTER TABLE meal_catalog_pricing_private.state ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_catalog_pricing_private.meal_guest_price_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA meal_catalog_pricing_private FROM PUBLIC, anon, authenticated;

CREATE FUNCTION meal_catalog_pricing_private.assert_admin()
RETURNS void LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.is_admin_new(), false) THEN
    RAISE EXCEPTION 'Administrator required' USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE FUNCTION meal_catalog_pricing_private.catalogue_guest_prices()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_policy jsonb;
  v_saved jsonb;
  v_revision bigint;
BEGIN
  PERFORM meal_catalog_pricing_private.assert_admin();
  v_policy := public.get_guest_age_policy();
  IF jsonb_typeof(v_policy->'bands') IS DISTINCT FROM 'array' OR (v_policy->>'revision') IS NULL THEN
    RAISE EXCEPTION 'GUEST_AGE_POLICY_UNAVAILABLE';
  END IF;
  SELECT revision INTO STRICT v_revision FROM meal_catalog_pricing_private.state WHERE id;
  SELECT coalesce(jsonb_object_agg(latest.meal_id, latest.prices), '{}'::jsonb)
  INTO v_saved
  FROM (
    SELECT DISTINCT ON (v.meal_id) v.meal_id, v.prices
    FROM meal_catalog_pricing_private.meal_guest_price_versions v
    JOIN public.meals m ON m.id = v.meal_id
    ORDER BY v.meal_id, v.revision DESC
  ) latest
  WHERE latest.prices <> '{}'::jsonb;
  RETURN jsonb_build_object(
    'revision', v_revision,
    'guest_policy_revision', (v_policy->>'revision')::bigint,
    'prices', v_saved
  );
END;
$$;

CREATE FUNCTION meal_catalog_pricing_private.save_catalogue_guest_prices(
  p_meal_id uuid, p_prices jsonb, p_expected_revision bigint, p_expected_guest_policy_revision bigint
)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_policy jsonb;
  v_revision bigint;
  v_allowed text[];
  v_previous jsonb;
  v_next jsonb;
  v_key text;
  v_value jsonb;
  v_amount numeric;
BEGIN
  PERFORM meal_catalog_pricing_private.assert_admin();
  IF p_meal_id IS NULL OR jsonb_typeof(p_prices) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'MEAL_GUEST_PRICES_INVALID: expected one meal and a price map' USING ERRCODE = '22023';
  END IF;

  -- Same policy advisory lock used by the existing age-policy save API, then
  -- serialize this catalogue's own optimistic revision. No adult rows are updated.
  PERFORM pg_advisory_xact_lock(hashtext('guest_age_policy_versions'));
  v_policy := public.get_guest_age_policy();
  IF jsonb_typeof(v_policy->'bands') IS DISTINCT FROM 'array' OR (v_policy->>'revision') IS NULL THEN
    RAISE EXCEPTION 'GUEST_AGE_POLICY_UNAVAILABLE';
  END IF;
  IF (v_policy->>'revision')::bigint IS DISTINCT FROM p_expected_guest_policy_revision THEN
    RAISE EXCEPTION 'GUEST_AGE_POLICY_CHANGED: reload available guest types before saving' USING ERRCODE = '40001';
  END IF;
  SELECT revision INTO STRICT v_revision FROM meal_catalog_pricing_private.state WHERE id FOR UPDATE;
  IF v_revision IS DISTINCT FROM p_expected_revision THEN
    RAISE EXCEPTION 'MEAL_GUEST_PRICING_CHANGED: reload the catalogue prices before saving' USING ERRCODE = '40001';
  END IF;
  PERFORM 1 FROM public.meals m WHERE m.id = p_meal_id FOR KEY SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'MEAL_NOT_FOUND: reload the meal catalogue' USING ERRCODE = '22023';
  END IF;

  SELECT coalesce(array_agg(b->>'key'), ARRAY[]::text[]) INTO v_allowed
  FROM jsonb_array_elements(v_policy->'bands') b
  WHERE b->>'key' <> 'adult' AND b->>'meal_rule' = 'full'
    AND coalesce((b->>'enabled')::boolean, true);

  FOR v_key, v_value IN SELECT key, value FROM jsonb_each(p_prices) LOOP
    IF NOT (v_key = ANY(v_allowed)) OR jsonb_typeof(v_value) IS DISTINCT FROM 'number' THEN
      RAISE EXCEPTION 'MEAL_GUEST_PRICES_INVALID: invalid price for guest type %', v_key USING ERRCODE = '22023';
    END IF;
    v_amount := v_value::text::numeric;
    IF v_amount < 0 OR v_amount > 99999999.99 OR v_amount <> round(v_amount, 2) THEN
      RAISE EXCEPTION 'MEAL_GUEST_PRICES_INVALID: enter a non-negative INR amount with at most two decimal places' USING ERRCODE = '22023';
    END IF;
  END LOOP;

  SELECT prices INTO v_previous
  FROM meal_catalog_pricing_private.meal_guest_price_versions
  WHERE meal_id = p_meal_id ORDER BY revision DESC LIMIT 1;
  v_previous := coalesce(v_previous, '{}'::jsonb);
  -- Complete replacement for editable keys only. Preserve inactive/free policy
  -- keys for historical use; their stored values do not override forced free.
  v_next := (v_previous - v_allowed) || p_prices;
  IF v_next IS DISTINCT FROM v_previous THEN
    UPDATE meal_catalog_pricing_private.state SET revision = v_revision + 1 WHERE id;
    INSERT INTO meal_catalog_pricing_private.meal_guest_price_versions
      (meal_id, revision, effective_from, prices, recorded_by)
    VALUES (p_meal_id, v_revision + 1, (transaction_timestamp() AT TIME ZONE 'Asia/Kolkata')::date, v_next, auth.uid());
  END IF;
  RETURN meal_catalog_pricing_private.catalogue_guest_prices();
END;
$$;

CREATE FUNCTION public.get_meal_guest_prices()
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT meal_catalog_pricing_private.catalogue_guest_prices();
$$;

CREATE FUNCTION public.save_meal_guest_prices(
  p_meal_id uuid, p_prices jsonb, p_expected_revision bigint, p_expected_guest_policy_revision bigint
)
RETURNS jsonb LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = '' AS $$
  SELECT meal_catalog_pricing_private.save_catalogue_guest_prices(
    p_meal_id, p_prices, p_expected_revision, p_expected_guest_policy_revision
  );
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA meal_catalog_pricing_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA meal_catalog_pricing_private TO authenticated;
GRANT EXECUTE ON FUNCTION meal_catalog_pricing_private.catalogue_guest_prices() TO authenticated;
GRANT EXECUTE ON FUNCTION meal_catalog_pricing_private.save_catalogue_guest_prices(uuid,jsonb,bigint,bigint) TO authenticated;
REVOKE ALL ON FUNCTION public.get_meal_guest_prices() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_meal_guest_prices(uuid,jsonb,bigint,bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_meal_guest_prices() TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_meal_guest_prices(uuid,jsonb,bigint,bigint) TO authenticated;

-- Inputs are the exact linked meal IDs, never title/variant guesses. Each
-- group contributes once; all its OR choices must have the same amount.
-- NULL means no safe price can be derived. Explicit 0 is a configured rate.
CREATE FUNCTION meal_catalog_pricing_private.resolve_plan_unit_price(
  p_groups jsonb, p_guest_key text, p_night date, p_max_revision bigint DEFAULT NULL
)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_group jsonb;
  v_ids jsonb;
  v_id_text text;
  v_seen_ids uuid[] := ARRAY[]::uuid[];
  v_id uuid;
  v_price numeric;
  v_min numeric;
  v_max numeric;
  v_total numeric := 0;
BEGIN
  IF p_night IS NULL OR p_guest_key IS NULL OR jsonb_typeof(p_groups) IS DISTINCT FROM 'array' THEN
    RETURN NULL;
  END IF;
  FOR v_group IN SELECT value FROM jsonb_array_elements(p_groups) LOOP
    v_ids := v_group->'meal_ids';
    IF jsonb_typeof(v_ids) IS DISTINCT FROM 'array' OR jsonb_array_length(v_ids) = 0 THEN
      RETURN NULL;
    END IF;
    v_min := NULL;
    v_max := NULL;
    FOR v_id_text IN SELECT value FROM jsonb_array_elements_text(v_ids) LOOP
      IF coalesce(v_id_text, '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RETURN NULL;
      END IF;
      v_id := v_id_text::uuid;
      IF v_id = ANY(v_seen_ids) THEN RETURN NULL; END IF;
      v_seen_ids := array_append(v_seen_ids, v_id);
      IF p_guest_key = 'adult' THEN
        SELECT m.price INTO v_price FROM public.meals m WHERE m.id = v_id AND m.is_active;
      ELSE
        SELECT (v.prices->>p_guest_key)::numeric INTO v_price
        FROM meal_catalog_pricing_private.meal_guest_price_versions v
        JOIN public.meals m ON m.id = v.meal_id AND m.is_active
        WHERE v.meal_id = v_id AND v.effective_from <= p_night
          AND (p_max_revision IS NULL OR v.revision <= p_max_revision)
        ORDER BY v.effective_from DESC, v.revision DESC LIMIT 1;
      END IF;
      IF v_price IS NULL OR v_price < 0 OR v_price > 99999999.99 OR v_price <> round(v_price, 2) THEN
        RETURN NULL;
      END IF;
      v_min := least(v_min, v_price);
      v_max := greatest(v_max, v_price);
    END LOOP;
    IF v_min IS DISTINCT FROM v_max THEN RETURN NULL; END IF;
    v_total := v_total + v_min;
  END LOOP;
  RETURN v_total;
END;
$$;
REVOKE ALL ON FUNCTION meal_catalog_pricing_private.resolve_plan_unit_price(jsonb,text,date,bigint) FROM PUBLIC, anon, authenticated;
