create or replace function public.validate_meal_plan_pricing() returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if TG_OP='UPDATE' and new.plan_code is distinct from old.plan_code and old.plan_code in ('RO','BB','HB','FB') then
   raise exception 'Primary codes are stable pricing identities; edit aliases instead';
 end if;
 if new.is_active and (new.plan_code not in ('RO','BB','HB','FB') or new.supplement_per_person_inr is null) then
   raise exception 'Active booking plans require RO, BB, HB or FB and a configured supplement';
 end if;
 if new.plan_code='RO' and new.supplement_per_person_inr is distinct from 0 then raise exception 'Room Only meal supplement must be zero'; end if;
 if TG_OP='UPDATE' and new.supplement_per_person_inr is distinct from old.supplement_per_person_inr then
   if exists(select 1 from public.rate_plan_anchors a where a.is_active and a.source_meal_plan_code=new.plan_code
     and (a.end_date is null or a.end_date>=new.supplement_effective_from)
     and (a.amount/a.quoted_nights - case when a.los_adjustment_type='fixed' then a.los_adjustment_value when a.los_adjustment_type='percentage' then a.amount/a.quoted_nights*a.los_adjustment_value/100 else 0 end)<new.supplement_per_person_inr*a.included_adults) then
     raise exception 'This meal rate makes a verified package accommodation amount negative. Revise the package first.';
   end if;
 end if;
 return new;
end $$;
create trigger validate_meal_plan_pricing before insert or update on public.meal_plan_rules for each row execute function public.validate_meal_plan_pricing();
