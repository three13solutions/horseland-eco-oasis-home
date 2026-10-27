BEGIN;
-- Standalone website meal visibility only. No financial repair or price changes.
CREATE TABLE public.website_meal_visibility_rules(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 120),scope_kind text NOT NULL CHECK(scope_kind IN('all','types','units')),start_date date,end_date date,is_active boolean NOT NULL DEFAULT false,revision bigint NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),updated_by uuid,created_by uuid NOT NULL,create_payload jsonb NOT NULL, CHECK((start_date IS NULL AND end_date IS NULL) OR(start_date IS NOT NULL AND end_date IS NOT NULL AND end_date>=start_date)));
CREATE TABLE public.website_meal_visibility_plans(rule_id uuid NOT NULL REFERENCES public.website_meal_visibility_rules(id) ON DELETE CASCADE,meal_plan_id uuid NOT NULL REFERENCES public.meal_plan_rules(id) ON DELETE RESTRICT,PRIMARY KEY(rule_id,meal_plan_id));
CREATE TABLE public.website_meal_visibility_types(rule_id uuid NOT NULL REFERENCES public.website_meal_visibility_rules(id) ON DELETE CASCADE,room_type_id uuid NOT NULL REFERENCES public.room_types(id) ON DELETE RESTRICT,PRIMARY KEY(rule_id,room_type_id));
CREATE TABLE public.website_meal_visibility_units(rule_id uuid NOT NULL REFERENCES public.website_meal_visibility_rules(id) ON DELETE CASCADE,room_unit_id uuid NOT NULL REFERENCES public.room_units(id) ON DELETE RESTRICT,PRIMARY KEY(rule_id,room_unit_id));
ALTER TABLE public.website_meal_visibility_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_meal_visibility_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_meal_visibility_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_meal_visibility_units ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.website_meal_visibility_rules,public.website_meal_visibility_plans,public.website_meal_visibility_types,public.website_meal_visibility_units FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.website_meal_visibility_rules,public.website_meal_visibility_plans,public.website_meal_visibility_types,public.website_meal_visibility_units TO authenticated;
CREATE POLICY meal_visibility_admin_read ON public.website_meal_visibility_rules FOR SELECT TO authenticated USING(public.is_admin_new());
CREATE POLICY meal_visibility_plan_admin_read ON public.website_meal_visibility_plans FOR SELECT TO authenticated USING(public.is_admin_new());
CREATE POLICY meal_visibility_type_admin_read ON public.website_meal_visibility_types FOR SELECT TO authenticated USING(public.is_admin_new());
CREATE POLICY meal_visibility_unit_admin_read ON public.website_meal_visibility_units FOR SELECT TO authenticated USING(public.is_admin_new());
CREATE INDEX website_meal_visibility_plan_lookup ON public.website_meal_visibility_plans(meal_plan_id,rule_id);
CREATE FUNCTION distribution_private.meal_visibility_lock() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$BEGIN PERFORM pg_advisory_xact_lock(823116,1);RETURN NULL;END $$;
CREATE TRIGGER meal_visibility_rule_lock BEFORE INSERT OR UPDATE OR DELETE ON public.website_meal_visibility_rules FOR EACH STATEMENT EXECUTE FUNCTION distribution_private.meal_visibility_lock();
CREATE TRIGGER meal_visibility_plan_lock BEFORE INSERT OR UPDATE OR DELETE ON public.website_meal_visibility_plans FOR EACH STATEMENT EXECUTE FUNCTION distribution_private.meal_visibility_lock();
CREATE TRIGGER meal_visibility_type_lock BEFORE INSERT OR UPDATE OR DELETE ON public.website_meal_visibility_types FOR EACH STATEMENT EXECUTE FUNCTION distribution_private.meal_visibility_lock();
CREATE TRIGGER meal_visibility_unit_lock BEFORE INSERT OR UPDATE OR DELETE ON public.website_meal_visibility_units FOR EACH STATEMENT EXECUTE FUNCTION distribution_private.meal_visibility_lock();
CREATE FUNCTION distribution_private.meal_visibility_rule_json(p_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT (to_jsonb(r)-'create_payload')||jsonb_build_object('meal_plan_ids',coalesce((SELECT jsonb_agg(meal_plan_id ORDER BY meal_plan_id) FROM public.website_meal_visibility_plans WHERE rule_id=r.id),'[]'::jsonb),'room_type_ids',coalesce((SELECT jsonb_agg(room_type_id ORDER BY room_type_id) FROM public.website_meal_visibility_types WHERE rule_id=r.id),'[]'::jsonb),'room_unit_ids',coalesce((SELECT jsonb_agg(room_unit_id ORDER BY room_unit_id) FROM public.website_meal_visibility_units WHERE rule_id=r.id),'[]'::jsonb)) FROM public.website_meal_visibility_rules r WHERE r.id=p_id
$$;
CREATE FUNCTION public.list_website_meal_visibility_rules() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin_new() THEN RAISE EXCEPTION 'Admin authorization required' USING ERRCODE='42501';END IF;
 RETURN coalesce((SELECT jsonb_agg(distribution_private.meal_visibility_rule_json(id) ORDER BY created_at,id) FROM public.website_meal_visibility_rules),'[]'::jsonb);
END $$;
CREATE FUNCTION public.save_website_meal_visibility_rule(p_rule jsonb,p_expected_revision bigint DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE rid uuid;old public.website_meal_visibility_rules%ROWTYPE;plans uuid[];types uuid[];units uuid[];scope text;first_night date;last_night date;enabled boolean;normalized jsonb;BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin_new() THEN RAISE EXCEPTION 'Admin authorization required' USING ERRCODE='42501';END IF;
 IF p_rule IS NULL OR jsonb_typeof(p_rule)<>'object' OR octet_length(p_rule::text)>65536 THEN RAISE EXCEPTION 'Invalid rule';END IF;
 scope:=p_rule->>'scope_kind';first_night:=nullif(p_rule->>'start_date','')::date;last_night:=nullif(p_rule->>'end_date','')::date;enabled:=coalesce((p_rule->>'is_active')::boolean,false);
 IF coalesce(scope,'') NOT IN('all','types','units') OR coalesce(length(btrim(p_rule->>'name')),0) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Name and scope required';END IF;
 SELECT coalesce(array_agg(DISTINCT value::uuid ORDER BY value::uuid),'{}'::uuid[]) INTO plans FROM jsonb_array_elements_text(coalesce(p_rule->'meal_plan_ids','[]'::jsonb));
 SELECT coalesce(array_agg(DISTINCT value::uuid ORDER BY value::uuid),'{}'::uuid[]) INTO types FROM jsonb_array_elements_text(coalesce(p_rule->'room_type_ids','[]'::jsonb));
 SELECT coalesce(array_agg(DISTINCT value::uuid ORDER BY value::uuid),'{}'::uuid[]) INTO units FROM jsonb_array_elements_text(coalesce(p_rule->'room_unit_ids','[]'::jsonb));
 IF cardinality(plans)=0 OR cardinality(plans)>100 OR cardinality(types)>1000 OR cardinality(units)>1000 OR (scope='all' AND(cardinality(types)>0 OR cardinality(units)>0)) OR(scope='types' AND(cardinality(types)=0 OR cardinality(units)>0)) OR(scope='units' AND(cardinality(units)=0 OR cardinality(types)>0)) THEN RAISE EXCEPTION 'Select meal plans and only the targets for this scope';END IF;
 IF (first_night IS NULL)<>(last_night IS NULL) OR last_night<first_night THEN RAISE EXCEPTION 'Both stay-night dates are required in ascending order';END IF;
 normalized:=jsonb_build_object('name',btrim(p_rule->>'name'),'scope_kind',scope,'start_date',first_night,'end_date',last_night,'is_active',enabled,'meal_plan_ids',plans,'room_type_ids',types,'room_unit_ids',units);
 PERFORM pg_advisory_xact_lock(823116,1);rid:=coalesce(nullif(p_rule->>'id','')::uuid,gen_random_uuid());
 SELECT * INTO old FROM public.website_meal_visibility_rules WHERE id=rid FOR UPDATE;
 IF p_expected_revision IS NULL THEN
 IF FOUND THEN
 IF old.created_by IS DISTINCT FROM auth.uid() OR old.create_payload IS DISTINCT FROM normalized THEN RAISE EXCEPTION 'Rule creation ID already used for different data';END IF;
 RETURN distribution_private.meal_visibility_rule_json(rid);
 END IF;
 INSERT INTO public.website_meal_visibility_rules(id,name,scope_kind,start_date,end_date,is_active,updated_by,created_by,create_payload) VALUES(rid,btrim(p_rule->>'name'),scope,first_night,last_night,enabled,auth.uid(),auth.uid(),normalized);
 ELSE
 IF NOT FOUND OR p_expected_revision IS DISTINCT FROM old.revision THEN RAISE EXCEPTION 'MEAL_VISIBILITY_CHANGED: Refresh the rule before saving' USING ERRCODE='40001';END IF;
 UPDATE public.website_meal_visibility_rules SET name=btrim(p_rule->>'name'),scope_kind=scope,start_date=first_night,end_date=last_night,is_active=enabled,revision=revision+1,updated_at=now(),updated_by=auth.uid() WHERE id=rid;
 DELETE FROM public.website_meal_visibility_plans WHERE rule_id=rid;DELETE FROM public.website_meal_visibility_types WHERE rule_id=rid;DELETE FROM public.website_meal_visibility_units WHERE rule_id=rid;
 END IF;
 INSERT INTO public.website_meal_visibility_plans SELECT rid,x FROM unnest(plans) x;
 INSERT INTO public.website_meal_visibility_types SELECT rid,x FROM unnest(types) x;
 INSERT INTO public.website_meal_visibility_units SELECT rid,x FROM unnest(units) x;
 RETURN distribution_private.meal_visibility_rule_json(rid);
END $$;
CREATE FUNCTION distribution_private.active_meal_id(p_code text) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT id FROM public.meal_plan_rules WHERE is_active AND (upper(btrim(plan_code))=upper(btrim(p_code)) OR upper(btrim(p_code))=ANY(alias_codes)) ORDER BY CASE WHEN upper(btrim(plan_code))=upper(btrim(p_code)) THEN 0 ELSE 1 END,id LIMIT 1
$$;
CREATE FUNCTION distribution_private.unit_meal_visible(p_plan uuid,p_type uuid,p_unit uuid,p_check_in date,p_check_out date) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT p_plan IS NOT NULL AND EXISTS(SELECT FROM public.meal_plan_rules WHERE id=p_plan AND is_active) AND NOT EXISTS(
 SELECT FROM public.website_meal_visibility_rules r JOIN public.website_meal_visibility_plans m ON m.rule_id=r.id AND m.meal_plan_id=p_plan
 WHERE r.is_active AND(r.start_date IS NULL OR(r.start_date<p_check_out AND r.end_date>=p_check_in))
 AND(r.scope_kind='all' OR(r.scope_kind='types' AND EXISTS(SELECT FROM public.website_meal_visibility_types x WHERE x.rule_id=r.id AND x.room_type_id=p_type)) OR(r.scope_kind='units' AND EXISTS(SELECT FROM public.website_meal_visibility_units x WHERE x.rule_id=r.id AND x.room_unit_id=p_unit))))
$$;
CREATE FUNCTION distribution_private.meal_eligible_units(p_type uuid,p_check_in date,p_check_out date,p_unit uuid,p_plan uuid) RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT u.id FROM public.room_units u JOIN public.room_types t ON t.id=u.room_type_id JOIN public.room_categories c ON c.id=t.category_id
 WHERE u.room_type_id=p_type AND (p_unit IS NULL OR u.id=p_unit) AND u.is_active AND u.status='available' AND t.is_published AND t.pricing_status IS NOT NULL AND t.pricing_status<>'configuration_required' AND c.is_active AND(u.category_id IS NULL OR u.category_id=t.category_id)
 AND distribution_private.unit_meal_visible(p_plan,p_type,u.id,p_check_in,p_check_out)
 AND NOT EXISTS(SELECT FROM public.bookings b WHERE b.room_unit_id=u.id AND b.payment_status IS DISTINCT FROM 'cancelled' AND b.check_in<p_check_out AND b.check_out>p_check_in)
 AND NOT EXISTS(SELECT FROM distribution_private.reservations r WHERE r.room_unit_id=u.id AND r.state IN('held','confirmed','review_required') AND r.check_in<p_check_out AND r.check_out>p_check_in)
 ORDER BY u.unit_number,u.id
$$;
CREATE FUNCTION public.calculate_website_rate_variants(p_room_type_id uuid,p_check_in date,p_check_out date,p_room_unit_id uuid DEFAULT NULL,p_adults_count integer DEFAULT 2,p_children_count integer DEFAULT 0,p_infants_count integer DEFAULT 0,p_booking_channel text DEFAULT 'direct') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE variants jsonb;result jsonb;BEGIN
 -- Existing availability validates date range and shared website quota.
 IF public.distribution_website_type_availability(p_room_type_id,p_check_in,p_check_out)=0 THEN RETURN '[]'::jsonb;END IF;
 variants:=public.calculate_rate_variants_v2(p_room_type_id,p_check_in,p_check_out,p_room_unit_id,p_adults_count,p_children_count,p_infants_count,p_booking_channel);
 SELECT coalesce(jsonb_agg(v.value ORDER BY v.ordinality),'[]'::jsonb) INTO result FROM jsonb_array_elements(variants) WITH ORDINALITY v(value,ordinality)
 WHERE EXISTS(SELECT FROM distribution_private.meal_eligible_units(p_room_type_id,p_check_in,p_check_out,p_room_unit_id,distribution_private.active_meal_id(v.value->>'meal_plan_code')));
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION distribution_private.meal_visibility_lock(),distribution_private.meal_visibility_rule_json(uuid),distribution_private.active_meal_id(text),distribution_private.unit_meal_visible(uuid,uuid,uuid,date,date),distribution_private.meal_eligible_units(uuid,date,date,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.list_website_meal_visibility_rules(),public.save_website_meal_visibility_rule(jsonb,bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_website_meal_visibility_rules(),public.save_website_meal_visibility_rule(jsonb,bigint) TO authenticated;
REVOKE ALL ON FUNCTION public.calculate_website_rate_variants(uuid,date,date,uuid,integer,integer,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_website_rate_variants(uuid,date,date,uuid,integer,integer,integer,text) TO anon,authenticated,service_role;
DO $$ BEGIN IF md5(pg_get_functiondef('public.distribution_begin_payment_intent(jsonb)'::regprocedure))<>'dce24f019947158199e2213905382f42' THEN RAISE EXCEPTION 'Live admission changed since meal visibility review';END IF;END $$;
CREATE OR REPLACE FUNCTION public.distribution_begin_payment_intent(p_intent jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE p distribution_private.payment_intents%ROWTYPE; v_request uuid; v_amount numeric; v_hold jsonb; v_record jsonb; v_meal_unit uuid; v_meal_plan uuid;
BEGIN
 IF NOT coalesce(distribution_private.ready(),false) THEN RAISE EXCEPTION 'Website inventory is not activated'; END IF;
 IF p_intent IS NULL OR jsonb_typeof(p_intent)<>'object' OR octet_length(p_intent::text)>262144 THEN RAISE EXCEPTION 'Invalid payment intent'; END IF;
 IF coalesce(p_intent->>'requestId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'Invalid request ID'; END IF;
 v_request:=(p_intent->>'requestId')::uuid;
 IF jsonb_typeof(p_intent->'amountPaise') IS DISTINCT FROM 'number' OR p_intent->>'currency' IS DISTINCT FROM 'INR'
  OR jsonb_typeof(p_intent->'ownerScope') IS DISTINCT FROM 'string' OR length(p_intent->>'ownerScope') NOT BETWEEN 1 AND 512
  OR jsonb_typeof(p_intent->'quoteFingerprint') IS DISTINCT FROM 'string' OR length(p_intent->>'quoteFingerprint') NOT BETWEEN 1 AND 1024
  OR jsonb_typeof(p_intent->'selection') IS DISTINCT FROM 'object' OR jsonb_typeof(p_intent->'quoteSnapshot') IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid payment intent'; END IF;
 v_amount:=(p_intent->>'amountPaise')::numeric;
 IF v_amount<>trunc(v_amount) OR v_amount NOT BETWEEN 100 AND 9007199254740991 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
 PERFORM pg_advisory_xact_lock(823116,1);
 IF EXISTS(SELECT FROM distribution_private.closed_checkout_requests WHERE request_id=v_request) THEN RAISE EXCEPTION 'Checkout request was closed; use a new request'; END IF;
 SELECT * INTO p FROM distribution_private.payment_intents WHERE request_id=v_request FOR UPDATE;
 IF FOUND THEN
  IF p.intent<>p_intent THEN RAISE EXCEPTION 'Request ID already used for different owner, selection or quote'; END IF;
  v_record:=distribution_private.intent_record(p);
  IF p.state='ready' THEN RETURN jsonb_build_object('state','ready','record',v_record,'order',p.provider_order); END IF;
  -- A repeated call never returns the ownership token, even after uncertainty.
  RETURN jsonb_build_object('state',p.state,'record',v_record);
 END IF;
 IF jsonb_typeof(p_intent->'admission') IS DISTINCT FROM 'object'
  OR coalesce(p_intent#>>'{admission,sourceKey}','') !~ '^[0-9a-f]{64}$'
  OR coalesce(p_intent#>>'{admission,contactKey}','') !~ '^[0-9a-f]{64}$'
  OR jsonb_typeof(p_intent#>'{admission,sourceVerified}') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Server admission keys are required'; END IF;
 IF (SELECT count(*) FROM distribution_private.payment_intents WHERE source_key=p_intent#>>'{admission,sourceKey}' AND state IN('creating','ready','review_required'))>=3
 OR (SELECT count(*) FROM distribution_private.payment_intents WHERE contact_key=p_intent#>>'{admission,contactKey}' AND state IN('creating','ready','review_required'))>=1
 OR (SELECT count(*) FROM distribution_private.payment_intents WHERE source_key=p_intent#>>'{admission,sourceKey}' AND created_at>now()-interval '1 hour')>=10 THEN
  RAISE EXCEPTION 'DISTRIBUTION_ADMISSION_LIMIT: Too many pending checkout attempts. Retry later or contact hotel to reconcile existing attempts.' USING ERRCODE='P0001';
 END IF;
 v_meal_plan:=distribution_private.active_meal_id(p_intent#>>'{quoteSnapshot,request,meal_plan_code}');
 SELECT x INTO v_meal_unit FROM distribution_private.meal_eligible_units((p_intent#>>'{selection,roomTypeId}')::uuid,(p_intent#>>'{selection,checkIn}')::date,(p_intent#>>'{selection,checkOut}')::date,nullif(p_intent#>>'{selection,unitId}','')::uuid,v_meal_plan) x LIMIT 1;
 IF v_meal_plan IS NULL OR v_meal_unit IS NULL THEN RAISE EXCEPTION 'MEAL_PLAN_UNAVAILABLE: This meal plan is unavailable for the selected room and stay. Review another plan before paying.' USING ERRCODE='P0001';END IF;
 v_hold:=public.distribution_hold_website_inventory(v_request,(p_intent#>>'{selection,roomTypeId}')::uuid,
  (p_intent#>>'{selection,checkIn}')::date,(p_intent#>>'{selection,checkOut}')::date,v_meal_unit);
 -- Preexisting reservations without this intent must not acquire fresh provider
 -- ownership: they may belong to a previous integration or unfinished operation.
 IF coalesce((v_hold->>'reused')::boolean,false) THEN RAISE EXCEPTION 'Existing hold requires payment-intent reconciliation'; END IF;
 INSERT INTO distribution_private.payment_intents(request_id,hold_id,owner_scope,quote_fingerprint,amount_paise,currency,receipt,intent,state,source_key,contact_key,source_verified)
 VALUES(v_request,(v_hold->>'hold_id')::uuid,p_intent->>'ownerScope',p_intent->>'quoteFingerprint',v_amount::bigint,'INR','hl_'||replace(v_request::text,'-',''),p_intent,'creating',p_intent#>>'{admission,sourceKey}',p_intent#>>'{admission,contactKey}',(p_intent#>>'{admission,sourceVerified}')::boolean) RETURNING * INTO p;
 RETURN jsonb_build_object('state','create_owned','record',distribution_private.intent_record(p),'operationToken',p.operation_token);
END $function$
;
COMMIT;
