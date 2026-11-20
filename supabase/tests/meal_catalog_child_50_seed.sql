-- Standalone verification on isolated fixtures; restores original data.
BEGIN;
DO $test$
DECLARE
  m1 constant uuid := '23c807e0-f881-4fe6-abfd-0a98506c8cda';
  m2 constant uuid := '23c807e0-f881-4fe6-abfd-0a98506c8cdb';
  m3 constant uuid := '23c807e0-f881-4fe6-abfd-0a98506c8cdc';
  snapshot jsonb;
  buffets uuid[];
  adults_only uuid[];
  candle constant uuid := '43c807e0-f881-4fe6-abfd-000000000010';
  receipt jsonb;
  base_revision bigint;
  saved jsonb;
BEGIN
  UPDATE public.meals SET price=270.01 WHERE id=m1;
  UPDATE public.meals SET price=0 WHERE id=m2;
  SELECT revision INTO STRICT base_revision FROM meal_catalog_pricing_private.state WHERE id;
  PERFORM public.save_meal_guest_prices(candle,'{"child":1250}',base_revision,1);
  base_revision:=base_revision+1;
  SELECT array_agg(id) FILTER (WHERE price<2500),array_agg(id) FILTER (WHERE price=2500)
  INTO buffets,adults_only FROM public.meals;
  SELECT jsonb_object_agg(id,jsonb_build_object('adult',price,'active',is_active)) INTO snapshot FROM public.meals;
  BEGIN
    PERFORM meal_catalog_pricing_private.seed_buffet_child_50_percent(base_revision-1,1,snapshot,buffets,adults_only);
    RAISE EXCEPTION 'accepted stale catalogue revision';
  EXCEPTION WHEN serialization_failure THEN NULL; END;
  BEGIN
    PERFORM meal_catalog_pricing_private.seed_buffet_child_50_percent(base_revision,2,snapshot,buffets,adults_only);
    RAISE EXCEPTION 'accepted stale policy revision';
  EXCEPTION WHEN serialization_failure THEN NULL; END;
  BEGIN
    PERFORM meal_catalog_pricing_private.seed_buffet_child_50_percent(base_revision,1,snapshot-m3::text,buffets,adults_only);
    RAISE EXCEPTION 'accepted missing variant from snapshot';
  EXCEPTION WHEN serialization_failure THEN NULL; END;
  BEGIN
    PERFORM meal_catalog_pricing_private.seed_buffet_child_50_percent(base_revision,1,jsonb_set(snapshot,ARRAY[m1::text,'adult'],'270.02'),buffets,adults_only);
    RAISE EXCEPTION 'accepted mismatched Adult price';
  EXCEPTION WHEN serialization_failure THEN NULL; END;
  IF (SELECT revision FROM meal_catalog_pricing_private.state WHERE id) <> base_revision
      OR EXISTS (SELECT 1 FROM meal_catalog_pricing_private.buffet_seed_runs) THEN RAISE EXCEPTION 'partial write'; END IF;
  receipt:=meal_catalog_pricing_private.seed_buffet_child_50_percent(base_revision,1,snapshot,buffets,adults_only);
  saved:=public.get_meal_guest_prices()->'prices';
  IF (receipt->>'rows_matched')::integer IS DISTINCT FROM 15 OR (receipt->>'rows_updated')::integer IS DISTINCT FROM 12
      OR (receipt->>'adults_only_rows_marked')::integer IS DISTINCT FROM 3
      OR (receipt->>'catalogue_revision')::bigint IS DISTINCT FROM base_revision+1
      OR (saved->m1::text->>'child')::numeric IS DISTINCT FROM 135.01::numeric
      OR (saved->m2::text->>'child')::numeric IS DISTINCT FROM 0::numeric
      OR (saved->m3::text->>'child')::numeric IS DISTINCT FROM 325::numeric
      OR (saved ? candle::text)
      OR NOT (public.get_meal_guest_prices()->'adult_only_meal_ids' ? candle::text)
      OR NOT EXISTS (SELECT 1 FROM meal_catalog_pricing_private.meal_guest_price_versions WHERE meal_id=candle AND revision=base_revision AND prices='{"child":1250}')
      OR (saved->m1::text?'infant') OR (saved->m2::text?'infant') OR (saved->m3::text?'infant')
      OR (SELECT jsonb_object_agg(id,jsonb_build_object('adult',price,'active',is_active)) FROM public.meals) IS DISTINCT FROM snapshot
      OR EXISTS (SELECT 1 FROM meal_catalog_pricing_private.meal_guest_price_versions WHERE revision=base_revision+1
          AND recorded_by<>'00000000-0000-0000-0000-000000000000'::uuid) THEN
    RAISE EXCEPTION 'seed result: % / %',receipt,saved;
  END IF;
  IF (meal_catalog_pricing_private.seed_buffet_child_50_percent(base_revision,1,snapshot,buffets,adults_only)->>'already_applied') IS DISTINCT FROM 'true'
      THEN RAISE EXCEPTION 'seed retry not idempotent'; END IF;
  BEGIN
    PERFORM public.save_meal_guest_prices(candle,'{"child":1}',base_revision+1,1);
    RAISE EXCEPTION 'restricted admin save accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  PERFORM public.save_meal_guest_prices(m1,'{"child":199}',base_revision+1,1);
  PERFORM meal_catalog_pricing_private.seed_buffet_child_50_percent(base_revision,1,snapshot,buffets,adults_only);
  IF (public.get_meal_guest_prices()->'prices'->m1::text->>'child')::numeric IS DISTINCT FROM 199::numeric THEN
    RAISE EXCEPTION 'retry overwrote subsequent admin edit';
  END IF;
  BEGIN
    PERFORM meal_catalog_pricing_private.seed_buffet_child_50_percent(base_revision+2,1,snapshot,buffets,adults_only);
    RAISE EXCEPTION 'accepted another seed for a different operation input';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END;
$test$;
ROLLBACK;
