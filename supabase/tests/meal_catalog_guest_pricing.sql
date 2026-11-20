-- Designed for an isolated fixture, not production. See local pg test runner.
DO $test$
DECLARE
  m1 constant uuid := '23c807e0-f881-4fe6-abfd-0a98506c8cda';
  m2 constant uuid := '23c807e0-f881-4fe6-abfd-0a98506c8cdb';
  m3 constant uuid := '23c807e0-f881-4fe6-abfd-0a98506c8cdc';
  g jsonb;
  t date := (transaction_timestamp() AT TIME ZONE 'Asia/Kolkata')::date;
  r jsonb;
BEGIN
  g := jsonb_build_array(jsonb_build_object('meal_ids',jsonb_build_array(m1)), jsonb_build_object('meal_ids',jsonb_build_array(m2,m3)));
  r := public.get_meal_guest_prices();
  IF r IS DISTINCT FROM '{"revision":0,"guest_policy_revision":1,"prices":{}}'::jsonb THEN RAISE EXCEPTION 'nonempty migration'; END IF;
  r := public.save_meal_guest_prices(m1,'{"child":135}',0,1);
  IF (r->>'revision') <> '1' OR (r->'prices'->m1::text->>'child')::numeric <> 135 THEN RAISE EXCEPTION 'save/response'; END IF;
  BEGIN PERFORM public.save_meal_guest_prices(m1,'{"child":20}',0,1); RAISE EXCEPTION 'accepted stale revision'; EXCEPTION WHEN serialization_failure THEN NULL; END;
  BEGIN PERFORM public.save_meal_guest_prices(m1,'{"child":20}',1,0); RAISE EXCEPTION 'accepted stale age revision'; EXCEPTION WHEN serialization_failure THEN NULL; END;
  BEGIN PERFORM public.save_meal_guest_prices(m1,'{"infant":1}',1,1); RAISE EXCEPTION 'accepted free guest edit'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.save_meal_guest_prices(m1,'{"adult":1}',1,1); RAISE EXCEPTION 'accepted adult edit'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.save_meal_guest_prices(m1,'{"child":1.001}',1,1); RAISE EXCEPTION 'accepted invalid decimal'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.save_meal_guest_prices(m1,'{"child":null}',1,1); RAISE EXCEPTION 'accepted null'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.save_meal_guest_prices(m1,'{"child":-1}',1,1); RAISE EXCEPTION 'accepted negative'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.save_meal_guest_prices(m1,'{"child":"1"}',1,1); RAISE EXCEPTION 'accepted string'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  PERFORM public.save_meal_guest_prices(m2,'{"child":325}',1,1);
  IF meal_catalog_pricing_private.resolve_plan_unit_price(g,'child',t) IS NOT NULL THEN RAISE EXCEPTION 'missing variant guessed'; END IF;
  PERFORM public.save_meal_guest_prices(m3,'{"child":350}',2,1);
  IF meal_catalog_pricing_private.resolve_plan_unit_price(g,'child',t) IS NOT NULL THEN RAISE EXCEPTION 'unequal OR picked one'; END IF;
  PERFORM public.save_meal_guest_prices(m3,'{"child":325}',3,1);
  IF meal_catalog_pricing_private.resolve_plan_unit_price(g,'child',t) IS DISTINCT FROM 460::numeric THEN RAISE EXCEPTION 'child AND/OR total'; END IF;
  IF meal_catalog_pricing_private.resolve_plan_unit_price(g,'adult',t) IS DISTINCT FROM 920::numeric THEN RAISE EXCEPTION 'adult AND/OR total'; END IF;
  IF meal_catalog_pricing_private.resolve_plan_unit_price(g,'child',t-1) IS NOT NULL THEN RAISE EXCEPTION 'backdated guest price'; END IF;
  PERFORM public.save_meal_guest_prices(m1,'{"child":0}',4,1);
  IF meal_catalog_pricing_private.resolve_plan_unit_price(g,'child',t) IS DISTINCT FROM 325::numeric THEN RAISE EXCEPTION 'explicit zero not treated as price'; END IF;
  PERFORM public.save_meal_guest_prices(m1,'{}',5,1);
  IF meal_catalog_pricing_private.resolve_plan_unit_price(g,'child',t) IS NOT NULL THEN RAISE EXCEPTION 'omitted price not cleared'; END IF;
  IF (SELECT price FROM public.meals WHERE id=m1) IS DISTINCT FROM 270::numeric THEN RAISE EXCEPTION 'adult overwritten'; END IF;
  UPDATE public.meals SET is_active=false WHERE id=m3;
  IF meal_catalog_pricing_private.resolve_plan_unit_price(g,'adult',t) IS NOT NULL THEN RAISE EXCEPTION 'inactive linked variant accepted'; END IF;
  IF (SELECT count(*) FROM meal_catalog_pricing_private.meal_guest_price_versions WHERE meal_id=m1) <> 3 THEN RAISE EXCEPTION 'price history not retained'; END IF;
END
$test$;
