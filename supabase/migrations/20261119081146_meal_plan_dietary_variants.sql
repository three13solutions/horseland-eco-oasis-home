SET LOCAL lock_timeout='5s';
-- ADMIN CONFIGURATION ONLY. No pricing function, quote, booking, or meal source is
-- changed by this migration. No default dietary variant is selected or seeded.
create table public.meal_plan_dietary_variants (
 id uuid primary key default gen_random_uuid(),
 meal_plan_id uuid not null references public.meal_plan_rules(id) on delete restrict,
 dietary_type text not null check(dietary_type in ('veg','nonveg','jain')),
 description text not null default '' check(length(description)<=4000),
 rate_per_person_inr numeric(12,2) not null check(rate_per_person_inr>=0 and rate_per_person_inr<10000000000),
 gallery_image_id uuid references public.gallery_images(id) on delete restrict,
 is_active boolean not null default false,
 revision integer not null default 1 check(revision>0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 updated_by uuid,
 unique(meal_plan_id,dietary_type)
);
comment on table public.meal_plan_dietary_variants is 'Future dietary-option configuration only; never consumed by current booking pricing or routing.';
comment on column public.meal_plan_dietary_variants.rate_per_person_inr is 'Explicit proposed adult reference dietary-plan supplement per person per occupied night. Configuration only; age application and guest allocation are not active.';
comment on column public.meal_plan_dietary_variants.is_active is 'Configuration enabled/disabled only. Does not publish, make bookable, or select a default dietary option.';
alter table public.meal_plan_dietary_variants enable row level security;
revoke all on public.meal_plan_dietary_variants from public,anon,authenticated,service_role;
grant select on public.meal_plan_dietary_variants to authenticated;
create policy dietary_variants_admin_read on public.meal_plan_dietary_variants for select to authenticated
 using(auth.uid() is not null and coalesce(public.is_admin_new(),false));
create trigger zz_activity_log after insert or update or delete on public.meal_plan_dietary_variants
 for each row execute function public.record_activity_log();

create function public.admin_meal_plan_dietary_variants() returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or not coalesce(public.is_admin_new(),false) then raise exception 'Administrator required' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(to_jsonb(v)||jsonb_build_object('plan_code',p.plan_code,'plan_name',p.plan_name,
 'picture_url',case when g.media_type='image' and g.image_url~* '^https?://' then g.image_url else null end,'picture_title',g.title,'picture_key',g.hardcoded_key) order by p.plan_code,v.dietary_type)
 from public.meal_plan_dietary_variants v join public.meal_plan_rules p on p.id=v.meal_plan_id left join public.gallery_images g on g.id=v.gallery_image_id),'[]'::jsonb);
end $$;
revoke all on function public.admin_meal_plan_dietary_variants() from public,anon;
grant execute on function public.admin_meal_plan_dietary_variants() to authenticated;

create function public.save_meal_plan_dietary_variant(p_settings jsonb,p_expected_revision integer default null) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare current_row public.meal_plan_dietary_variants; saved public.meal_plan_dietary_variants;
 plan_id uuid; media_id uuid; record_id uuid; diet text; rate numeric; details text; status boolean;
begin
 if auth.uid() is null or not coalesce(public.is_admin_new(),false) then raise exception 'Administrator required' using errcode='42501'; end if;
 if p_settings is null or jsonb_typeof(p_settings)<>'object' then raise exception 'Variant settings required'; end if;
 record_id:=nullif(p_settings->>'id','')::uuid;
 plan_id:=nullif(p_settings->>'meal_plan_id','')::uuid;media_id:=nullif(p_settings->>'gallery_image_id','')::uuid;
 diet:=p_settings->>'dietary_type';details:=p_settings->>'description';
 if plan_id is null or not exists(select from public.meal_plan_rules where id=plan_id) then raise exception 'Choose an existing meal plan'; end if;
 if diet is null or diet not in ('veg','nonveg','jain') then raise exception 'Choose Veg, Nonveg or Jain'; end if;
 if details is null or length(details)>4000 then raise exception 'Description must be at most 4000 characters'; end if;
 if jsonb_typeof(p_settings->'rate_per_person_inr') is distinct from 'number' then raise exception 'Enter an explicit per-person per-night rate'; end if;
 rate:=(p_settings->>'rate_per_person_inr')::numeric;
 if rate<0 or rate>=10000000000 or rate<>round(rate,2) then raise exception 'Rate must be nonnegative with at most two decimal places'; end if;
 if jsonb_typeof(p_settings->'is_active') is distinct from 'boolean' then raise exception 'Choose configuration status'; end if;
 status:=(p_settings->>'is_active')::boolean;
 if media_id is not null and not exists(select from public.gallery_images where id=media_id and media_type='image' and image_url~* '^https?://') then
  raise exception 'Choose an existing image from the media library';
 end if;
 -- Serialize competing creates for the same plan/type as well as edits to a row.
 perform pg_advisory_xact_lock(hashtext('dietary-variant:'||plan_id::text||':'||diet));
 if record_id is null then
  if p_expected_revision is not null then raise exception 'Variant changed. Reload before saving'; end if;
  if exists(select from public.meal_plan_dietary_variants where meal_plan_id=plan_id and dietary_type=diet) then raise exception 'This meal plan already has that dietary variant. Edit the existing record'; end if;
  insert into public.meal_plan_dietary_variants(meal_plan_id,dietary_type,description,rate_per_person_inr,gallery_image_id,is_active,updated_by)
  values(plan_id,diet,details,rate,media_id,status,auth.uid()) returning * into saved;
 else
  select * into current_row from public.meal_plan_dietary_variants where id=record_id for update;
  if not found or p_expected_revision is distinct from current_row.revision then raise exception 'Variant changed. Reload before saving'; end if;
  if plan_id<>current_row.meal_plan_id or diet<>current_row.dietary_type then raise exception 'Meal plan and dietary type cannot change. Disable this record and create the required variant'; end if;
  update public.meal_plan_dietary_variants set description=details,rate_per_person_inr=rate,gallery_image_id=media_id,is_active=status,
   revision=revision+1,updated_at=now(),updated_by=auth.uid() where id=record_id returning * into saved;
 end if;
 return (select to_jsonb(saved)||jsonb_build_object('plan_code',p.plan_code,'plan_name',p.plan_name,
 'picture_url',case when g.media_type='image' and g.image_url~* '^https?://' then g.image_url else null end,'picture_title',g.title,'picture_key',g.hardcoded_key)
 from public.meal_plan_rules p left join public.gallery_images g on g.id=saved.gallery_image_id where p.id=saved.meal_plan_id);
end $$;
revoke all on function public.save_meal_plan_dietary_variant(jsonb,integer) from public,anon;
grant execute on function public.save_meal_plan_dietary_variant(jsonb,integer) to authenticated;
