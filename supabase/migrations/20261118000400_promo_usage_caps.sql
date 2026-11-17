-- Staged only. Unlimited existing offers retain NULL caps. No sample codes or live activation.
alter table public.website_promotions
 add column usage_serial bigint not null default 0,
 add column total_usage_limit integer check(total_usage_limit>0),
 add column per_guest_usage_limit integer check(per_guest_usage_limit>0);

create table distribution_private.promotion_uses (
 request_id uuid primary key references distribution_private.payment_intents(request_id),
 code text not null references public.website_promotions(code),
 guest_email_hash text,
 state text not null check(state in ('reserved','redeemed')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index promotion_uses_code_guest on distribution_private.promotion_uses(code,guest_email_hash);
alter table distribution_private.promotion_uses enable row level security;
revoke all on distribution_private.promotion_uses from public,anon,authenticated,service_role;

create function distribution_private.promotion_email_hash(p_intent jsonb) returns text
language sql immutable set search_path='' as $$
 select case when nullif(lower(trim(p_intent#>>'{bookingMetadata,guest,email}')),'') is not null
 then encode(sha256(convert_to(lower(trim(p_intent#>>'{bookingMetadata,guest,email}')),'UTF8')),'hex') else null end
$$;
revoke all on function distribution_private.promotion_email_hash(jsonb) from public,anon,authenticated,service_role;

-- Prevent an intent insert between the historical capture and trigger installation.
lock table distribution_private.payment_intents in share row exclusive mode;
insert into distribution_private.promotion_uses(request_id,code,guest_email_hash,state,created_at)
select p.request_id,p.intent#>>'{quoteSnapshot,promotion,code}',distribution_private.promotion_email_hash(p.intent),
 case when p.state='confirmed' then 'redeemed' else 'reserved' end,p.created_at
from distribution_private.payment_intents p
join public.website_promotions w on w.code=p.intent#>>'{quoteSnapshot,promotion,code}';

-- AFTER INSERT is still inside the atomic begin-intent/inventory-hold transaction.
-- Taking the promotion row lock serializes all uses and admin cap changes.
create function distribution_private.reserve_promotion_use() returns trigger
language plpgsql security definer set search_path='' as $$
declare promo public.website_promotions; v_code text:=new.intent#>>'{quoteSnapshot,promotion,code}'; email_hash text; used bigint; req jsonb; start_day date; end_day date; today date; eligible integer; eligible_dates jsonb; category uuid;
begin
 if v_code is null then return new; end if;
 select * into promo from public.website_promotions where website_promotions.code=v_code for update;
 if not found then raise exception 'PROMO_UNAVAILABLE: Promotion is unavailable'; end if;
 if new.state is distinct from 'creating' then raise exception 'New promotion payment must begin in creating state'; end if;
 -- New uses must match the current server quote; retained intent retries never insert again.
 if promo.is_active is distinct from true or (new.intent#>>'{quoteSnapshot,promotion,revision}')::integer is distinct from promo.revision then
   raise exception 'PROMO_CHANGED: Refresh the offer quote before paying';
 end if;
 req:=new.intent#>'{quoteSnapshot,request}';
 if req is null or req->>'promo_code' is distinct from promo.code or req->>'room_type_id' is distinct from new.intent#>>'{selection,roomTypeId}'
 or nullif(req->>'room_unit_id','') is distinct from nullif(new.intent#>>'{selection,unitId}','')
 or req->>'check_in' is distinct from new.intent#>>'{selection,checkIn}' or req->>'check_out' is distinct from new.intent#>>'{selection,checkOut}' then raise exception 'PROMO_CHANGED: Quote selection mismatch'; end if;
 start_day:=(req->>'check_in')::date; end_day:=(req->>'check_out')::date; today:=(now() at time zone 'Asia/Kolkata')::date;
 if start_day is null or end_day is null or end_day-start_day not between 1 and 365 then raise exception 'PROMO_CHANGED: Invalid stay'; end if;
 if (promo.booking_from is not null and today<promo.booking_from) or (promo.booking_to is not null and today>promo.booking_to) then raise exception 'PROMO_CHANGED: Booking window closed'; end if;
 if promo.min_stay_nights is not null and end_day-start_day<promo.min_stay_nights then raise exception 'PROMO_CHANGED: Minimum stay not met'; end if;
 if promo.eligible_meal_plan_codes is not null and not coalesce(req->>'meal_plan_code'=any(promo.eligible_meal_plan_codes),false) then raise exception 'PROMO_CHANGED: Meal plan not eligible'; end if;
 select coalesce((select u.category_id from public.room_units u where u.id=nullif(req->>'room_unit_id','')::uuid),t.category_id) into category from public.room_types t where t.id=(req->>'room_type_id')::uuid;
 if promo.eligible_room_category_ids is not null and not coalesce(category=any(promo.eligible_room_category_ids),false) then raise exception 'PROMO_CHANGED: Room category not eligible'; end if;
 select count(*),coalesce(jsonb_agg(d::date order by d),'[]'::jsonb) into eligible,eligible_dates from generate_series(start_day,end_day-1,interval '1 day') d
 where (promo.stay_from is null or d::date>=promo.stay_from) and (promo.stay_to is null or d::date<=promo.stay_to)
 and not(d::date=any(promo.excluded_stay_dates))
 and (promo.day_scope='both' or public.is_pricing_weekend(d::date,array[0,5,6],(req->>'room_type_id')::uuid)=(promo.day_scope='weekend'));
 if eligible=0 or ((promo.mixed_stay_mode='all_nights' or promo.code='DIRECT1000' or promo.discount_basis='booking') and eligible<>end_day-start_day) then raise exception 'PROMO_CHANGED: Stay is no longer eligible'; end if;
 if new.intent#>'{quoteSnapshot,promotion,eligible_dates}' is not null
 and new.intent#>'{quoteSnapshot,promotion,eligible_dates}' is distinct from eligible_dates then raise exception 'PROMO_CHANGED: Stay-day eligibility changed'; end if;
 if exists(select 1 from jsonb_array_elements(coalesce(new.intent#>'{quoteSnapshot,promotion,nightly_discounts}','[]'::jsonb)) row
 where (row->>'discount')::numeric>0 and not (eligible_dates ? (row->>'date'))) then raise exception 'PROMO_CHANGED: A discounted night is no longer eligible'; end if;
 email_hash:=distribution_private.promotion_email_hash(new.intent);
 if email_hash is null then raise exception 'PROMO_GUEST_REQUIRED: A normalized guest email is required'; end if;
 select count(*) into used from distribution_private.promotion_uses u where u.code=promo.code;
 if promo.total_usage_limit is not null and used>=promo.total_usage_limit then raise exception 'PROMO_USAGE_LIMIT: This offer has reached its usage limit'; end if;
 select count(*) into used from distribution_private.promotion_uses u where u.code=promo.code and u.guest_email_hash=email_hash;
 if promo.per_guest_usage_limit is not null and used>=promo.per_guest_usage_limit then raise exception 'PROMO_GUEST_LIMIT: This email has reached the offer usage limit'; end if;
 -- A real row write additionally fences repeatable-read snapshots: a concurrent
 -- snapshot cannot pass a stale count after waiting; PostgreSQL must serialize/abort.
 update public.website_promotions set usage_serial=usage_serial+1 where website_promotions.code=promo.code;
 insert into distribution_private.promotion_uses(request_id,code,guest_email_hash,state) values(new.request_id,promo.code,email_hash,'reserved');
 return new;
end $$;
revoke all on function distribution_private.reserve_promotion_use() from public,anon,authenticated,service_role;
create trigger promotion_usage_reserve after insert on distribution_private.payment_intents for each row execute function distribution_private.reserve_promotion_use();

create function distribution_private.finalize_promotion_use() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.state='confirmed' and old.state is distinct from 'confirmed' then
  update distribution_private.promotion_uses set state='redeemed',updated_at=now() where request_id=new.request_id and state='reserved';
 end if;
 -- Never restore usage merely on clock expiry, payment failure, cancellation click,
 -- or an intent labelled released: a provider order can remain payable after each.
 -- Pre-provider abandoned quote creates no intent/use. Existing safe close-unused
 -- rejects any request with an intent. Confirmed-booking cancellation keeps use.
 return new;
end $$;
revoke all on function distribution_private.finalize_promotion_use() from public,anon,authenticated,service_role;
create trigger promotion_usage_finalize after update of state on distribution_private.payment_intents for each row execute function distribution_private.finalize_promotion_use();

-- Layer onto the restriction-aware admin RPC installed by 00300. Never bypass its
-- validation/revision lock. A failed cap edit rolls back the underlying save too.
alter function public.save_managed_website_promotion(jsonb,integer) rename to save_managed_website_promotion_pre_caps;
revoke all on function public.save_managed_website_promotion_pre_caps(jsonb,integer) from public,anon,authenticated,service_role;
create function public.save_managed_website_promotion(p_settings jsonb,p_expected_revision integer default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; total_cap integer; guest_cap integer; v_code text;
begin
 if auth.uid() is null or not coalesce(public.is_admin_new(),false) then raise exception 'Administrator required' using errcode='42501'; end if;
 if p_settings->>'total_usage_limit' is not null and p_settings->>'total_usage_limit' !~ '^[1-9][0-9]*$' then raise exception 'Total usage limit must be a positive whole number or blank'; end if;
 if p_settings->>'per_guest_usage_limit' is not null and p_settings->>'per_guest_usage_limit' !~ '^[1-9][0-9]*$' then raise exception 'Per-email usage limit must be a positive whole number or blank'; end if;
 total_cap:=(p_settings->>'total_usage_limit')::integer; guest_cap:=(p_settings->>'per_guest_usage_limit')::integer;
 result:=public.save_managed_website_promotion_pre_caps(p_settings,p_expected_revision);
 v_code:=result->>'code';
 -- Existing callers that only toggle/edit non-cap fields must preserve current caps.
 if not (p_settings ? 'total_usage_limit') then total_cap:=(result->>'total_usage_limit')::integer; end if;
 if not (p_settings ? 'per_guest_usage_limit') then guest_cap:=(result->>'per_guest_usage_limit')::integer; end if;
 if guest_cap is not null and exists(select from distribution_private.promotion_uses where code=v_code and guest_email_hash is null) then
  raise exception 'Historical offer use has no guest email; reconcile before enabling a per-email cap';
 end if;
 update public.website_promotions set total_usage_limit=total_cap,per_guest_usage_limit=guest_cap where code=v_code returning to_jsonb(website_promotions.*) into result;
 return result;
end $$;
revoke all on function public.save_managed_website_promotion(jsonb,integer) from public,anon;
grant execute on function public.save_managed_website_promotion(jsonb,integer) to authenticated;
