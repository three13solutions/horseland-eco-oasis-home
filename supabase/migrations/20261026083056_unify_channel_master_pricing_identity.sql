-- REVIEW ONLY: stable shared channels; preserves four pricing rules unchanged.
-- Removes ONLY the explicitly approved obsolete Other +5% rule.
BEGIN;
LOCK TABLE public.distribution_channels IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.channel_rules IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
 IF md5(pg_get_functiondef('public.calculate_dynamic_price(uuid,uuid,date,integer,integer,integer,text,integer)'::regprocedure))<>'3b2249cdc17876f5855aa0d79e7e6880' THEN RAISE EXCEPTION 'Pricing function calculate_dynamic_price changed; re-review predicate patch'; END IF;
 IF md5(pg_get_functiondef('public.calculate_dynamic_price_legacy_20261025(uuid,uuid,date,integer,integer,integer,text,integer)'::regprocedure))<>'e55f716cab487a9e1c809136bc5a0116' THEN RAISE EXCEPTION 'Pricing function calculate_dynamic_price_legacy_20261025 changed; re-review predicate patch'; END IF;
 IF md5(pg_get_functiondef('public.apply_accommodation_modifiers(uuid,uuid,date,text,numeric,numeric,numeric)'::regprocedure))<>'bc4346707c5331e3200d0ba049512a43' THEN RAISE EXCEPTION 'Pricing function apply_accommodation_modifiers changed; re-review predicate patch'; END IF;
END $$;

DO $$ BEGIN
 IF (SELECT count(*) FROM public.distribution_channels)<>4 OR (SELECT count(*) FROM public.distribution_channels WHERE code IN('website','phone_whatsapp','walk_in','resavenue'))<>4 THEN RAISE EXCEPTION 'Channel directory changed; review migration'; END IF;
 IF EXISTS(SELECT FROM distribution_private.reservations r JOIN public.distribution_channels c ON c.id=r.source_channel_id WHERE c.code='phone_whatsapp') THEN RAISE EXCEPTION 'Combined Phone/WhatsApp has history; resolve split before rename'; END IF;
END $$;
UPDATE public.distribution_channels SET name=CASE code WHEN 'website' THEN 'Direct - Website' WHEN 'phone_whatsapp' THEN 'Direct - Phone Call' WHEN 'walk_in' THEN 'Direct - Walk-In' WHEN 'resavenue' THEN 'OTAs - Managed by ResAvenue' END;
INSERT INTO public.distribution_channels(code,name,kind,is_active,notes) VALUES
('whatsapp','Direct - WhatsApp','offline',true,'Managed outside website inventory; no implicit website pricing discount.'),
('travel_agent','Travel Agent','offline',true,'Channel definition only; no external integration.'),
('corporate','Corporate','offline',true,'Channel definition only; no external integration.');
-- Explicit user-authorized deletion of the sole obsolete Other +5% rule.
DO $$ BEGIN
 IF (SELECT count(*) FROM public.channel_rules WHERE channel_name='other')<>1 OR NOT EXISTS(SELECT FROM public.channel_rules WHERE id='6beefd8e-fbcb-4351-bfdd-88cb6b914938' AND channel_name='other' AND adjustment_type='percentage' AND adjustment_value=5 AND applies_to='all' AND room_type_id IS NULL AND season_id IS NULL AND is_active) THEN RAISE EXCEPTION 'Other rule changed; review exact deletion'; END IF;
END $$;
DELETE FROM public.channel_rules WHERE id='6beefd8e-fbcb-4351-bfdd-88cb6b914938';
ALTER TABLE public.distribution_channels ADD CONSTRAINT distribution_channel_reserved_aliases CHECK(code NOT IN('direct','ota','phone_call'));
-- Scalar identity lookup intentionally exposes no directory notes or guest data.
-- SECURITY DEFINER is needed because directory SELECT is administrator-only.
CREATE FUNCTION public.resolve_distribution_channel_id(p_channel text) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT c.id FROM public.distribution_channels c
 WHERE c.id::text=lower(btrim(p_channel)) OR c.code=CASE lower(btrim(p_channel)) WHEN 'direct' THEN 'website' WHEN 'ota' THEN 'resavenue' WHEN 'phone_call' THEN 'phone_whatsapp' ELSE lower(btrim(p_channel)) END
 LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.resolve_distribution_channel_id(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_distribution_channel_id(text) TO anon,authenticated,service_role;
ALTER TABLE public.channel_rules ADD COLUMN channel_id uuid REFERENCES public.distribution_channels(id) ON DELETE RESTRICT;
-- Preserve existing timestamps during identity-only backfill; all table writes locked.
ALTER TABLE public.channel_rules DISABLE TRIGGER update_channel_rules_updated_at;
UPDATE public.channel_rules SET channel_id=public.resolve_distribution_channel_id(channel_name);
ALTER TABLE public.channel_rules ENABLE TRIGGER update_channel_rules_updated_at;
ALTER TABLE public.channel_rules ALTER COLUMN channel_id SET NOT NULL;
CREATE INDEX channel_rules_channel_id_idx ON public.channel_rules(channel_id);
-- Old five-token check is superseded by the FK and synchronized compatibility token.
DO $$ DECLARE c record; BEGIN
 FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='public.channel_rules'::regclass AND contype='c' AND pg_get_constraintdef(oid) LIKE '%channel_name%' LOOP
 EXECUTE format('ALTER TABLE public.channel_rules DROP CONSTRAINT %I',c.conname); END LOOP;
END $$;
CREATE FUNCTION distribution_private.sync_rule_channel() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE selected_id uuid; c public.distribution_channels%ROWTYPE; id_changed boolean; name_changed boolean;
BEGIN
 IF TG_OP='INSERT' THEN
  selected_id:=coalesce(NEW.channel_id,public.resolve_distribution_channel_id(NEW.channel_name));
  IF NEW.channel_id IS NOT NULL AND NEW.channel_name IS NOT NULL AND public.resolve_distribution_channel_id(NEW.channel_name) IS DISTINCT FROM NEW.channel_id THEN RAISE EXCEPTION 'Channel ID and compatibility token disagree'; END IF;
 ELSE
  id_changed:=NEW.channel_id IS DISTINCT FROM OLD.channel_id;name_changed:=NEW.channel_name IS DISTINCT FROM OLD.channel_name;
  IF id_changed AND name_changed AND public.resolve_distribution_channel_id(NEW.channel_name) IS DISTINCT FROM NEW.channel_id THEN RAISE EXCEPTION 'Channel ID and compatibility token disagree'; END IF;
  selected_id:=CASE WHEN name_changed AND NOT id_changed THEN public.resolve_distribution_channel_id(NEW.channel_name) ELSE NEW.channel_id END;
 END IF;
 SELECT * INTO c FROM public.distribution_channels WHERE id=selected_id FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Unknown channel'; END IF;
 IF NOT c.is_active AND (TG_OP='INSERT' OR selected_id IS DISTINCT FROM OLD.channel_id) THEN RAISE EXCEPTION 'Inactive channel cannot be selected for a new rule'; END IF;
 NEW.channel_id:=c.id;
 NEW.channel_name:=CASE c.code WHEN 'website' THEN 'direct' WHEN 'resavenue' THEN 'ota' WHEN 'phone_whatsapp' THEN 'phone_call' ELSE c.code END;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION distribution_private.sync_rule_channel() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER channel_rules_sync_identity BEFORE INSERT OR UPDATE ON public.channel_rules FOR EACH ROW EXECUTE FUNCTION distribution_private.sync_rule_channel();

CREATE OR REPLACE FUNCTION public.calculate_dynamic_price(p_room_type_id uuid, p_room_unit_id uuid DEFAULT NULL::uuid, p_date date DEFAULT CURRENT_DATE, p_adults_count integer DEFAULT 2, p_children_count integer DEFAULT 0, p_infants_count integer DEFAULT 0, p_booking_channel text DEFAULT 'direct'::text, p_current_occupancy integer DEFAULT 0)
 RETURNS TABLE(final_price numeric, base_price numeric, adjustments jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_base_price NUMERIC;
  v_final_price NUMERIC;
  v_season_id UUID;
  v_day_type_id UUID;
  v_adjustments JSONB := '[]'::jsonb;
  v_floor_price NUMERIC;
  v_ceiling_price NUMERIC;
  v_days_until_checkin INTEGER;
  v_adjustment NUMERIC;
  v_adjustment_type TEXT;
  v_adjustment_value NUMERIC;
  v_rule_name TEXT;
  v_is_tactical_override BOOLEAN := false;
  v_base_guests_count INTEGER;
  v_extra_adults INTEGER;
  v_extra_children INTEGER;
  v_adult_charge NUMERIC;
  v_child_charge NUMERIC;
  v_per_guest_rate NUMERIC;
BEGIN

  IF NOT EXISTS (SELECT 1 FROM public.room_types r WHERE r.id=p_room_type_id AND r.pricing_status<>'configuration_required' AND EXISTS(SELECT 1 FROM public.room_units u WHERE u.room_type_id=r.id)) THEN RETURN; END IF;
 IF EXISTS(SELECT 1 FROM public.room_types WHERE id=p_room_type_id AND pricing_status='ready') THEN RETURN; END IF;

  -- Get base price (for base occupancy, typically 2 adults)
  SELECT * INTO v_base_price, v_season_id, v_day_type_id
  FROM get_base_price_for_date(p_room_type_id, p_date);
  
  v_final_price := COALESCE(v_base_price, 0);

  -- Check for tactical override first (highest priority)
  SELECT 
    COALESCE(override_price, 0),
    adjustment_type,
    adjustment_value,
    reason
  INTO v_adjustment, v_adjustment_type, v_adjustment_value, v_rule_name
  FROM tactical_overrides
  WHERE is_active = true
    AND p_date BETWEEN start_date AND end_date
    AND (room_type_id = p_room_type_id OR room_type_id IS NULL)
    AND (room_unit_id = p_room_unit_id OR room_unit_id IS NULL)
  ORDER BY 
    CASE WHEN room_unit_id IS NOT NULL THEN 1 
         WHEN room_type_id IS NOT NULL THEN 2 
         ELSE 3 END,
    created_at DESC
  LIMIT 1;

  -- If override_price is set, this is a FINAL PRICE - skip all other adjustments
  IF v_adjustment IS NOT NULL AND v_adjustment > 0 THEN
    v_is_tactical_override := true;
    v_final_price := v_adjustment;
    v_adjustments := v_adjustments || jsonb_build_object(
      'type', 'tactical_override',
      'from', v_base_price,
      'to', v_final_price,
      'reason', v_rule_name
    );
    v_base_price := v_final_price;
    
    -- Return immediately - no further adjustments for tactical overrides with fixed price
    RETURN QUERY SELECT v_final_price, v_base_price, v_adjustments;
    RETURN;
  ELSIF v_adjustment_type IS NOT NULL THEN
    -- Only percentage/fixed adjustments continue through the pricing pipeline
    IF v_adjustment_type = 'percentage' THEN
      v_adjustment := v_final_price * (v_adjustment_value / 100);
    ELSE
      v_adjustment := v_adjustment_value;
    END IF;
    v_final_price := v_final_price + v_adjustment;
    v_adjustments := v_adjustments || jsonb_build_object(
      'type', 'tactical_override_adjustment',
      'adjustment', v_adjustment,
      'new_price', v_final_price,
      'reason', v_rule_name
    );
  END IF;

  -- Apply occupancy yield rules
  SELECT 
    CASE 
      WHEN price_adjustment_type = 'percentage' THEN v_final_price * (price_adjustment / 100)
      ELSE price_adjustment
    END,
    rule_name
  INTO v_adjustment, v_rule_name
  FROM occupancy_yield_rules
  WHERE is_active = true
    AND p_current_occupancy >= occupancy_threshold
    AND (
      applies_to = 'all' OR 
      (applies_to = 'category' AND room_type_id = p_room_type_id) OR 
      (applies_to = 'season' AND season_id = v_season_id)
    )
  ORDER BY priority DESC, occupancy_threshold DESC
  LIMIT 1;

  IF v_adjustment IS NOT NULL THEN
    v_final_price := v_final_price + v_adjustment;
    v_adjustments := v_adjustments || jsonb_build_object(
      'type', 'occupancy_yield',
      'rule', v_rule_name,
      'adjustment', v_adjustment,
      'new_price', v_final_price
    );
  END IF;

  -- Apply lead time rules
  v_days_until_checkin := p_date - CURRENT_DATE;
  
  SELECT 
    CASE 
      WHEN price_adjustment_type = 'percentage' THEN v_final_price * (price_adjustment / 100)
      ELSE price_adjustment
    END,
    rule_name
  INTO v_adjustment, v_rule_name
  FROM lead_time_rules
  WHERE is_active = true
    AND v_days_until_checkin BETWEEN days_before_checkin_min AND days_before_checkin_max
    AND (
      applies_to = 'all' OR 
      (applies_to = 'season' AND season_id = v_season_id) OR
      (applies_to = 'category' AND room_type_id = p_room_type_id)
    )
  ORDER BY priority DESC
  LIMIT 1;

  IF v_adjustment IS NOT NULL THEN
    v_final_price := v_final_price + v_adjustment;
    v_adjustments := v_adjustments || jsonb_build_object(
      'type', 'lead_time',
      'rule', v_rule_name,
      'adjustment', v_adjustment,
      'new_price', v_final_price
    );
  END IF;

  -- Apply guest composition charges (adults, children, infants)
  -- NEW POLICY:
  -- 0-2 years (infants): free
  -- 2-9 years (children): half adult rate
  -- 10+ years (adults): full adult rate
  
  -- Get base guest count and charges from guest_composition_rules
  SELECT 
    base_guests_count,
    COALESCE(extra_adult_charge, 0),
    COALESCE(extra_child_charge, 0)
  INTO v_base_guests_count, v_adult_charge, v_child_charge
  FROM guest_composition_rules
  WHERE is_active = true
    AND (room_type_id = p_room_type_id OR room_type_id IS NULL)
  ORDER BY room_type_id NULLS LAST
  LIMIT 1;

  -- Default to 2 base guests if no rule found
  v_base_guests_count := COALESCE(v_base_guests_count, 2);
  
  -- Calculate per-guest rate from base price (base price is for base guests)
  v_per_guest_rate := v_final_price / v_base_guests_count;
  
  -- Use configured charges or calculate defaults
  v_adult_charge := COALESCE(v_adult_charge, v_per_guest_rate);
  -- Children (2-9 years): half adult rate (removed the +100)
  v_child_charge := v_per_guest_rate / 2;

  -- Calculate extra adults (beyond base count)
  v_extra_adults := GREATEST(0, p_adults_count - v_base_guests_count);
  
  -- All children are charged (no base children included)
  v_extra_children := p_children_count;

  -- Apply charges
  v_adjustment := (v_extra_adults * v_adult_charge) + (v_extra_children * v_child_charge);
  -- Infants (0-2 years): free (p_infants_count not used in calculation)

  IF v_adjustment > 0 THEN
    v_final_price := v_final_price + v_adjustment;
    v_adjustments := v_adjustments || jsonb_build_object(
      'type', 'guest_composition',
      'adults', p_adults_count,
      'children', p_children_count,
      'infants', p_infants_count,
      'extra_adults', v_extra_adults,
      'extra_children', v_extra_children,
      'adult_charge_per_person', v_adult_charge,
      'child_charge_per_person', v_child_charge,
      'adjustment', v_adjustment,
      'new_price', v_final_price
    );
  END IF;

  -- Apply channel adjustment
  SELECT 
    CASE 
      WHEN adjustment_type = 'percentage' THEN v_final_price * (adjustment_value / 100)
      ELSE adjustment_value
    END,
    channel_name
  INTO v_adjustment, v_rule_name
  FROM channel_rules
  WHERE is_active = true
    AND channel_id = public.resolve_distribution_channel_id(p_booking_channel)
    AND (
      applies_to = 'all' OR 
      (applies_to = 'category' AND room_type_id = p_room_type_id) OR 
      (applies_to = 'season' AND season_id = v_season_id)
    )
  LIMIT 1;

  IF v_adjustment IS NOT NULL THEN
    v_final_price := v_final_price + v_adjustment;
    v_adjustments := v_adjustments || jsonb_build_object(
      'type', 'channel_adjustment',
      'channel', p_booking_channel,
      'adjustment', v_adjustment,
      'new_price', v_final_price
    );
  END IF;

  -- Enforce floor and ceiling prices
  SELECT floor_price, ceiling_price INTO v_floor_price, v_ceiling_price
  FROM pricing_constraints
  WHERE is_active = true
    AND (
      (room_unit_id = p_room_unit_id AND p_room_unit_id IS NOT NULL) OR 
      (room_type_id = p_room_type_id AND room_unit_id IS NULL)
    )
  ORDER BY 
    CASE WHEN room_unit_id IS NOT NULL THEN 1 ELSE 2 END
  LIMIT 1;

  IF v_floor_price IS NOT NULL AND v_final_price < v_floor_price THEN
    v_adjustments := v_adjustments || jsonb_build_object(
      'type', 'floor_constraint',
      'from', v_final_price,
      'to', v_floor_price
    );
    v_final_price := v_floor_price;
  END IF;

  IF v_ceiling_price IS NOT NULL AND v_final_price > v_ceiling_price THEN
    v_adjustments := v_adjustments || jsonb_build_object(
      'type', 'ceiling_constraint',
      'from', v_final_price,
      'to', v_ceiling_price
    );
    v_final_price := v_ceiling_price;
  END IF;

  RETURN QUERY SELECT v_final_price, v_base_price, v_adjustments;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_dynamic_price_legacy_20261025(p_room_type_id uuid, p_room_unit_id uuid DEFAULT NULL::uuid, p_date date DEFAULT CURRENT_DATE, p_adults_count integer DEFAULT 2, p_children_count integer DEFAULT 0, p_infants_count integer DEFAULT 0, p_booking_channel text DEFAULT 'direct'::text, p_current_occupancy integer DEFAULT 0)
 RETURNS TABLE(final_price numeric, base_price numeric, adjustments jsonb)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_base_price NUMERIC;
  v_final_price NUMERIC;
  v_season_id UUID;
  v_day_type_id UUID;
  v_adjustments JSONB := '[]'::jsonb;
  v_floor_price NUMERIC;
  v_ceiling_price NUMERIC;
  v_days_until_checkin INTEGER;
  v_adjustment NUMERIC;
  v_adjustment_type TEXT;
  v_adjustment_value NUMERIC;
  v_rule_name TEXT;
  v_is_tactical_override BOOLEAN := false;
  v_base_guests_count INTEGER;
  v_extra_adults INTEGER;
  v_extra_children INTEGER;
  v_adult_charge NUMERIC;
  v_child_charge NUMERIC;
  v_per_guest_rate NUMERIC;
BEGIN

  IF NOT EXISTS (SELECT 1 FROM public.room_types r WHERE r.id=p_room_type_id AND r.pricing_status<>'configuration_required' AND EXISTS(SELECT 1 FROM public.room_units u WHERE u.room_type_id=r.id)) THEN RETURN; END IF;
 IF EXISTS(SELECT 1 FROM public.room_types WHERE id=p_room_type_id AND pricing_status='ready') THEN RETURN; END IF;

  -- Get base price (for base occupancy, typically 2 adults)
  SELECT * INTO v_base_price, v_season_id, v_day_type_id
  FROM get_base_price_for_date(p_room_type_id, p_date);
  
  v_final_price := COALESCE(v_base_price, 0);

  -- Check for tactical override first (highest priority)
  SELECT 
    COALESCE(override_price, 0),
    adjustment_type,
    adjustment_value,
    reason
  INTO v_adjustment, v_adjustment_type, v_adjustment_value, v_rule_name
  FROM tactical_overrides
  WHERE not public.rate_override_disabled(id) AND is_active = true
    AND p_date BETWEEN start_date AND end_date
    AND (room_type_id = p_room_type_id OR room_type_id IS NULL)
    AND (room_unit_id = p_room_unit_id OR room_unit_id IS NULL)
  ORDER BY 
    CASE WHEN room_unit_id IS NOT NULL THEN 1 
         WHEN room_type_id IS NOT NULL THEN 2 
         ELSE 3 END,
    created_at DESC
  LIMIT 1;

  -- If override_price is set, this is a FINAL PRICE - skip all other adjustments
  IF v_adjustment IS NOT NULL AND v_adjustment > 0 THEN
    v_is_tactical_override := true;
    v_final_price := v_adjustment;
    v_adjustments := v_adjustments || jsonb_build_object(
      'type', 'tactical_override',
      'from', v_base_price,
      'to', v_final_price,
      'reason', v_rule_name
    );
    v_base_price := v_final_price;
    
    -- Return immediately - no further adjustments for tactical overrides with fixed price
    RETURN QUERY SELECT v_final_price, v_base_price, v_adjustments;
    RETURN;
  ELSIF v_adjustment_type IS NOT NULL THEN
    -- Only percentage/fixed adjustments continue through the pricing pipeline
    IF v_adjustment_type = 'percentage' THEN
      v_adjustment := v_final_price * (v_adjustment_value / 100);
    ELSE
      v_adjustment := v_adjustment_value;
    END IF;
    v_final_price := v_final_price + v_adjustment;
    v_adjustments := v_adjustments || jsonb_build_object(
      'type', 'tactical_override_adjustment',
      'adjustment', v_adjustment,
      'new_price', v_final_price,
      'reason', v_rule_name
    );
  END IF;

  -- Apply occupancy yield rules
  SELECT 
    CASE 
      WHEN price_adjustment_type = 'percentage' THEN v_final_price * (price_adjustment / 100)
      ELSE price_adjustment
    END,
    rule_name
  INTO v_adjustment, v_rule_name
  FROM occupancy_yield_rules
  WHERE is_active = true
    AND p_current_occupancy >= occupancy_threshold
    AND (
      applies_to = 'all' OR 
      (applies_to = 'category' AND room_type_id = p_room_type_id) OR 
      (applies_to = 'season' AND season_id = v_season_id)
    )
  ORDER BY priority DESC, occupancy_threshold DESC
  LIMIT 1;

  IF v_adjustment IS NOT NULL THEN
    v_final_price := v_final_price + v_adjustment;
    v_adjustments := v_adjustments || jsonb_build_object(
      'type', 'occupancy_yield',
      'rule', v_rule_name,
      'adjustment', v_adjustment,
      'new_price', v_final_price
    );
  END IF;

  -- Apply lead time rules
  v_days_until_checkin := p_date - CURRENT_DATE;
  
  SELECT 
    CASE 
      WHEN price_adjustment_type = 'percentage' THEN v_final_price * (price_adjustment / 100)
      ELSE price_adjustment
    END,
    rule_name
  INTO v_adjustment, v_rule_name
  FROM lead_time_rules
  WHERE is_active = true
    AND v_days_until_checkin BETWEEN days_before_checkin_min AND days_before_checkin_max
    AND (
      applies_to = 'all' OR 
      (applies_to = 'season' AND season_id = v_season_id) OR
      (applies_to = 'category' AND room_type_id = p_room_type_id)
    )
  ORDER BY priority DESC
  LIMIT 1;

  IF v_adjustment IS NOT NULL THEN
    v_final_price := v_final_price + v_adjustment;
    v_adjustments := v_adjustments || jsonb_build_object(
      'type', 'lead_time',
      'rule', v_rule_name,
      'adjustment', v_adjustment,
      'new_price', v_final_price
    );
  END IF;

  -- Apply guest composition charges (adults, children, infants)
  -- NEW POLICY:
  -- 0-2 years (infants): free
  -- 2-9 years (children): half adult rate
  -- 10+ years (adults): full adult rate
  
  -- Get base guest count and charges from guest_composition_rules
  SELECT 
    base_guests_count,
    COALESCE(extra_adult_charge, 0),
    COALESCE(extra_child_charge, 0)
  INTO v_base_guests_count, v_adult_charge, v_child_charge
  FROM guest_composition_rules
  WHERE is_active = true
    AND (room_type_id = p_room_type_id OR room_type_id IS NULL)
  ORDER BY room_type_id NULLS LAST
  LIMIT 1;

  -- Default to 2 base guests if no rule found
  v_base_guests_count := COALESCE(v_base_guests_count, 2);
  
  -- Calculate per-guest rate from base price (base price is for base guests)
  v_per_guest_rate := v_final_price / v_base_guests_count;
  
  -- Use configured charges or calculate defaults
  v_adult_charge := COALESCE(v_adult_charge, v_per_guest_rate);
  -- Children (2-9 years): half adult rate (removed the +100)
  v_child_charge := v_per_guest_rate / 2;

  -- Calculate extra adults (beyond base count)
  v_extra_adults := GREATEST(0, p_adults_count - v_base_guests_count);
  
  -- All children are charged (no base children included)
  v_extra_children := p_children_count;

  -- Apply charges
  v_adjustment := (v_extra_adults * v_adult_charge) + (v_extra_children * v_child_charge);
  -- Infants (0-2 years): free (p_infants_count not used in calculation)

  IF v_adjustment > 0 THEN
    v_final_price := v_final_price + v_adjustment;
    v_adjustments := v_adjustments || jsonb_build_object(
      'type', 'guest_composition',
      'adults', p_adults_count,
      'children', p_children_count,
      'infants', p_infants_count,
      'extra_adults', v_extra_adults,
      'extra_children', v_extra_children,
      'adult_charge_per_person', v_adult_charge,
      'child_charge_per_person', v_child_charge,
      'adjustment', v_adjustment,
      'new_price', v_final_price
    );
  END IF;

  -- Apply channel adjustment
  SELECT 
    CASE 
      WHEN adjustment_type = 'percentage' THEN v_final_price * (adjustment_value / 100)
      ELSE adjustment_value
    END,
    channel_name
  INTO v_adjustment, v_rule_name
  FROM channel_rules
  WHERE is_active = true
    AND channel_id = public.resolve_distribution_channel_id(p_booking_channel)
    AND (
      applies_to = 'all' OR 
      (applies_to = 'category' AND room_type_id = p_room_type_id) OR 
      (applies_to = 'season' AND season_id = v_season_id)
    )
  LIMIT 1;

  IF v_adjustment IS NOT NULL THEN
    v_final_price := v_final_price + v_adjustment;
    v_adjustments := v_adjustments || jsonb_build_object(
      'type', 'channel_adjustment',
      'channel', p_booking_channel,
      'adjustment', v_adjustment,
      'new_price', v_final_price
    );
  END IF;

  -- Enforce floor and ceiling prices
  SELECT floor_price, ceiling_price INTO v_floor_price, v_ceiling_price
  FROM pricing_constraints
  WHERE is_active = true
    AND (
      (room_unit_id = p_room_unit_id AND p_room_unit_id IS NOT NULL) OR 
      (room_type_id = p_room_type_id AND room_unit_id IS NULL)
    )
  ORDER BY 
    CASE WHEN room_unit_id IS NOT NULL THEN 1 ELSE 2 END
  LIMIT 1;

  IF v_floor_price IS NOT NULL AND v_final_price < v_floor_price THEN
    v_adjustments := v_adjustments || jsonb_build_object(
      'type', 'floor_constraint',
      'from', v_final_price,
      'to', v_floor_price
    );
    v_final_price := v_floor_price;
  END IF;

  IF v_ceiling_price IS NOT NULL AND v_final_price > v_ceiling_price THEN
    v_adjustments := v_adjustments || jsonb_build_object(
      'type', 'ceiling_constraint',
      'from', v_final_price,
      'to', v_ceiling_price
    );
    v_final_price := v_ceiling_price;
  END IF;

  RETURN QUERY SELECT v_final_price, v_base_price, v_adjustments;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.apply_accommodation_modifiers(p_room_type_id uuid, p_room_unit_id uuid, p_date date, p_channel text, p_room_only numeric, p_extra_accommodation numeric, p_included_fb_meals numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_price numeric:=p_room_only; v_before numeric; v_rule record; v_season uuid;
 v_rules jsonb:='[]'::jsonb; v_delta numeric; v_equivalent numeric; v_converted numeric;
begin
 if p_room_only is null or p_room_only<0 or p_extra_accommodation is null or p_extra_accommodation<0 or p_included_fb_meals is null or p_included_fb_meals<0 then raise exception 'Invalid accommodation modifier inputs'; end if;
 select s.id into v_season from public.seasons s join public.season_periods sp on sp.season_id=s.id
 where s.is_active and sp.year=extract(year from p_date) and
 ((sp.start_month<sp.end_month and ((extract(month from p_date)=sp.start_month and extract(day from p_date)>=sp.start_day) or (extract(month from p_date)>sp.start_month and extract(month from p_date)<sp.end_month) or (extract(month from p_date)=sp.end_month and extract(day from p_date)<=sp.end_day)))
 or(sp.start_month>sp.end_month and ((extract(month from p_date)=sp.start_month and extract(day from p_date)>=sp.start_day) or extract(month from p_date)>sp.start_month or extract(month from p_date)<sp.end_month or (extract(month from p_date)=sp.end_month and extract(day from p_date)<=sp.end_day)))
 or(sp.start_month=sp.end_month and extract(month from p_date)=sp.start_month and extract(day from p_date) between sp.start_day and sp.end_day)) limit 1;
 -- Quote RPC historically passes occupancy 0; do not invent live occupancy or change thresholds.
 select * into v_rule from public.occupancy_yield_rules where is_active and 0>=occupancy_threshold
 and(applies_to='all' or(applies_to='category' and room_type_id=p_room_type_id) or(applies_to='season' and season_id=v_season)) order by priority desc,occupancy_threshold desc limit 1;
 if found then
  v_before:=v_price;v_delta:=case when v_rule.price_adjustment_type='percentage' then v_price*v_rule.price_adjustment/100 else v_rule.price_adjustment end;v_price:=v_price+v_delta;
  v_rules:=v_rules||jsonb_build_object('type','occupancy_yield','id',v_rule.id,'name',v_rule.rule_name,'basis','room_only','before',v_before,'adjustment',v_delta,'after',v_price);
 end if;
 select * into v_rule from public.lead_time_rules where is_active and p_date-current_date between days_before_checkin_min and days_before_checkin_max
 and(applies_to='all' or(applies_to='category' and room_type_id=p_room_type_id) or(applies_to='season' and season_id=v_season)) order by priority desc limit 1;
 if found then
  v_before:=v_price;v_delta:=case when v_rule.price_adjustment_type='percentage' then v_price*v_rule.price_adjustment/100 else v_rule.price_adjustment end;v_price:=v_price+v_delta;
  v_rules:=v_rules||jsonb_build_object('type','lead_time','id',v_rule.id,'name',v_rule.rule_name,'basis','room_only','before',v_before,'adjustment',v_delta,'after',v_price);
 end if;
 -- Preserve existing ordering: explicit RO extras after yield/lead, before channel and limits.
 v_price:=v_price+p_extra_accommodation;
 select * into v_rule from public.channel_rules where is_active and channel_id=public.resolve_distribution_channel_id(p_channel)
 and(applies_to='all' or(applies_to='category' and room_type_id=p_room_type_id) or(applies_to='season' and season_id=v_season)) limit 1;
 if found then
  v_before:=v_price;v_delta:=case when v_rule.adjustment_type='percentage' then v_price*v_rule.adjustment_value/100 else v_rule.adjustment_value end;v_price:=v_price+v_delta;
  v_rules:=v_rules||jsonb_build_object('type','channel_adjustment','id',v_rule.id,'name',v_rule.channel_name,'basis','room_only_and_extra_accommodation','before',v_before,'adjustment',v_delta,'after',v_price);
 end if;
 -- Preserve stored limits as included-occupancy FB equivalent, NOT as RO limits.
 select * into v_rule from public.pricing_constraints where is_active and
 ((room_unit_id=p_room_unit_id and p_room_unit_id is not null) or(room_type_id=p_room_type_id and room_unit_id is null))
 order by case when room_unit_id is not null then 1 else 2 end limit 1;
 if found then
  v_equivalent:=v_price+p_included_fb_meals;v_before:=v_price;
  if v_rule.floor_price is not null and v_equivalent<v_rule.floor_price then
   v_converted:=v_rule.floor_price-p_included_fb_meals;
   if v_converted<0 then raise exception 'Inclusive floor cannot produce negative accommodation';end if;
   v_price:=v_converted;
   v_rules:=v_rules||jsonb_build_object('type','floor_constraint','id',v_rule.id,'basis','included_adults_fb_equivalent','stored_limit',v_rule.floor_price,'included_fb_meals',p_included_fb_meals,'before',v_before,'after',v_price);
  end if;
  v_equivalent:=v_price+p_included_fb_meals;v_before:=v_price;
  if v_rule.ceiling_price is not null and v_equivalent>v_rule.ceiling_price then
   v_converted:=v_rule.ceiling_price-p_included_fb_meals;
   if v_converted<0 then raise exception 'Inclusive ceiling cannot produce negative accommodation';end if;
   v_price:=v_converted;
   v_rules:=v_rules||jsonb_build_object('type','ceiling_constraint','id',v_rule.id,'basis','included_adults_fb_equivalent','stored_limit',v_rule.ceiling_price,'included_fb_meals',p_included_fb_meals,'before',v_before,'after',v_price);
  end if;
 end if;
 if v_price<0 then raise exception 'Dynamic rules produce negative accommodation';end if;
 return jsonb_build_object('accommodation',round(v_price,2),'adjustment',round(v_price-p_room_only-p_extra_accommodation,2),'rules',v_rules);
end $function$
;

COMMIT;
