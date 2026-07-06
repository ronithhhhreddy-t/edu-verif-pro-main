-- Insert faculty role
insert into public.roles (slug, name, description) 
values ('faculty', 'Faculty', 'Faculty members') 
on conflict (slug) do nothing;

-- Create an RPC to check if an admin user already exists
create or replace function public.has_admin_user()
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where r.slug = 'admin'
  );
$$;

-- Grant execution to anon so the signup page can check it
grant execute on function public.has_admin_user() to anon;
grant execute on function public.has_admin_user() to authenticated;

-- Update handle_new_user to use the selected role from metadata
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  admin_role_id uuid;
  student_role_id uuid;
  faculty_role_id uuid;
  target_role_id uuid;
  requested_role text;
begin
  insert into public.profiles(id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;

  select id into admin_role_id from public.roles where slug = 'admin';
  select id into student_role_id from public.roles where slug = 'student';
  select id into faculty_role_id from public.roles where slug = 'faculty';

  requested_role := new.raw_user_meta_data->>'role';

  -- If it is the first user (no admin exists), give them admin
  if not public.has_admin_user() then
    target_role_id := admin_role_id;
  elsif requested_role = 'faculty' then
    target_role_id := faculty_role_id;
  else
    target_role_id := student_role_id; -- default to student
  end if;

  if target_role_id is not null then
    insert into public.user_roles(user_id, role_id) values (new.id, target_role_id) on conflict do nothing;
  end if;

  return new;
end; $$;
