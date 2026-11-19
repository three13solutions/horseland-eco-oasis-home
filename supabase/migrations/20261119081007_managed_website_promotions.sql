SET LOCAL lock_timeout='5s';
-- Repository-only migration. No changes to existing promotion amounts, status or dates.
alter table public.website_promotions
 add column discount_kind text not null default 'legacy' check(discount_kind in ('legacy','fixed','percentage')),
 add column discount_basis text check(discount_basis in ('booking','night')),
 add column discount_value numeric(10,2),
 add column booking_from date, add column booking_to date,
 add column stay_from date, add column stay_to date,
 add column day_scope text not null default 'both' check(day_scope in ('both','weekday','weekend')),
 add column mixed_stay_mode text check(mixed_stay_mode in ('all_nights','eligible_nights')),
 add column is_public boolean not null default true;
alter table public.website_promotions drop constraint website_promotions_discount_policy_check;
alter table public.website_promotions add constraint managed_promotion_policy check (
 (discount_kind='legacy' and ((code='EP300' and amount_per_night=300 and amount_per_booking=0) or (code='DIRECT1000' and amount_per_night=0 and amount_per_booking=1000)))
 or (discount_kind in ('fixed','percentage') and code not in ('EP300','DIRECT1000') and discount_basis is not null and discount_value is not null and discount_value>0 and (discount_kind<>'percentage' or discount_value<=100) and amount_per_night=0 and amount_per_booking=0));
alter table public.website_promotions add constraint managed_promotion_windows check (
 (booking_from is null or booking_to is null or booking_from<=booking_to) and
 (stay_from is null or stay_to is null or stay_from<=stay_to) and
 (day_scope='both' and stay_from is null and stay_to is null or mixed_stay_mode is not null) and
 (mixed_stay_mode is distinct from 'eligible_nights' or (code<>'DIRECT1000' and discount_basis is distinct from 'booking')));
alter table public.website_promotions add constraint managed_promotion_code check(code ~ '^[A-Z0-9_-]{3,30}$');

create function public.save_managed_website_promotion(p_settings jsonb,p_expected_revision integer default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v public.website_promotions; c text:=upper(trim(p_settings->>'code')); k text; b text;
begin
 if auth.uid() is null or not coalesce(public.is_admin_new(),false) then raise exception 'Administrator required' using errcode='42501'; end if;
 if c is null or c !~ '^[A-Z0-9_-]{3,30}$' or length(trim(coalesce(p_settings->>'label','')))=0 then raise exception 'Code and label required'; end if;
 select * into v from public.website_promotions where code=c for update;
 if found then
   if p_expected_revision is distinct from v.revision then raise exception 'Promotion changed. Reload before saving'; end if;
   k:=v.discount_kind; b:=v.discount_basis;
 else
   if p_expected_revision is not null or c in ('EP300','DIRECT1000') then raise exception 'Promotion changed. Reload before saving'; end if;
   k:=p_settings->>'discount_kind'; b:=p_settings->>'discount_basis';
   if k not in ('fixed','percentage') or b not in ('booking','night') or k is null or b is null then raise exception 'Choose discount type and basis'; end if;
   insert into public.website_promotions(code,label,amount_per_night,amount_per_booking,is_active,discount_kind,discount_basis,discount_value)
   values(c,p_settings->>'label',0,0,false,k,b,(p_settings->>'discount_value')::numeric) returning * into v;
 end if;
 update public.website_promotions set label=trim(p_settings->>'label'),
   discount_kind=case when k='legacy' then k else p_settings->>'discount_kind' end,
   discount_basis=case when k='legacy' then b else p_settings->>'discount_basis' end,
   discount_value=case when k='legacy' then v.discount_value else (p_settings->>'discount_value')::numeric end,
   booking_from=nullif(p_settings->>'booking_from','')::date, booking_to=nullif(p_settings->>'booking_to','')::date,
   stay_from=nullif(p_settings->>'stay_from','')::date, stay_to=nullif(p_settings->>'stay_to','')::date,
   day_scope=p_settings->>'day_scope',mixed_stay_mode=nullif(p_settings->>'mixed_stay_mode',''),
   is_public=(p_settings->>'is_public')::boolean,is_active=(p_settings->>'is_active')::boolean,
   revision=revision+1,updated_at=now(),updated_by=auth.uid()
 where code=c returning * into v;
 return to_jsonb(v);
end $$;
revoke all on function public.save_managed_website_promotion(jsonb,integer) from public,anon;
grant execute on function public.save_managed_website_promotion(jsonb,integer) to authenticated;

-- Service-only: use the canonical effective-date AND room-scoped protected-period calendar.
create function public.website_promotion_eligible_dates(p_room_type_id uuid,p_check_in date,p_check_out date,p_day_scope text)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if p_check_out<=p_check_in or p_check_out-p_check_in>365 or p_day_scope not in ('weekday','weekend','both') then raise exception 'Invalid stay'; end if;
 return coalesce((select jsonb_agg(d::date order by d) from generate_series(p_check_in,p_check_out-1,interval '1 day') d
 where p_day_scope='both' or public.is_pricing_weekend(d::date,array[0,5,6],p_room_type_id)=(p_day_scope='weekend')),'[]'::jsonb);
end $$;
revoke all on function public.website_promotion_eligible_dates(uuid,date,date,text) from public,anon,authenticated;
grant execute on function public.website_promotion_eligible_dates(uuid,date,date,text) to service_role;

-- Preserve existing release gate and read payload while making the admin guard null-safe.
create or replace function public.website_promotion_settings() returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or not coalesce(public.is_admin_new(),false) then raise exception 'Administrator required' using errcode='42501'; end if;
 return jsonb_build_object('enabled',(select enabled from public.website_promo_rollout where id),
 'offers',coalesce((select jsonb_agg(to_jsonb(p) order by p.code) from public.website_promotions p),'[]'::jsonb));
end $$;
revoke all on function public.website_promotion_settings() from public,anon;
grant execute on function public.website_promotion_settings() to authenticated;
-- Existing zz_activity_log trigger on website_promotions records every insert/update.
