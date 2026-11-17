-- Date-specific policy, not a hard-coded festive condition. Activation data is
-- separate and must include an auditable snapshot of the preserved source.
create table public.pricing_preservation_periods (
 id uuid primary key default gen_random_uuid(), name text not null,
 room_type_id uuid not null references public.room_types(id),
 start_date date not null,end_date date not null,
 source_meal_rate numeric not null check(source_meal_rate>=0),
 source_meal_version uuid,
 fb_constraint_rate numeric not null check(fb_constraint_rate>=0),
 preserve_legacy_days boolean not null default true,
 preserve_legacy_ep boolean not null default true,
 source_snapshot jsonb not null,
 is_active boolean not null default false,
 check(end_date>=start_date)
);
alter table public.pricing_preservation_periods enable row level security;
create policy preservation_read on public.pricing_preservation_periods for select to anon,authenticated using(is_active or public.is_admin_new());
revoke all on public.pricing_preservation_periods from anon,authenticated;
grant select on public.pricing_preservation_periods to anon,authenticated;
create trigger zz_activity_log after insert or update or delete on public.pricing_preservation_periods for each row execute function public.record_activity_log();
create function public.get_pricing_preservation_policy(p_room_type_id uuid,p_date date)
returns jsonb language sql stable security invoker set search_path=public as $$
 select to_jsonb(p) from pricing_preservation_periods p where p.is_active and p.room_type_id=p_room_type_id
 and p_date between p.start_date and p.end_date order by p.start_date desc,p.id limit 1;
$$;
-- The protected period retains existing day-definition semantics in each legacy
-- resolver, even though other dates adopt the newly published Saturday rule.
create or replace function public.is_pricing_weekend(p_date date,p_legacy_days integer[] default array[0,5,6])
returns boolean language sql stable security invoker set search_path=public as $$
 select extract(dow from p_date)::integer = any(case when exists(select 1 from pricing_preservation_periods
 where is_active and preserve_legacy_days and p_date between start_date and end_date) then p_legacy_days else coalesce(
 (select weekend_days from public.pricing_day_rules where effective_from<=p_date
 and (effective_to is null or effective_to>=p_date) order by revision desc limit 1),p_legacy_days) end);
$$;

-- Unapplied until coordinated release. The legacy-night helper retains the
-- ORIGINAL stay length for tactical eligibility; it never recasts a night as a
-- one-night booking. Legacy inclusive amounts are not presented as EP rates.
create function public.calculate_legacy_rate_night_context(
 p_room_type_id uuid,p_check_in date,p_check_out date,p_room_unit_id uuid,
 p_adults_count integer,p_children_count integer,p_infants_count integer,p_booking_channel text,p_pricing_date date
) returns numeric language plpgsql security invoker set search_path=public as $$
declare
 v_nights integer:=p_check_out-p_check_in;
 v_date date:=p_pricing_date;
 v_room_category_id uuid;
 v_day_of_week integer;
 v_day_type text;
 v_override record;
 v_daily_room_rate numeric;
 v_extra_adult_charge numeric;
 v_extra_child_charge numeric;
 v_extra_adults integer:=greatest(0,p_adults_count-2);
 v_extra_children integer:=p_children_count;
begin
 if p_pricing_date is null or p_check_in is null or p_check_out is null or v_nights<1 or v_nights>365
 or p_pricing_date<p_check_in or p_pricing_date>=p_check_out or p_adults_count is null or p_adults_count<1
 or p_children_count is null or p_children_count<0 or p_infants_count is null or p_infants_count<0 then raise exception 'Invalid nightly fallback context'; end if;
 if not exists(select 1 from room_types r where r.id=p_room_type_id and r.pricing_status<>'configuration_required'
 and exists(select 1 from room_units u where u.room_type_id=r.id)) then raise exception 'Room pricing unavailable'; end if;
 select category_id into v_room_category_id from room_types where id=p_room_type_id;
        v_day_of_week := EXTRACT(DOW FROM v_date);
        IF public.is_pricing_weekend(v_date, array[0,5,6]) THEN
          v_day_type := 'weekend';
        ELSE
          v_day_type := 'weekday';
        END IF;

        -- Get tactical override matching the room category
        SELECT * INTO v_override 
        FROM tactical_overrides
        WHERE not public.rate_override_disabled(id) AND is_active = true 
          AND start_date <= v_date 
          AND end_date >= v_date
          AND override_price IS NOT NULL
          AND (occupancy_type IS NULL OR occupancy_type = 'double')
          AND (day_type IS NULL OR day_type = v_day_type)
          AND (min_nights IS NULL OR v_nights >= min_nights)
          AND (max_nights IS NULL OR v_nights <= max_nights)
          AND (min_adults IS NULL OR p_adults_count >= min_adults)
          AND (max_adults IS NULL OR p_adults_count <= max_adults)
          AND (
            (room_unit_id IS NOT NULL AND room_unit_id = p_room_unit_id)
            OR (room_type_id IS NOT NULL AND room_type_id = p_room_type_id AND room_unit_id IS NULL)
            OR (room_category_id IS NOT NULL AND room_category_id = v_room_category_id AND room_type_id IS NULL AND room_unit_id IS NULL)
          )
        ORDER BY 
          CASE WHEN room_unit_id IS NOT NULL THEN 1 WHEN room_type_id IS NOT NULL THEN 2 ELSE 3 END,
          min_nights DESC NULLS LAST, 
          created_at DESC
        LIMIT 1;

        IF v_override.override_price IS NOT NULL THEN
          v_daily_room_rate := v_override.override_price;
          
          -- Extra adult charges
          IF v_extra_adults > 0 THEN
            SELECT adjustment_value INTO v_extra_adult_charge 
            FROM tactical_overrides
            WHERE not public.rate_override_disabled(id) AND is_active = true 
              AND start_date <= v_date 
              AND end_date >= v_date
              AND occupancy_type = 'extra_adult' 
              AND adjustment_value IS NOT NULL
              AND (day_type IS NULL OR day_type = v_day_type)
              AND (min_nights IS NULL OR v_nights >= min_nights)
              AND (
                (room_unit_id IS NOT NULL AND room_unit_id = p_room_unit_id)
                OR (room_type_id IS NOT NULL AND room_type_id = p_room_type_id AND room_unit_id IS NULL)
                OR (room_category_id IS NOT NULL AND room_category_id = v_room_category_id AND room_type_id IS NULL AND room_unit_id IS NULL)
              )
            ORDER BY CASE WHEN room_unit_id IS NOT NULL THEN 1 WHEN room_type_id IS NOT NULL THEN 2 ELSE 3 END,
              min_nights DESC NULLS LAST, created_at DESC 
            LIMIT 1;
            v_daily_room_rate := v_daily_room_rate + COALESCE(v_extra_adult_charge, 0) * v_extra_adults;
          END IF;
          
          -- Extra child charges
          IF v_extra_children > 0 THEN
            SELECT adjustment_value INTO v_extra_child_charge 
            FROM tactical_overrides
            WHERE not public.rate_override_disabled(id) AND is_active = true 
              AND start_date <= v_date 
              AND end_date >= v_date
              AND occupancy_type = 'extra_child' 
              AND adjustment_value IS NOT NULL
              AND (day_type IS NULL OR day_type = v_day_type)
              AND (min_nights IS NULL OR v_nights >= min_nights)
              AND (
                (room_unit_id IS NOT NULL AND room_unit_id = p_room_unit_id)
                OR (room_type_id IS NOT NULL AND room_type_id = p_room_type_id AND room_unit_id IS NULL)
                OR (room_category_id IS NOT NULL AND room_category_id = v_room_category_id AND room_type_id IS NULL AND room_unit_id IS NULL)
              )
            ORDER BY CASE WHEN room_unit_id IS NOT NULL THEN 1 WHEN room_type_id IS NOT NULL THEN 2 ELSE 3 END,
              min_nights DESC NULLS LAST, created_at DESC 
            LIMIT 1;
            v_daily_room_rate := v_daily_room_rate + COALESCE(v_extra_child_charge, 0) * v_extra_children;
          END IF;
        ELSE
          -- Fallback to dynamic pricing if no override found
          SELECT final_price INTO v_daily_room_rate 
          FROM calculate_dynamic_price_legacy_20261025(
            p_room_type_id, p_room_unit_id, v_date, p_adults_count, p_children_count, p_infants_count, p_booking_channel
          );
        END IF;
        

 if v_daily_room_rate is null or v_daily_room_rate<0 then raise exception 'Legacy nightly rate unavailable'; end if;
 return v_daily_room_rate;
end $$;
grant execute on function public.calculate_legacy_rate_night_context(uuid,date,date,uuid,integer,integer,integer,text,date) to anon,authenticated;

-- Rewrite guarded expressions only; preserve live modifiers and other guards.
do $patch$
declare d text;
begin
 d:=pg_get_functiondef('public.calculate_rate_variants_v2(uuid,date,date,uuid,integer,integer,integer,text)'::regprocedure);
 if position($old0$v_los_discount numeric;$old0$ in d)=0 then raise exception 'Mixed-night patch precondition 0 failed'; end if;
 d:=replace(d,$old0$v_los_discount numeric;$old0$,$new0$v_preservation jsonb; v_legacy_night numeric; v_has_verified boolean:=false; v_los_discount numeric;$new0$);
 if position($old1$if not found then v_covered:=false; exit; end if;$old1$ in d)=0 then raise exception 'Mixed-night patch precondition 1 failed'; end if;
 d:=replace(d,$old1$if not found then v_covered:=false; exit; end if;$old1$,$new1$if not found then
     v_preservation:=public.get_pricing_preservation_policy(p_room_type_id,v_date);
     if v_preservation is null then v_covered:=false; else v_has_verified:=true; end if;
     v_coverage:=v_coverage||jsonb_build_object('date',v_date,'legacy',true); continue; end if;
   v_has_verified:=true;$new1$);
 if position($old2$if not v_covered then$old2$ in d)=0 then raise exception 'Mixed-night patch precondition 2 failed'; end if;
 d:=replace(d,$old2$if not v_covered then$old2$,$new2$if not v_covered and not v_has_verified then$new2$);
 if position($old3$     select * into v_anchor from jsonb_populate_record(null::public.rate_plan_anchors,v_entry->'anchor');$old3$ in d)=0 then raise exception 'Mixed-night patch precondition 3 failed'; end if;
 d:=replace(d,$old3$     select * into v_anchor from jsonb_populate_record(null::public.rate_plan_anchors,v_entry->'anchor');$old3$,$new3$     v_preservation:=public.get_pricing_preservation_policy(p_room_type_id,v_date);
     if coalesce((v_entry->>'legacy')::boolean,false) then
       v_legacy_night:=public.calculate_legacy_rate_night_context(p_room_type_id,p_check_in,p_check_out,p_room_unit_id,p_adults_count,p_children_count,p_infants_count,p_booking_channel,v_date);
       v_total_room:=v_total_room+v_legacy_night;
       if v_preservation is not null and (v_preservation->>'preserve_legacy_ep')::boolean then
         select amount,id into v_target_rate,v_target_version from public.meal_supplement_versions where meal_plan_id=v_plan.id and effective_from<=v_date order by effective_from desc,recorded_at desc,id limit 1;
         if v_target_rate is null then raise exception 'No meal rate for preserved EP policy'; end if;
         v_total_meal:=v_total_meal+v_target_rate*v_all_guests;
         v_breakdown:=v_breakdown||jsonb_build_object('date',v_date,'pricing_status','preserved_policy_ep',
           'preservation_policy_id',v_preservation->>'id','accommodation_after_modifiers',v_legacy_night,
           'promo_eligible_ep',false,'selected_meal_rate',v_target_rate,'selected_meal_version',v_target_version,
           'meal_guests',v_all_guests,'meal_cost',v_target_rate*v_all_guests,
           'pricing_message','Date-specific policy retains existing EP calculation; current selected meals are added.');
         continue;
       end if;
       v_breakdown:=v_breakdown||jsonb_build_object('date',v_date,'pricing_status','legacy_basis_unverified',
         'legacy_inclusive_amount',v_legacy_night,'promo_eligible_ep',false,
         'pricing_message','Existing fallback policy for this night; no EP or meal split inferred. Original full-stay eligibility retained.');
       continue;
     end if;
     select * into v_anchor from jsonb_populate_record(null::public.rate_plan_anchors,v_entry->'anchor');$new3$);
 if position($old4$'room_only',v_room,$old4$ in d)=0 then raise exception 'Mixed-night patch precondition 4 failed'; end if;
 d:=replace(d,$old4$'room_only',v_room,$old4$,$new4$'room_only',v_room,'promo_eligible_ep',v_anchor.source_meal_plan_code='RO',$new4$);
 if position($old5$'pricing_status','verified',$old5$ in d)=0 then raise exception 'Mixed-night patch precondition 5 failed'; end if;
 d:=replace(d,$old5$'pricing_status','verified',$old5$,$new5$'pricing_status',case when v_covered then 'verified' else 'legacy_basis_unverified' end,
      'pricing_mode',case when v_covered then 'verified' else 'mixed_verified_and_legacy' end,
      'pricing_message',case when v_covered then null else 'Some nights use existing fallback pricing without an EP or meal split.' end,$new5$);
 if position($old6$     if v_source_rate is null then$old6$ in d)=0 then raise exception 'Mixed-night patch precondition 6 failed'; end if;
 d:=replace(d,$old6$     if v_source_rate is null then$old6$,$new6$     if v_preservation is not null and v_anchor.source_meal_plan_code='FB' then v_source_rate:=(v_preservation->>'source_meal_rate')::numeric; v_source_version:=(v_preservation->>'source_meal_version')::uuid; end if;
     if v_source_rate is null then$new6$);
 if position($old7$       if v_fb_rate is null then$old7$ in d)=0 then raise exception 'Mixed-night patch precondition 7 failed'; end if;
 d:=replace(d,$old7$       if v_fb_rate is null then$old7$,$new7$       if v_preservation is not null then v_fb_rate:=(v_preservation->>'fb_constraint_rate')::numeric; end if;
       if v_fb_rate is null then$new7$);
 if position($old8$'source_meal_rate',v_source_rate,$old8$ in d)=0 then raise exception 'Mixed-night patch precondition 8 failed'; end if;
 d:=replace(d,$old8$'source_meal_rate',v_source_rate,$old8$,$new8$'preservation_policy_id',v_preservation->>'id','source_meal_rate',v_source_rate,$new8$);
 execute d;
end $patch$;
