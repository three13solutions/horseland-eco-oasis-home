alter table public.meal_plan_rules add column if not exists alias_names text[] not null default '{}', add column if not exists alias_codes text[] not null default '{}';
do $$
begin
 if (select count(*) from public.meal_plan_rules where plan_code in ('BB','HB','FB')) <> 3 then raise exception 'Expected existing BB/HB/FB plans'; end if;
 update public.meal_plan_rules set plan_name='Breakfast Included',description='Accommodation with breakfast included.',alias_names=ARRAY['Bed & Breakfast','Continental Plan'],alias_codes=ARRAY['CP'],display_order=2,updated_at=now() where plan_code='BB';
 update public.meal_plan_rules set plan_name='Half Board',description='Accommodation with breakfast and dinner included.',alias_names=ARRAY['Breakfast & Dinner','Modified American Plan'],alias_codes=ARRAY['MAP'],display_order=3,updated_at=now() where plan_code='HB';
 update public.meal_plan_rules set plan_name='Full Board',description='Accommodation with breakfast, lunch and dinner included.',alias_names=ARRAY['All Meals','American Plan'],alias_codes=ARRAY['AP'],display_order=4,updated_at=now() where plan_code='FB';
 insert into public.meal_plan_rules(plan_code,plan_name,description,included_meal_types,preferred_variant,applies_to,display_order,is_active,is_featured,alias_names,alias_codes)
 values('RO','Room Only','Accommodation only; no meals included.','[]'::jsonb,'veg','all',1,true,false,ARRAY['European Plan'],ARRAY['EP'])
 on conflict(plan_code) do update set plan_name=excluded.plan_name,description=excluded.description,alias_names=excluded.alias_names,alias_codes=excluded.alias_codes,display_order=excluded.display_order,updated_at=now();
end $$;
