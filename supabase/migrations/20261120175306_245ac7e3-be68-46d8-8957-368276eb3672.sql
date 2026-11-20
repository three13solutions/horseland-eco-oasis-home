DO $$ DECLARE d text; BEGIN
 SELECT pg_get_functiondef('public.validate_guest_age_bands(jsonb)'::regprocedure) INTO d;
 d:=replace(d, 'SELECT 1 FROM jsonb_array_elements(p_bands) b GROUP BY b->>''key'' HAVING count(*)>1', 'SELECT 1 FROM jsonb_array_elements(p_bands) AS item(value) GROUP BY item.value->>''key'' HAVING count(*)>1');
 EXECUTE d;
 SELECT pg_get_functiondef('public.validate_meal_age_pricing_rules(jsonb)'::regprocedure) INTO d;
 d:=replace(d, 'SELECT 1 FROM jsonb_array_elements(p_rules) r GROUP BY r->>''plan_code'',r->>''band_key'' HAVING count(*)>1', 'SELECT 1 FROM jsonb_array_elements(p_rules) AS item(value) GROUP BY item.value->>''plan_code'',item.value->>''band_key'' HAVING count(*)>1');
 EXECUTE d;
END $$;