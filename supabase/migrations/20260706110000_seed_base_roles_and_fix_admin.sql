-- Insert default base roles if they do not exist
insert into public.roles (slug, name, description, is_system) 
values 
  ('admin', 'Administrator', 'Full system access', true),
  ('student', 'Student', 'Student access', true)
on conflict (slug) do nothing;

-- Ensure the faculty role exists (in case the previous migration wasn't run)
insert into public.roles (slug, name, description) 
values ('faculty', 'Faculty', 'Faculty members') 
on conflict (slug) do nothing;

-- Fix the existing first user (Admin) who was not granted the role because the role didn't exist
do $$
declare
  first_user_id uuid;
  admin_role_id uuid;
begin
  -- Get the admin role ID
  select id into admin_role_id from public.roles where slug = 'admin';

  -- Find the very first user created in auth.users
  select id into first_user_id 
  from auth.users 
  order by created_at asc 
  limit 1;

  -- If there is a first user, grant them the admin role
  if first_user_id is not null and admin_role_id is not null then
    insert into public.user_roles (user_id, role_id) 
    values (first_user_id, admin_role_id) 
    on conflict on constraint user_roles_user_id_role_id_key do nothing;
  end if;
end; $$;
