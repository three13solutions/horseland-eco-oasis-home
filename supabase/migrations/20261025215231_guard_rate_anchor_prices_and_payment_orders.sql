create unique index booking_order_quotes_one_staff_order on public.booking_order_quotes((quote->>'existing_booking_id')) where quote ? 'existing_booking_id';
create or replace function public.validate_rate_plan_anchor() returns trigger language plpgsql security invoker set search_path=public as $$
declare v_source numeric; v_net numeric;
begin
 if new.verified_basis then
  select amount into v_source from public.meal_supplement_versions where plan_code=new.source_meal_plan_code and effective_from<=coalesce(new.start_date,current_date) order by effective_from desc,recorded_at desc,id limit 1;
  if v_source is null then raise exception 'No source meal rate exists for this rate start date'; end if;
  v_net:=new.amount/new.quoted_nights;
  if new.los_adjustment_type='fixed' then v_net:=v_net-new.los_adjustment_value;
  elsif new.los_adjustment_type='percentage' then v_net:=v_net*(1-new.los_adjustment_value/100); end if;
  if v_net-v_source*new.included_adults<0 then raise exception 'Source rate yields negative accommodation'; end if;
 end if;
 return new;
end $$;
create trigger validate_rate_plan_anchor before insert or update on public.rate_plan_anchors for each row execute function public.validate_rate_plan_anchor();
