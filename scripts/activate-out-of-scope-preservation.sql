-- Execute after approved EP records, before activate_live(), in the SAME transaction.
do $preserve$
declare r record; p record; captured_versions jsonb; source_amount numeric; source_version uuid;
begin
 if exists(select 1 from pricing_preservation_periods where preservation_mode='full_pricing' and is_active) then raise exception 'Full preservation already configured; inspect before retry';end if;
 select jsonb_agg(to_jsonb(v) order by v.effective_from,v.recorded_at,v.id) into captured_versions from meal_supplement_versions v;
 select amount,id into source_amount,source_version from meal_supplement_versions where plan_code='FB' and effective_from<=current_date order by effective_from desc,recorded_at desc,id limit 1;
 if source_amount is distinct from 1000::numeric then raise exception 'Capture original meal schedule before activation';end if;
 for r in select rt.id,rt.name,min(a.start_date) first_date,max(a.end_date) last_date
 from room_types rt left join rate_plan_anchors a on a.room_type_id=rt.id and a.name like 'Approved EP Nov2026%' and a.is_active and a.source_meal_plan_code='RO'
 group by rt.id,rt.name loop
  for p in select '-infinity'::date start_date,coalesce(r.first_date-1,'infinity'::date) end_date
    union all select r.last_date+1,'infinity'::date where r.last_date is not null loop
   insert into pricing_preservation_periods(name,room_type_id,start_date,end_date,source_meal_rate,source_meal_version,fb_constraint_rate,preserve_legacy_days,preserve_legacy_ep,source_snapshot,is_active,preservation_mode,meal_version_snapshot)
   values('Existing full pricing · '||r.name,r.id,p.start_date,p.end_date,source_amount,source_version,source_amount,true,false,
    jsonb_build_object('captured_at',now(),'reason','User requested current pricing retained for other categories and dates outside approved sheet; existing dynamic rules remain active','scope','complement_of_approved_ep_coverage'),true,'full_pricing',captured_versions);
  end loop;
 end loop;
 if (select count(*) from pricing_preservation_periods where is_active and preservation_mode='full_pricing')<>(select count(*)+4 from room_types) then
  raise exception 'Unexpected full preservation coverage count';end if;
 if exists(select 1 from pricing_preservation_periods pp join rate_plan_anchors a on a.room_type_id=pp.room_type_id
  where pp.is_active and pp.preservation_mode='full_pricing' and a.is_active and a.name like 'Approved EP Nov2026%'
  and daterange(pp.start_date,pp.end_date,'[]') && daterange(a.start_date,a.end_date,'[]')) then
  raise exception 'Preservation overlaps approved EP coverage';end if;
 if exists(select 1 from pricing_preservation_periods pp join pricing_preservation_periods q on pp.room_type_id=q.room_type_id and pp.id<q.id
  where pp.is_active and q.is_active and daterange(pp.start_date,pp.end_date,'[]') && daterange(q.start_date,q.end_date,'[]')) then
  raise exception 'Overlapping preservation policies require review';end if;
end $preserve$;
