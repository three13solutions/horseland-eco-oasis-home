alter table public.meal_plan_rules
 add column supplement_per_person_inr numeric(12,2),
 add column supplement_pricing_enabled boolean not null default false,
 add constraint meal_plan_supplement_nonnegative check (supplement_per_person_inr is null or (supplement_per_person_inr >= 0 and supplement_per_person_inr <> 'NaN'::numeric));
comment on column public.meal_plan_rules.supplement_per_person_inr is 'Approved fixed INR meal supplement per person. Period and child/infant basis pending; not a room-inclusive price.';
comment on column public.meal_plan_rules.supplement_pricing_enabled is 'Defaults false. No checkout integration until charging basis and RO room baseline are explicitly approved.';
do $$
begin
 if (select count(*) from public.meal_plan_rules where plan_code in ('RO','BB','HB','FB')) <> 4 then raise exception 'Expected exactly four canonical meal plans'; end if;
 update public.meal_plan_rules set supplement_per_person_inr=case plan_code when 'RO' then 0 when 'BB' then 270 when 'HB' then 920 when 'FB' then 1510 end, supplement_pricing_enabled=false where plan_code in ('RO','BB','HB','FB');
end $$;