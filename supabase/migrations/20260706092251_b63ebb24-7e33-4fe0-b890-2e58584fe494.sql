
revoke execute on function public.has_role_slug(uuid, text) from public, anon;
revoke execute on function public.has_permission(uuid, text) from public, anon;
revoke execute on function public.is_admin(uuid) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.has_role_slug(uuid, text) to authenticated;
grant execute on function public.has_permission(uuid, text) to authenticated;
grant execute on function public.is_admin(uuid) to authenticated;
