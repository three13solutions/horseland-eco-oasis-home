-- EP300 is staged behind a service-only OFF gate. Installing this migration
-- never changes an existing quote/order or enables a live discount.
create table public.website_promo_rollout (
 id boolean primary key default true check(id), enabled boolean not null default false
);
insert into public.website_promo_rollout(id,enabled) values(true,false);
alter table public.website_promo_rollout enable row level security;
revoke all on public.website_promo_rollout from public,anon,authenticated;
grant all on public.website_promo_rollout to service_role;
create trigger zz_activity_log after insert or update or delete on public.website_promo_rollout
 for each row execute function public.record_activity_log();

create table public.website_promotions (
 code text primary key check(code='EP300'),
 label text not null default '₹300 off the room-only rate per night',
 amount_per_night numeric(10,2) not null default 300 check(amount_per_night=300),
 is_active boolean not null default true,
 revision integer not null default 1 check(revision > 0),
 updated_at timestamptz not null default now(),
 updated_by uuid
);
alter table public.website_promotions enable row level security;
revoke all on public.website_promotions from public,anon,authenticated;
grant select on public.website_promotions to authenticated;
grant all on public.website_promotions to service_role;
create policy website_promotions_admin_read on public.website_promotions for select to authenticated
 using (auth.uid() is not null and public.is_admin_new());
create trigger zz_activity_log after insert or update or delete on public.website_promotions
 for each row execute function public.record_activity_log();
insert into public.website_promotions(code) values('EP300');

create function public.website_promotion_settings() returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or not public.is_admin_new() then raise exception 'Administrator required'; end if;
 return jsonb_build_object('enabled',(select enabled from public.website_promo_rollout where id),
 'offers',coalesce((select jsonb_agg(to_jsonb(p)) from public.website_promotions p),'[]'::jsonb));
end $$;
revoke all on function public.website_promotion_settings() from public,anon;
grant execute on function public.website_promotion_settings() to authenticated;

create function public.save_website_promotion(p_code text,p_expected_revision integer,p_active boolean)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v public.website_promotions;
begin
 if auth.uid() is null or not public.is_admin_new() then raise exception 'Administrator required'; end if;
 if p_active is null then raise exception 'Choose offer status'; end if;
 select * into v from public.website_promotions where code=p_code for update;
 if not found or v.revision is distinct from p_expected_revision then raise exception 'Promotion changed. Reload before saving'; end if;
 update public.website_promotions set is_active=p_active,revision=revision+1,updated_at=now(),updated_by=auth.uid() where code=p_code returning * into v;
 return to_jsonb(v);
end $$;
revoke all on function public.save_website_promotion(text,integer,boolean) from public,anon;
grant execute on function public.save_website_promotion(text,integer,boolean) to authenticated;
-- Redemption is bound to distribution_private.payment_intents.request_id and
-- finalized booking validated_quote.promotion. Existing idempotent checkout
-- stores the discount/fingerprint atomically with its inventory hold; no separate
-- increment counter that can double-redeem on payment retry is introduced.
-- No expiry, per-user limits, or cumulative use cap are invented for this offer.
