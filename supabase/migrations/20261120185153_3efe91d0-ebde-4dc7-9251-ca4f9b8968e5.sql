CREATE TABLE public.guest_type_pricing_release (id boolean PRIMARY KEY DEFAULT true, enabled boolean NOT NULL DEFAULT false, frontend_release text, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.guest_type_pricing_release TO anon,authenticated;
GRANT ALL ON public.guest_type_pricing_release TO service_role;
ALTER TABLE public.guest_type_pricing_release ENABLE ROW LEVEL SECURITY;
CREATE POLICY guest_type_release_read ON public.guest_type_pricing_release FOR SELECT TO anon,authenticated USING(true);
INSERT INTO public.guest_type_pricing_release(id,enabled) VALUES(true,false);
CREATE TRIGGER zz_activity_log AFTER INSERT OR UPDATE OR DELETE ON public.guest_type_pricing_release FOR EACH ROW EXECUTE FUNCTION public.record_activity_log();
CREATE FUNCTION public.get_booking_guest_policy() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE p jsonb; ready boolean;
BEGIN
 p:=public.get_guest_age_policy();
 SELECT enabled AND frontend_release='keyed-guest-v1' INTO ready FROM public.guest_type_pricing_release WHERE id;
 IF NOT coalesce(ready,false) THEN
  p:=p||jsonb_build_object('bands','[{"key":"infant","min_age":0,"max_age":3,"accommodation_rule":"free","meal_rule":"free"},{"key":"child","min_age":4,"max_age":9,"accommodation_rule":"child","meal_rule":"full"},{"key":"adult","min_age":10,"max_age":null,"accommodation_rule":"adult","meal_rule":"full"}]'::jsonb);
 END IF;
 RETURN p||jsonb_build_object('active',true,'keyed_pricing_active',coalesce(ready,false));
END $$;
REVOKE ALL ON FUNCTION public.get_booking_guest_policy() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_booking_guest_policy() TO anon,authenticated,service_role;
ALTER TABLE public.tactical_overrides ADD COLUMN guest_type_key text;
CREATE FUNCTION public.validate_keyed_override_guest() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.guest_type_key IS NOT NULL THEN
  IF NEW.guest_type_key !~ '^[a-z][a-z0-9_]*$' OR NOT EXISTS(SELECT 1 FROM public.guest_age_policy_versions v CROSS JOIN LATERAL jsonb_array_elements(v.bands) b WHERE b->>'key'=NEW.guest_type_key) AND NOT EXISTS(SELECT 1 FROM public.guest_policy_drafts d WHERE d.status='draft' AND d.band->>'key'=NEW.guest_type_key) THEN RAISE EXCEPTION 'Unknown guest type'; END IF;
  IF NEW.occupancy_type IS DISTINCT FROM 'extra_'||NEW.guest_type_key THEN RAISE EXCEPTION 'Override guest type does not match its charge'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_keyed_override_guest BEFORE INSERT OR UPDATE ON public.tactical_overrides FOR EACH ROW EXECUTE FUNCTION public.validate_keyed_override_guest();
CREATE OR REPLACE FUNCTION public.sync_override_guest_charge() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE adult_amount numeric;
BEGIN
 IF NEW.guest_charge_mode NOT IN ('fixed','same_as_adult') OR (NEW.guest_charge_mode='same_as_adult' AND (NEW.occupancy_type IS NULL OR NEW.occupancy_type NOT LIKE 'extra_%' OR NEW.occupancy_type='extra_adult')) THEN RAISE EXCEPTION 'Invalid override guest charge mode'; END IF;
 IF NEW.guest_charge_mode='same_as_adult' AND NEW.is_active THEN
 SELECT adjustment_value INTO adult_amount FROM public.tactical_overrides a WHERE a.occupancy_type='extra_adult' AND a.is_active AND a.room_category_id IS NOT DISTINCT FROM NEW.room_category_id AND a.room_type_id IS NOT DISTINCT FROM NEW.room_type_id AND a.room_unit_id IS NOT DISTINCT FROM NEW.room_unit_id AND a.start_date=NEW.start_date AND a.end_date=NEW.end_date AND a.day_type IS NOT DISTINCT FROM NEW.day_type AND a.min_nights IS NOT DISTINCT FROM NEW.min_nights AND a.max_nights IS NOT DISTINCT FROM NEW.max_nights AND a.meal_plan_code IS NOT DISTINCT FROM NEW.meal_plan_code ORDER BY a.created_at DESC,a.id LIMIT 1;
 IF adult_amount IS NULL THEN RAISE EXCEPTION 'Configure the matching adult override before choosing Same as Adult'; END IF;
 NEW.adjustment_type:='fixed'; NEW.adjustment_value:=adult_amount;
 END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.refresh_linked_override_guest_charges() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.occupancy_type='extra_adult' AND NEW.is_active THEN
 UPDATE public.tactical_overrides c SET adjustment_value=NEW.adjustment_value WHERE c.guest_charge_mode='same_as_adult' AND c.occupancy_type LIKE 'extra_%' AND c.occupancy_type<>'extra_adult' AND c.is_active AND c.room_category_id IS NOT DISTINCT FROM NEW.room_category_id AND c.room_type_id IS NOT DISTINCT FROM NEW.room_type_id AND c.room_unit_id IS NOT DISTINCT FROM NEW.room_unit_id AND c.start_date=NEW.start_date AND c.end_date=NEW.end_date AND c.day_type IS NOT DISTINCT FROM NEW.day_type AND c.min_nights IS NOT DISTINCT FROM NEW.min_nights AND c.max_nights IS NOT DISTINCT FROM NEW.max_nights AND c.meal_plan_code IS NOT DISTINCT FROM NEW.meal_plan_code;
 END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.validate_meal_age_pricing_rules(p_rules jsonb) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE r jsonb; keys text[]; amount numeric;
BEGIN
 SELECT array_agg(DISTINCT k) INTO keys FROM (SELECT b->>'key' k FROM public.guest_age_policy_versions v CROSS JOIN LATERAL jsonb_array_elements(v.bands) b WHERE v.revision=(SELECT max(revision) FROM public.guest_age_policy_versions) UNION SELECT d.band->>'key' FROM public.guest_policy_drafts d WHERE d.status='draft') configured;
 IF jsonb_typeof(p_rules) IS DISTINCT FROM 'array' OR jsonb_array_length(p_rules)<>cardinality(keys)*4 THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_rules) AS item(value) GROUP BY item.value->>'plan_code',item.value->>'band_key' HAVING count(*)>1) THEN RETURN false; END IF;
 FOR r IN SELECT value FROM jsonb_array_elements(p_rules) LOOP
 IF coalesce(r->>'plan_code','') NOT IN ('RO','BB','HB','FB') OR NOT coalesce(r->>'band_key'=ANY(keys),false) OR coalesce(r->>'mode','') NOT IN ('full','percentage','fixed','free') THEN RETURN false; END IF;
 IF r->>'plan_code'='RO' AND r->>'mode'<>'free' OR r->>'plan_code'<>'RO' AND r->>'band_key'='adult' AND r->>'mode'<>'full' THEN RETURN false; END IF;
 IF r->>'mode' IN ('full','free') THEN IF r->'value' IS DISTINCT FROM 'null'::jsonb THEN RETURN false; END IF;
 ELSE IF jsonb_typeof(r->'value') IS DISTINCT FROM 'number' THEN RETURN false; END IF;
 amount:=(r->>'value')::numeric; IF amount<0 OR round(amount,2)<>amount OR r->>'mode'='percentage' AND amount>100 THEN RETURN false; END IF; END IF;
 END LOOP;
 RETURN true;
EXCEPTION WHEN others THEN RETURN false;
END $$;
CREATE FUNCTION public.validate_guest_type_counts(p_counts jsonb,p_revision integer) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE p jsonb:=public.get_booking_guest_policy(); e record; total integer:=0;
BEGIN
 IF p_revision IS DISTINCT FROM (p->>'revision')::integer THEN RAISE EXCEPTION 'AGE_POLICY_CHANGED: review guest selection'; END IF;
 IF jsonb_typeof(p_counts) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_each(p_counts))>100 THEN RAISE EXCEPTION 'Invalid guest breakdown'; END IF;
 FOR e IN SELECT * FROM jsonb_each(p_counts) LOOP
 IF jsonb_typeof(e.value) IS DISTINCT FROM 'number' OR e.value::text !~ '^[0-9]+$' OR e.value::numeric>100 OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p->'bands') b WHERE b->>'key'=e.key AND b->'enabled' IS DISTINCT FROM 'false'::jsonb) THEN RAISE EXCEPTION 'Unknown guest type or invalid count'; END IF;
 total:=total+e.value::text::integer;
 END LOOP;
 IF total<1 OR total>100 OR coalesce((p_counts->>'adult')::integer,0)<1 THEN RAISE EXCEPTION 'A party needs at least one Adult and at most 100 guests'; END IF;
 RETURN p;
END $$;
REVOKE ALL ON FUNCTION public.validate_guest_type_counts(jsonb,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_guest_type_counts(jsonb,integer) TO anon,authenticated,service_role;
CREATE FUNCTION public.guest_type_accommodation_charge(p_anchor jsonb,p_counts jsonb) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE policy jsonb:=public.get_booking_guest_policy(); b jsonb; rule jsonb; n integer; unit numeric; total numeric:=0; rows jsonb:='[]';
BEGIN
 FOR b IN SELECT value FROM jsonb_array_elements(policy->'bands') LOOP
 n:=coalesce((p_counts->>(b->>'key'))::integer,0);
 IF b->>'key'='adult' THEN n:=greatest(0,n-(p_anchor->>'included_adults')::integer); END IF;
 IF n=0 THEN CONTINUE; END IF;
 rule:=p_anchor->'guest_type_charges'->(b->>'key');
 IF b->>'accommodation_rule'='free' THEN unit:=0;
 ELSIF rule->>'mode'='same_as_adult' THEN unit:=(p_anchor->>'extra_adult_per_night')::numeric;
 ELSIF rule->>'mode'='fixed' THEN unit:=(rule->>'amount')::numeric;
 ELSIF b->>'key' IN ('adult','child','infant') THEN unit:=(p_anchor->>('extra_'||(b->>'key')||'_per_night'))::numeric;
 ELSE unit:=NULL; END IF;
 IF unit IS NULL THEN RAISE EXCEPTION 'GUEST_TYPE_RATE_NOT_CONFIGURED: % accommodation in %',b->>'key',p_anchor->>'name'; END IF;
 IF unit<0 THEN RAISE EXCEPTION 'Invalid accommodation rate'; END IF;
 total:=total+unit*n;
 rows:=rows||jsonb_build_array(jsonb_build_object('guest_type_key',b->>'key','count',n,'unit_price',unit,'total',unit*n,'mode',coalesce(rule->>'mode','fixed')));
 END LOOP;
 RETURN jsonb_build_object('total',total,'bands',rows);
END $$;
REVOKE ALL ON FUNCTION public.guest_type_accommodation_charge(jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guest_type_accommodation_charge(jsonb,jsonb) TO anon,authenticated,service_role;
CREATE FUNCTION public.guest_type_meal_charge(p_plan text,p_adult_rate numeric,p_counts jsonb) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE policy jsonb:=public.get_booking_guest_policy(); pricing jsonb; b jsonb; r jsonb; n integer; unit numeric; total numeric:=0; charged integer:=0; rows jsonb:='[]';
BEGIN
 SELECT rules INTO pricing FROM public.meal_age_pricing_versions ORDER BY revision DESC LIMIT 1;
 FOR b IN SELECT value FROM jsonb_array_elements(policy->'bands') LOOP
 n:=coalesce((p_counts->>(b->>'key'))::integer,0); IF n=0 THEN CONTINUE; END IF;
 SELECT x INTO r FROM jsonb_array_elements(pricing) x WHERE x->>'plan_code'=p_plan AND x->>'band_key'=b->>'key';
 IF p_plan='RO' OR b->>'meal_rule'='free' THEN unit:=0;
 ELSIF r IS NULL THEN RAISE EXCEPTION 'GUEST_TYPE_RATE_NOT_CONFIGURED: % meal charge for %',b->>'key',p_plan;
 ELSIF r->>'mode'='free' THEN unit:=0;
 ELSIF r->>'mode'='full' THEN unit:=p_adult_rate;
 ELSIF r->>'mode'='fixed' THEN unit:=(r->>'value')::numeric;
 ELSIF r->>'mode'='percentage' THEN unit:=round(p_adult_rate*(r->>'value')::numeric/100,2);
 ELSE RAISE EXCEPTION 'Invalid guest meal charge'; END IF;
 IF unit IS NULL OR unit<0 THEN RAISE EXCEPTION 'Invalid guest meal rate'; END IF;
 total:=total+unit*n; IF unit>0 THEN charged:=charged+n; END IF;
 rows:=rows||jsonb_build_array(jsonb_build_object('guest_type_key',b->>'key','count',n,'unit_price',unit,'total',unit*n,'mode',r->>'mode'));
 END LOOP;
 RETURN jsonb_build_object('total',total,'bands',rows,'chargeable_guest_count',charged);
END $$;
REVOKE ALL ON FUNCTION public.guest_type_meal_charge(text,numeric,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guest_type_meal_charge(text,numeric,jsonb) TO anon,authenticated,service_role;
-- Install a separately named keyed engine, preserving every existing date, anchor,
-- source-meal preservation, modifier, cancellation and variant branch.
DO $$ DECLARE d text;
BEGIN
 d:=pg_get_functiondef('public.calculate_rate_variants_v2(uuid,date,date,uuid,integer,integer,integer,text)'::regprocedure);
 IF strpos(d,'v_target_rate*v_all_guests')=0 OR strpos(d,'v_extra:=v_extra_adults*coalesce')=0 THEN RAISE EXCEPTION 'Keyed engine requires reviewed canonical function'; END IF;
 d:=replace(d,'public.calculate_rate_variants_v2(','public.calculate_keyed_rate_variants_engine(');
 d:=replace(d,'p_booking_channel text DEFAULT ''direct''::text)','p_booking_channel text DEFAULT ''direct''::text, p_guest_counts jsonb DEFAULT NULL::jsonb)');
 d:=replace(d,'v_all_guests int:=p_adults_count+p_children_count+p_infants_count;','v_all_guests int:=(SELECT sum(value::text::integer) FROM jsonb_each(p_guest_counts));');
 d:=replace(d,'v_target_rate*v_all_guests','(public.guest_type_meal_charge(v_plan.plan_code,v_target_rate,p_guest_counts)->>''total'')::numeric');
 d:=replace(d,'v_extra:=v_extra_adults*coalesce(v_anchor.extra_adult_per_night,0)+p_children_count*coalesce(v_anchor.extra_child_per_night,0)+p_infants_count*v_anchor.extra_infant_per_night;','v_extra:=(public.guest_type_accommodation_charge(to_jsonb(v_anchor),p_guest_counts)->>''total'')::numeric;');
 d:=replace(d,'''extra_accommodation'',v_extra','''guest_type_accommodation'',public.guest_type_accommodation_charge(to_jsonb(v_anchor),p_guest_counts),''guest_type_meals'',public.guest_type_meal_charge(v_plan.plan_code,v_target_rate,p_guest_counts),''extra_accommodation'',v_extra');
 -- Unknown custom extra charges must never fall through to legacy inclusive pricing.
 d:=replace(d,'if not v_covered and (not v_has_verified or v_all_full_preservation) then','if not v_covered and EXISTS(SELECT 1 FROM jsonb_each(p_guest_counts) e WHERE e.key NOT IN (''adult'',''child'',''infant'') AND e.value::text::integer>0) then RAISE EXCEPTION ''GUEST_TYPE_RATE_NOT_CONFIGURED: verified accommodation pricing is required for custom guest types''; end if; if not v_covered and (not v_has_verified or v_all_full_preservation) then');
 d:=replace(d,'if coalesce((v_entry->>''legacy'')::boolean,false) then','if coalesce((v_entry->>''legacy'')::boolean,false) then IF EXISTS(SELECT 1 FROM jsonb_each(p_guest_counts) e WHERE e.key NOT IN (''adult'',''child'',''infant'') AND e.value::text::integer>0) THEN RAISE EXCEPTION ''GUEST_TYPE_RATE_NOT_CONFIGURED: configure this legacy night before selecting custom guests''; END IF;');
 EXECUTE d;
END $$;
REVOKE ALL ON FUNCTION public.calculate_keyed_rate_variants_engine(uuid,date,date,uuid,integer,integer,integer,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_keyed_rate_variants_engine(uuid,date,date,uuid,integer,integer,integer,text,jsonb) TO service_role;
CREATE FUNCTION public.calculate_guest_type_rate_variants(p_room_type_id uuid,p_check_in date,p_check_out date,p_guest_counts jsonb,p_policy_revision integer,p_room_unit_id uuid DEFAULT NULL,p_booking_channel text DEFAULT 'direct',p_website boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p jsonb; variants jsonb; offered jsonb; result jsonb:='[]'; v jsonb; n integer; a integer; c integer; i integer;
BEGIN
 p:=public.validate_guest_type_counts(p_guest_counts,p_policy_revision);
 a:=coalesce((p_guest_counts->>'adult')::integer,0); c:=coalesce((p_guest_counts->>'child')::integer,0); i:=coalesce((p_guest_counts->>'infant')::integer,0);
 SELECT sum(value::text::integer) INTO n FROM jsonb_each(p_guest_counts);
 IF p_website THEN offered:=public.calculate_website_rate_variants(p_room_type_id,p_check_in,p_check_out,p_room_unit_id,a,c,i,p_booking_channel); END IF;
 IF coalesce((p->>'keyed_pricing_active')::boolean,false) THEN variants:=public.calculate_keyed_rate_variants_engine(p_room_type_id,p_check_in,p_check_out,p_room_unit_id,a,c,i,p_booking_channel,p_guest_counts);
 ELSE variants:=public.calculate_rate_variants_v2(p_room_type_id,p_check_in,p_check_out,p_room_unit_id,a,c,i,p_booking_channel); END IF;
 FOR v IN SELECT value FROM jsonb_array_elements(variants) LOOP
 IF p_website AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(offered) x WHERE x->>'meal_plan_code'=v->>'meal_plan_code' AND x->>'cancellation_policy_code'=v->>'cancellation_policy_code') THEN CONTINUE; END IF;
 result:=result||jsonb_build_array(v||jsonb_build_object('guest_counts',p_guest_counts,'actual_guest_count',n,'guest_age_policy',p,'quote_fingerprint',md5(jsonb_build_array(v->>'quote_fingerprint',p,p_guest_counts)::text)));
 END LOOP;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.calculate_guest_type_rate_variants(uuid,date,date,jsonb,integer,uuid,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_guest_type_rate_variants(uuid,date,date,jsonb,integer,uuid,text,boolean) TO anon,authenticated,service_role;
NOTIFY pgrst,'reload schema';