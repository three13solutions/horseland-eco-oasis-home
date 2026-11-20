ALTER TABLE public.tactical_overrides ADD COLUMN guest_charge_mode text NOT NULL DEFAULT 'fixed';
CREATE OR REPLACE FUNCTION public.sync_override_guest_charge() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE adult_amount numeric;
BEGIN
 IF NEW.guest_charge_mode NOT IN ('fixed','same_as_adult') OR (NEW.guest_charge_mode='same_as_adult' AND NEW.occupancy_type IS DISTINCT FROM 'extra_child') THEN RAISE EXCEPTION 'Invalid override guest charge mode'; END IF;
 IF NEW.guest_charge_mode='same_as_adult' AND NEW.is_active THEN
  SELECT adjustment_value INTO adult_amount FROM public.tactical_overrides a WHERE a.occupancy_type='extra_adult' AND a.is_active
   AND a.room_category_id IS NOT DISTINCT FROM NEW.room_category_id AND a.room_type_id IS NOT DISTINCT FROM NEW.room_type_id AND a.room_unit_id IS NOT DISTINCT FROM NEW.room_unit_id
   AND a.start_date=NEW.start_date AND a.end_date=NEW.end_date AND a.day_type IS NOT DISTINCT FROM NEW.day_type
   AND a.min_nights IS NOT DISTINCT FROM NEW.min_nights AND a.max_nights IS NOT DISTINCT FROM NEW.max_nights AND a.meal_plan_code IS NOT DISTINCT FROM NEW.meal_plan_code
   ORDER BY a.created_at DESC,a.id LIMIT 1;
  IF adult_amount IS NULL THEN RAISE EXCEPTION 'Configure the matching adult override before choosing Same as Adult'; END IF;
  NEW.adjustment_type:='fixed'; NEW.adjustment_value:=adult_amount;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER sync_override_guest_charge BEFORE INSERT OR UPDATE ON public.tactical_overrides FOR EACH ROW EXECUTE FUNCTION public.sync_override_guest_charge();
CREATE OR REPLACE FUNCTION public.refresh_linked_override_guest_charges() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.occupancy_type='extra_adult' AND NEW.is_active THEN
  UPDATE public.tactical_overrides c SET adjustment_value=NEW.adjustment_value WHERE c.guest_charge_mode='same_as_adult' AND c.occupancy_type='extra_child' AND c.is_active
   AND c.room_category_id IS NOT DISTINCT FROM NEW.room_category_id AND c.room_type_id IS NOT DISTINCT FROM NEW.room_type_id AND c.room_unit_id IS NOT DISTINCT FROM NEW.room_unit_id
   AND c.start_date=NEW.start_date AND c.end_date=NEW.end_date AND c.day_type IS NOT DISTINCT FROM NEW.day_type
   AND c.min_nights IS NOT DISTINCT FROM NEW.min_nights AND c.max_nights IS NOT DISTINCT FROM NEW.max_nights AND c.meal_plan_code IS NOT DISTINCT FROM NEW.meal_plan_code;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER refresh_linked_override_guest_charges AFTER INSERT OR UPDATE OF adjustment_value ON public.tactical_overrides FOR EACH ROW EXECUTE FUNCTION public.refresh_linked_override_guest_charges();