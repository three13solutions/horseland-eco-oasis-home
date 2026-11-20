create or replace function public.set_guest_age_pricing_active(p_active boolean) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or not coalesce(public.is_admin_new(),false) then raise exception 'Administrator required'; end if;
 update guest_pricing_private.release_state set active=p_active where id;
 perform public.log_admin_action('guest_age_policy', case when p_active then 'activate' else 'deactivate' end, null, jsonb_build_object('active',p_active));
 return public.get_guest_age_policy();
exception when undefined_function then
 return public.get_guest_age_policy();
end $$;
revoke all on function public.set_guest_age_pricing_active(boolean) from public,anon;
grant execute on function public.set_guest_age_pricing_active(boolean) to authenticated;