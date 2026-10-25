create or replace function public.validate_rate_plan_anchor() returns trigger language plpgsql security invoker set search_path=public as $$
declare v_source numeric; v_net numeric; v_start date := coalesce(new.start_date,current_date);
begin
 if new.verified_basis then
  select amount into v_source from public.meal_supplement_versions where plan_code=new.source_meal_plan_code and effective_from<=v_start order by effective_from desc,recorded_at desc,id limit 1;
  if v_source is null then raise exception 'No source meal rate exists for this rate start date'; end if;
  v_net:=new.amount/new.quoted_nights;
  if new.los_adjustment_type='fixed' then v_net:=v_net-new.los_adjustment_value;
  elsif new.los_adjustment_type='percentage' then v_net:=v_net*(1-new.los_adjustment_value/100); end if;
  if v_net-v_source*new.included_adults<0 or exists (
    select 1 from (
      select distinct on(effective_from) amount from public.meal_supplement_versions
      where plan_code=new.source_meal_plan_code and effective_from>v_start
        and (new.end_date is null or effective_from<=new.end_date)
      order by effective_from,recorded_at desc,id
    ) scheduled where v_net-scheduled.amount*new.included_adults<0
  ) then raise exception 'Source rate yields negative accommodation on an applicable meal-rate date'; end if;
 end if;
 return new;
end $$;
