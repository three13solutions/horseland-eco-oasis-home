CREATE SCHEMA guest_pricing_private;
CREATE TABLE public.guest_type_pricing_release(id bool primary key, enabled bool, frontend_release text);
INSERT INTO public.guest_type_pricing_release VALUES(true,false,'keyed-guest-v1');
CREATE FUNCTION guest_pricing_private.get_booking_guest_policy() RETURNS jsonb LANGUAGE sql STABLE AS $$select public.get_guest_age_policy()$$;
CREATE FUNCTION guest_pricing_private.guest_type_meal_charge(p_plan text, p_adult_rate numeric, p_counts jsonb) RETURNS jsonb LANGUAGE sql STABLE AS $$
 SELECT jsonb_build_object('total',p_adult_rate*(coalesce((p_counts->>'adult')::integer,0)+coalesce((p_counts->>'child')::integer,0)), 'legacy_fixture', true)
$$;
CREATE TABLE public.room_types(id uuid primary key, category_id uuid, pricing_status text);
CREATE TABLE public.room_units(id uuid primary key, room_type_id uuid, category_id uuid);
INSERT INTO public.room_types VALUES('33c807e0-f881-4fe6-abfd-0a98506c8cda',null,'legacy');
INSERT INTO public.room_units VALUES('43c807e0-f881-4fe6-abfd-0a98506c8cda','33c807e0-f881-4fe6-abfd-0a98506c8cda',null);
CREATE TABLE public.rate_plan_anchors(id uuid primary key, name text, is_active boolean, verified_basis boolean,
 room_type_id uuid, room_unit_id uuid, room_category_id uuid, start_date date, end_date date, min_nights int, max_nights int, included_adults int,
 day_type text, priority int,updated_at timestamptz,source_meal_plan_code text, amount numeric,quoted_nights int,los_min_nights int,
 los_adjustment_type text,los_adjustment_value numeric, modifier_policy text,source_override_id uuid);
INSERT INTO public.rate_plan_anchors VALUES('53c807e0-f881-4fe6-abfd-0a98506c8cda','EP anchor',true,true,'33c807e0-f881-4fe6-abfd-0a98506c8cda',null,null,
 (now() AT TIME ZONE 'Asia/Kolkata')::date+1,(now() AT TIME ZONE 'Asia/Kolkata')::date+1,1,null,2,'all',200,now(),'RO',3500,1,null,null,null,'none',null);
CREATE TABLE public.meal_plan_rules(id uuid primary key,plan_code text, plan_name text,description text,included_meal_types jsonb, display_order int,is_active bool,is_featured bool,meal_choice_groups jsonb,supplement_effective_from date);
INSERT INTO public.meal_plan_rules VALUES
 ('63c807e0-f881-4fe6-abfd-0a98506c8cda','RO','Room only','', '[]',1,true,false,'[]',(now() AT TIME ZONE 'Asia/Kolkata')::date),
 ('63c807e0-f881-4fe6-abfd-0a98506c8cdb','HB','Half board','', '[]',2,true,false,'[{"meal_ids":["23c807e0-f881-4fe6-abfd-0a98506c8cda"]},{"meal_ids":["23c807e0-f881-4fe6-abfd-0a98506c8cdb","23c807e0-f881-4fe6-abfd-0a98506c8cdc"]}]',(now() AT TIME ZONE 'Asia/Kolkata')::date);
CREATE TABLE public.meal_supplement_versions(id uuid primary key, plan_code text, meal_plan_id uuid,amount numeric,effective_from date,recorded_at timestamptz);
INSERT INTO public.meal_supplement_versions VALUES
 ('73c807e0-f881-4fe6-abfd-0a98506c8cda','RO','63c807e0-f881-4fe6-abfd-0a98506c8cda',0,'2026-01-01',now()),
 ('73c807e0-f881-4fe6-abfd-0a98506c8cdb','HB','63c807e0-f881-4fe6-abfd-0a98506c8cdb',920,'2026-01-01',now());
CREATE TABLE public.cancellation_policy_rules(policy_code text,policy_name text,cancellation_terms jsonb,is_active bool,is_featured bool,display_order int,adjustment_type text,adjustment_value numeric);
INSERT INTO public.cancellation_policy_rules VALUES ('flex','Flexible','{}',true,false,1,'percentage',10);
CREATE FUNCTION public.get_pricing_preservation_policy(uuid,d date) RETURNS jsonb LANGUAGE sql STABLE AS $$
 SELECT CASE WHEN d=(now() AT TIME ZONE 'Asia/Kolkata')::date THEN '{"preservation_mode":"ep_only","preserve_legacy_ep":true,"id":"preserved"}'::jsonb ELSE NULL END
$$;
CREATE FUNCTION public.is_pricing_weekend(date,integer[],uuid) RETURNS boolean LANGUAGE sql STABLE AS $$select false$$;
CREATE FUNCTION public.calculate_rate_variants_legacy_20261025(uuid,date,date,uuid,int,int,int,text) RETURNS jsonb LANGUAGE sql STABLE AS $$
 select '[{"meal_plan_code":"RO","total_price":1000},{"meal_plan_code":"HB","total_price":3000}]'::jsonb
$$;
CREATE FUNCTION public.calculate_legacy_rate_night_context(uuid,date,date,uuid,int,int,int,text,date) RETURNS numeric LANGUAGE sql STABLE AS $$select 1000::numeric$$;
CREATE FUNCTION public.preserved_meal_version(jsonb,text,date) RETURNS jsonb LANGUAGE sql STABLE AS $$select '{}'::jsonb$$;
CREATE FUNCTION guest_pricing_private.scoped_guest_accommodation(jsonb,c jsonb,uuid,uuid,date,int,text) RETURNS jsonb LANGUAGE sql STABLE AS $$
 select jsonb_build_object('total',coalesce((c->>'child')::int,0)*600)
$$;
CREATE FUNCTION public.apply_accommodation_modifiers(uuid,uuid,date,text,b numeric,e numeric,numeric) RETURNS jsonb LANGUAGE sql STABLE AS $$
 select jsonb_build_object('accommodation',b+e,'adjustment',0,'rules','[]'::jsonb)
$$;
