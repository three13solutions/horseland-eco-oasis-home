-- Append-only, stay-date effective day definitions. Later revisions win only
-- within their date range; after a bounded rule ends the prior rule resumes.
create table public.pricing_day_rules (
 revision bigint generated always as identity primary key,
 effective_from date not null,
 effective_to date,
 weekend_days integer[] not null,
 based_on_revision bigint not null,
 created_at timestamptz not null default now(),
 created_by uuid default auth.uid(),
 check (effective_to is null or effective_to >= effective_from),
 check (cardinality(weekend_days) between 0 and 7 and weekend_days <@ array[0,1,2,3,4,5,6])
);
alter table public.pricing_day_rules enable row level security;
create trigger zz_activity_log after insert or update or delete on public.pricing_day_rules for each row execute function public.record_activity_log();
create policy pricing_day_rules_read on public.pricing_day_rules for select to anon,authenticated using (true);
create policy pricing_day_rules_add on public.pricing_day_rules for insert to authenticated with check (auth.uid() is not null and public.is_admin_new());
revoke all on public.pricing_day_rules from anon,authenticated;
grant select(revision,effective_from,effective_to,weekend_days) on public.pricing_day_rules to anon,authenticated;
grant insert(effective_from,effective_to,weekend_days,based_on_revision) on public.pricing_day_rules to authenticated;
grant usage on sequence public.pricing_day_rules_revision_seq to authenticated;

create function public.guard_pricing_day_rule() returns trigger
language plpgsql security invoker set search_path=public as $$
declare v_revision bigint;
begin
 if tg_op <> 'INSERT' then raise exception 'Day rules are append-only; add a new effective rule'; end if;
 if current_user not in ('postgres','service_role') and (auth.uid() is null or not public.is_admin_new()) then raise exception 'Administrator required'; end if;
 perform pg_advisory_xact_lock(717171135);
 select coalesce(max(revision),0) into v_revision from public.pricing_day_rules;
 if new.based_on_revision is distinct from v_revision then raise exception 'Day rules changed. Reload before saving'; end if;
 if new.effective_from < (now() at time zone 'Asia/Kolkata')::date then raise exception 'Historical day definitions cannot be changed'; end if;
 if new.weekend_days is null or exists(select 1 from unnest(new.weekend_days) d where d is null) then raise exception 'Invalid weekend days'; end if;
 new.weekend_days := array(select distinct d from unnest(new.weekend_days) d order by d);
 new.created_at:=now(); new.created_by:=auth.uid();
 return new;
end $$;
create trigger pricing_day_rules_guard before insert or update or delete on public.pricing_day_rules for each row execute function public.guard_pricing_day_rule();

create function public.save_pricing_day_rule(p_effective_from date,p_effective_to date,p_weekend_days integer[],p_expected_revision bigint)
returns bigint language plpgsql security invoker set search_path=public as $$
declare v_revision bigint;
begin
 insert into public.pricing_day_rules(effective_from,effective_to,weekend_days,based_on_revision)
 values(p_effective_from,p_effective_to,p_weekend_days,p_expected_revision) returning revision into v_revision;
 return v_revision;
end $$;
revoke all on function public.save_pricing_day_rule(date,date,integer[],bigint) from public,anon;
grant execute on function public.save_pricing_day_rule(date,date,integer[],bigint) to authenticated;

create function public.is_pricing_weekend(p_date date,p_legacy_days integer[] default array[0,5,6])
returns boolean language sql stable security invoker set search_path=public as $$
 select extract(dow from p_date)::integer = any(coalesce(
 (select weekend_days from public.pricing_day_rules where effective_from <= p_date
 and (effective_to is null or effective_to >= p_date) order by revision desc limit 1),p_legacy_days));
$$;
grant execute on function public.is_pricing_weekend(date,integer[]) to anon,authenticated;

-- Patch only known expressions in currently deployed definitions, preserving
-- existing guards/modifiers instead of overwriting them with stale migration SQL.
do $$
declare r record; d text; old_expr text; patched integer:=0;
begin
 for r in select oid,proname from pg_proc where pronamespace='public'::regnamespace and proname in
 ('calculate_rate_variants','calculate_rate_variants_legacy_20261025','calculate_rate_variants_v2','get_base_price_for_date') loop
  d:=pg_get_functiondef(r.oid);
  if r.proname='calculate_rate_variants_v2' then
   old_expr:='extract(dow from v_date) in (0,5,6)';
   if position(old_expr in d)=0 then raise exception 'Unrecognized weekend expression in %',r.proname; end if;
   d:=replace(d,old_expr,'public.is_pricing_weekend(v_date, array[0,5,6])');
  elsif r.proname='get_base_price_for_date' then
   old_expr:='EXTRACT(DOW FROM p_date) IN (0, 6)';
   if position(old_expr in d)=0 then raise exception 'Unrecognized weekend expression in %',r.proname; end if;
   d:=replace(d,old_expr,'public.is_pricing_weekend(p_date, array[0,6])');
  else
   old_expr:='v_day_of_week IN (0, 5, 6)';
   if position(old_expr in d)=0 then raise exception 'Unrecognized weekend expression in %',r.proname; end if;
   d:=replace(d,old_expr,'public.is_pricing_weekend(v_date, array[0,5,6])');
  end if;
  execute d; patched:=patched+1;
 end loop;
 if patched<>4 then raise exception 'Expected four pricing entry points, found %',patched; end if;
end $$;
-- No activation seed here: apply Saturday-only rule after coordinated rollout.
