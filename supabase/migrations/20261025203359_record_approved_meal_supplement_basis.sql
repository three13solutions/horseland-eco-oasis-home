alter table public.meal_plan_rules
 add column supplement_period text check (supplement_period is null or supplement_period in ('per_night','per_stay')),
 add column supplement_guest_basis text check (supplement_guest_basis is null or supplement_guest_basis in ('all_guests','adults_only','adults_and_children'));
update public.meal_plan_rules set supplement_period='per_night',supplement_guest_basis='all_guests' where plan_code in ('RO','BB','HB','FB');
comment on column public.meal_plan_rules.supplement_guest_basis is 'Ali temporarily approved all guests including children and infants at full meal rate; Mahesh reconfirmation pending.';
