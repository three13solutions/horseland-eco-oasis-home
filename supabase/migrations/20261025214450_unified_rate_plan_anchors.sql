-- Reversible additive rate-plan configuration. Existing tariffs and bookings are not rewritten.
create table public.rate_plan_anchors (
 id uuid primary key default gen_random_uuid(), name text not null,
 room_category_id uuid references public.room_categories(id),
 room_type_id uuid references public.room_types(id), room_unit_id uuid references public.room_units(id),
 amount numeric(14,2) not null check(amount>=0),
 source_meal_plan_code text not null check(source_meal_plan_code in ('RO','BB','HB','FB')),
 quoted_nights integer not null default 1 check(quoted_nights between 1 and 365),
 included_adults integer not null default 2 check(included_adults between 1 and 100),
 start_date date, end_date date, min_nights integer not null default 1 check(min_nights>=1), max_nights integer,
 day_type text not null default 'all' check(day_type in ('all','weekday','weekend')),
 extra_adult_per_night numeric(14,2) check(extra_adult_per_night>=0),
 extra_child_per_night numeric(14,2) check(extra_child_per_night>=0),
 extra_infant_per_night numeric(14,2) not null default 0 check(extra_infant_per_night>=0),
 priority integer not null default 0,
 los_min_nights integer check(los_min_nights>=2),
 los_adjustment_type text check(los_adjustment_type in ('fixed','percentage')),
 los_adjustment_value numeric check(los_adjustment_value>=0),
 is_active boolean not null default false, verified_basis boolean not null default false,
 source_override_id uuid unique references public.tactical_overrides(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(num_nonnulls(room_category_id,room_type_id,room_unit_id)=1),
 check(end_date is null or start_date is null or end_date>=start_date),
 check(max_nights is null or max_nights>=min_nights),
 check(not is_active or verified_basis),
 check((los_min_nights is null and los_adjustment_type is null and los_adjustment_value is null) or
 (los_min_nights is not null and los_adjustment_type is not null and los_adjustment_value is not null and quoted_nights=1)),
 check(los_adjustment_type is distinct from 'percentage' or los_adjustment_value<=100)
);
alter table public.rate_plan_anchors enable row level security;
grant select on public.rate_plan_anchors to anon,authenticated;
grant insert,update on public.rate_plan_anchors to authenticated;
grant all on public.rate_plan_anchors to service_role;
create policy "Read active rate anchors" on public.rate_plan_anchors for select to anon,authenticated using(is_active and verified_basis);
create policy "Administrators manage rate anchors" on public.rate_plan_anchors for all to authenticated using(public.is_admin_new()) with check(public.is_admin_new());
create index rate_plan_scope_dates on public.rate_plan_anchors(room_type_id,start_date,end_date) where is_active;
create table public.rate_plan_anchor_versions (
 id uuid primary key default gen_random_uuid(), anchor_id uuid not null references public.rate_plan_anchors(id),
 recorded_at timestamptz not null default now(), changed_by uuid default auth.uid(), snapshot jsonb not null
);
alter table public.rate_plan_anchor_versions enable row level security;
grant select,insert on public.rate_plan_anchor_versions to authenticated;
grant all on public.rate_plan_anchor_versions to service_role;
create policy "Admins read anchor history" on public.rate_plan_anchor_versions for select to authenticated using(public.is_admin_new());
create policy "Admins append anchor history" on public.rate_plan_anchor_versions for insert to authenticated with check(public.is_admin_new());
create index rate_plan_history_anchor on public.rate_plan_anchor_versions(anchor_id,recorded_at desc);
create or replace function public.record_rate_plan_anchor_version() returns trigger language plpgsql security invoker set search_path=public as $$
begin
 new.updated_at:=clock_timestamp();
 if TG_OP='UPDATE' then
   insert into public.rate_plan_anchor_versions(anchor_id,snapshot) values(old.id,to_jsonb(old));
 end if;
 return new;
end $$;
create trigger record_rate_plan_anchor_change before update on public.rate_plan_anchors for each row execute function public.record_rate_plan_anchor_version();

alter table public.meal_plan_rules add column supplement_effective_from date not null default current_date;
create table public.meal_supplement_versions (
 id uuid primary key default gen_random_uuid(), meal_plan_id uuid not null references public.meal_plan_rules(id),
 plan_code text not null, amount numeric(14,2) not null check(amount>=0), effective_from date not null,
 period text not null check(period='per_night'), guest_basis text not null check(guest_basis='all_guests'),
 recorded_at timestamptz not null default now(), changed_by uuid default auth.uid()
);
alter table public.meal_supplement_versions enable row level security;
grant select on public.meal_supplement_versions to anon,authenticated;
grant insert on public.meal_supplement_versions to authenticated;
grant all on public.meal_supplement_versions to service_role;
create policy "Read meal price versions" on public.meal_supplement_versions for select to anon,authenticated using(true);
create policy "Admins append meal price versions" on public.meal_supplement_versions for insert to authenticated with check(public.is_admin_new());
create index meal_version_effective on public.meal_supplement_versions(plan_code,effective_from desc,recorded_at desc);
insert into public.meal_supplement_versions(meal_plan_id,plan_code,amount,effective_from,period,guest_basis)
select id,plan_code,supplement_per_person_inr,current_date,supplement_period,supplement_guest_basis from public.meal_plan_rules where plan_code in ('RO','BB','HB','FB');
create or replace function public.record_meal_supplement_version() returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if (TG_OP='INSERT' or new.supplement_per_person_inr is distinct from old.supplement_per_person_inr or new.supplement_effective_from is distinct from old.supplement_effective_from) and new.supplement_per_person_inr is not null then
   if new.supplement_period is distinct from 'per_night' or new.supplement_guest_basis is distinct from 'all_guests' then
      raise exception 'Only approved per-night/all-guests meal basis is supported';
   end if;
   if new.plan_code='RO' and new.supplement_per_person_inr<>0 then raise exception 'Room Only meal supplement must be zero'; end if;
   insert into public.meal_supplement_versions(meal_plan_id,plan_code,amount,effective_from,period,guest_basis)
   values(new.id,new.plan_code,new.supplement_per_person_inr,new.supplement_effective_from,new.supplement_period,new.supplement_guest_basis);
 end if;
 return new;
end $$;
create trigger record_meal_supplement_change after insert or update on public.meal_plan_rules for each row execute function public.record_meal_supplement_version();

-- Payment snapshots contain customer requests: service role ONLY, never exposed to public clients.
create table public.booking_order_quotes (
 order_id text primary key, request jsonb not null, quote jsonb not null,
 amount numeric(14,2) not null check(amount>=0), currency text not null default 'INR',
 created_at timestamptz not null default now(), expires_at timestamptz
);
alter table public.booking_order_quotes enable row level security;
revoke all on public.booking_order_quotes from public,anon,authenticated;
grant all on public.booking_order_quotes to service_role;

-- Keep original sixty tactical records unchanged for traceability.
-- Only twenty double-occupancy anchors are migrated; forty extra rows remain RO nightly charges.
insert into public.rate_plan_anchors(name,room_type_id,amount,source_meal_plan_code,quoted_nights,included_adults,start_date,end_date,min_nights,max_nights,day_type,extra_adult_per_night,extra_child_per_night,is_active,verified_basis,source_override_id,priority)
select trim(t.reason)||' · '||rt.name||' · '||t.day_type||' · '||t.min_nights||'+ nights',t.room_type_id,t.override_price,'FB',
 case when t.min_nights=2 then 2 else 1 end,2,t.start_date,t.end_date,t.min_nights,t.max_nights,t.day_type,
 (select e.adjustment_value from public.tactical_overrides e where e.room_type_id=t.room_type_id and e.start_date=t.start_date and e.end_date=t.end_date and e.day_type=t.day_type and e.min_nights=t.min_nights and e.occupancy_type='extra_adult' and e.is_active order by e.created_at desc limit 1),
 (select e.adjustment_value from public.tactical_overrides e where e.room_type_id=t.room_type_id and e.start_date=t.start_date and e.end_date=t.end_date and e.day_type=t.day_type and e.min_nights=t.min_nights and e.occupancy_type='extra_child' and e.is_active order by e.created_at desc limit 1),
 t.is_active,true,t.id,100
from public.tactical_overrides t join public.room_types rt on rt.id=t.room_type_id
where t.start_date='2026-11-05' and t.end_date='2026-11-22' and t.occupancy_type='double'
 and t.meal_plan_code='all_meals_inclusive' and t.min_nights in (1,2) and t.override_price>0;
