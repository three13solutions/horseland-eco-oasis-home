ALTER FUNCTION public.set_guest_type_policy_status(integer,jsonb,boolean) SECURITY INVOKER;
CREATE OR REPLACE FUNCTION public.sync_guest_type_charge_inputs() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE entry record; row_data jsonb:=to_jsonb(NEW); adult_amount numeric; column_name text; amount numeric;
BEGIN
 IF jsonb_typeof(NEW.guest_type_charges) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Guest type charges must be an object'; END IF;
 adult_amount:=(row_data->>CASE WHEN TG_TABLE_NAME='rate_plan_anchors' THEN 'extra_adult_per_night' ELSE 'extra_adult_charge' END)::numeric;
 FOR entry IN SELECT key,value FROM jsonb_each(NEW.guest_type_charges) LOOP
  IF entry.key !~ '^[a-z][a-z0-9_]*$' OR jsonb_typeof(entry.value) IS DISTINCT FROM 'object' OR coalesce(entry.value->>'mode','') NOT IN ('fixed','same_as_adult') THEN RAISE EXCEPTION 'Invalid guest type charge'; END IF;
  IF entry.value->>'mode'='same_as_adult' THEN
   IF entry.key='adult' THEN RAISE EXCEPTION 'Adult rate cannot refer to itself'; END IF;
   amount:=adult_amount;
  ELSE
   IF jsonb_typeof(entry.value->'amount') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Enter a guest type amount'; END IF;
   amount:=(entry.value->>'amount')::numeric;
   IF amount<0 OR amount::text IN ('NaN','Infinity','-Infinity') OR round(amount,2)<>amount THEN RAISE EXCEPTION 'Enter a non-negative rate with up to two decimal places'; END IF;
  END IF;
  IF entry.key IN ('child','infant') THEN
   column_name:=CASE WHEN TG_TABLE_NAME='rate_plan_anchors' THEN 'extra_'||entry.key||'_per_night' ELSE 'extra_'||entry.key||'_charge' END;
   row_data:=jsonb_set(row_data,ARRAY[column_name],coalesce(to_jsonb(amount),'null'::jsonb));
  END IF;
 END LOOP;
 NEW:=jsonb_populate_record(NEW,row_data); RETURN NEW;
END $$;