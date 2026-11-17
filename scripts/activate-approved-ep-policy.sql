-- TRANSACTION FRAGMENT ONLY. Execute within the coordinated meal/day-rule/EP
-- activation transaction after all migrations pass. Never execute independently.
-- The start is 17 November 2026 (user's current request); do not backdate a later
-- rollout silently. No booking, payment or inventory records are changed.
do $activate$
declare r record; period record; day text; source_version uuid; source_amount numeric;
 revision_now bigint; new_count integer:=0; resolved_room_id uuid; matched_count integer;
begin
 if (now() at time zone 'Asia/Kolkata')::date <> date '2026-11-17' then
   raise exception 'Review effective start date for a later rollout';
 end if;
 if exists(select 1 from rate_plan_anchors where name like 'Approved EP Nov2026%') then raise exception 'EP rollout already present; inspect rather than duplicate'; end if;
 if exists(select 1 from rate_plan_anchors where is_active and priority>=200) then raise exception 'New competing high-priority rates require review'; end if;
 -- Capture old conversion BEFORE shared meal activation appends the new version.
 select amount,id into source_amount,source_version from meal_supplement_versions
 where plan_code='FB' and effective_from<='2026-12-24' order by effective_from desc,recorded_at desc,id limit 1;
 if source_amount is distinct from 1000::numeric then raise exception 'Expected current FB1000 source; capture/review again';end if;
 if exists(select 1 from meal_supplement_versions where plan_code='FB' and effective_from>'2026-12-24' and effective_from<='2027-01-01' and amount<>1000) then raise exception 'Festive source changes need split policy periods';end if;
 if (select count(*) from room_types where name in ('Basement Hideouts','Standard','Deluxe','Superior'))<>4 then
   raise exception 'Approved four room types missing or ambiguous; resolve exact names before rollout';
 end if;
 for r in select * from (values
 ('Basement Hideouts',2000,3500,900,600,1200,900),
 ('Standard',2500,4500,900,600,1200,900),
 ('Deluxe',3500,6000,1000,600,1200,900),
 ('Superior',5500,8000,1000,600,1200,900)
 ) x(name,weekday,weekend,weekday_adult,weekday_child,weekend_adult,weekend_child) loop
   select count(*) into matched_count from room_types where name=r.name;
   if matched_count<>1 then raise exception 'Expected exactly one room type named %, found %',r.name,matched_count;end if;
   select id into strict resolved_room_id from room_types where name=r.name;
   insert into pricing_preservation_periods(name,room_type_id,start_date,end_date,source_meal_rate,source_meal_version,fb_constraint_rate,preserve_legacy_days,preserve_legacy_ep,source_snapshot,is_active)
   values('Festive existing EP policy · '||r.name,resolved_room_id,'2026-12-24','2027-01-01',source_amount,source_version,source_amount,true,true,
     jsonb_build_object('captured_at',now(),'reason','User requested preservation of current EP policy for excluded festive period; dynamic policy retained, new target meals added',
       'source_meal_version',source_version,'source_meal_rate',source_amount,
       'existing_anchors',(select coalesce(jsonb_agg(to_jsonb(a)),'[]'::jsonb) from rate_plan_anchors a where a.room_type_id=resolved_room_id)),true);
   for period in select * from(values(date '2026-11-17',date '2026-12-23'),(date '2027-01-02',date '2027-03-31')) p(start_date,end_date) loop
     foreach day in array array['weekday','weekend'] loop
       insert into rate_plan_anchors(name,room_type_id,amount,source_meal_plan_code,quoted_nights,included_adults,start_date,end_date,min_nights,max_nights,day_type,
        extra_adult_per_night,extra_child_per_night,extra_infant_per_night,priority,is_active,verified_basis,modifier_policy)
       values('Approved EP Nov2026 · '||r.name||' · '||day||' · '||period.start_date,resolved_room_id,
        case day when 'weekday' then r.weekday else r.weekend end,'RO',1,2,period.start_date,period.end_date,1,null,day,
        case day when 'weekday' then r.weekday_adult else r.weekend_adult end,
        case day when 'weekday' then r.weekday_child else r.weekend_child end,0,200,true,true,'none');
       new_count:=new_count+1;
     end loop;
   end loop;
 end loop;
 if new_count<>16 then raise exception 'Expected16 EP anchors';end if;
 select coalesce(max(revision),0) into revision_now from pricing_day_rules;
 perform save_pricing_day_rule('2026-11-17',null,array[6],revision_now);
end $activate$;
