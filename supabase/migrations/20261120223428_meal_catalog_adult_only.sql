-- Additive, with no adult-only rows set and no existing quotes changed.
SET LOCAL lock_timeout = '5s';

CREATE TABLE meal_catalog_pricing_private.adult_only_meals (
  meal_id uuid PRIMARY KEY,
  revision bigint NOT NULL CHECK (revision>0),
  effective_from date NOT NULL
);
ALTER TABLE meal_catalog_pricing_private.adult_only_meals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON meal_catalog_pricing_private.adult_only_meals FROM PUBLIC, anon, authenticated, service_role;

-- A private rule, not a zero-priced child/infant meal. Only the narrowly scoped
-- operator setup records this category; ordinary admin prices cannot clear it.
CREATE FUNCTION meal_catalog_pricing_private.prevent_adult_only_guest_prices()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NEW.prices <> '{}'::jsonb AND EXISTS (
    SELECT 1 FROM meal_catalog_pricing_private.adult_only_meals e WHERE e.meal_id=NEW.meal_id
  ) THEN
    RAISE EXCEPTION 'This meal is adults-only; Child and Under 4 are not eligible' USING ERRCODE='22023';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION meal_catalog_pricing_private.prevent_adult_only_guest_prices() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER prevent_adult_only_guest_prices
BEFORE INSERT ON meal_catalog_pricing_private.meal_guest_price_versions FOR EACH ROW
EXECUTE FUNCTION meal_catalog_pricing_private.prevent_adult_only_guest_prices();

CREATE OR REPLACE FUNCTION meal_catalog_pricing_private.catalogue_guest_prices()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_policy jsonb;
  v_saved jsonb;
  v_revision bigint;
  v_adult_only jsonb;
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
    WHERE NOT EXISTS (SELECT 1 FROM meal_catalog_pricing_private.adult_only_meals e WHERE e.meal_id=v.meal_id)
    ORDER BY v.meal_id, v.revision DESC
  ) latest
  WHERE latest.prices <> '{}'::jsonb;
  SELECT coalesce(jsonb_agg(e.meal_id ORDER BY e.meal_id),'[]'::jsonb) INTO v_adult_only
  FROM meal_catalog_pricing_private.adult_only_meals e JOIN public.meals m ON m.id=e.meal_id;
  -- Keep the original shape when nothing is restricted.
  RETURN jsonb_build_object('revision',v_revision,'guest_policy_revision',(v_policy->>'revision')::bigint,'prices',v_saved)
    || CASE WHEN v_adult_only='[]'::jsonb THEN '{}'::jsonb ELSE jsonb_build_object('adult_only_meal_ids',v_adult_only) END;
END;
$$;

CREATE FUNCTION meal_catalog_pricing_private.has_adult_only_plan_choice(p_groups jsonb,p_night date,p_max_revision bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT EXISTS (
   SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_groups)='array' THEN p_groups ELSE '[]'::jsonb END) g
   CROSS JOIN LATERAL jsonb_array_elements_text(CASE WHEN jsonb_typeof(g->'meal_ids')='array' THEN g->'meal_ids' ELSE '[]'::jsonb END) m(meal_id)
   JOIN meal_catalog_pricing_private.adult_only_meals e ON e.meal_id::text=lower(m.meal_id)
   WHERE e.effective_from<=p_night AND e.revision<=p_max_revision
 )
$$;
REVOKE ALL ON FUNCTION meal_catalog_pricing_private.has_adult_only_plan_choice(jsonb,date,bigint) FROM PUBLIC,anon,authenticated,service_role;
