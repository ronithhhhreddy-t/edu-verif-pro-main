
-- ============ EXTENSIONS ============
create extension if not exists pgcrypto;

-- ============ UTILS ============
create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- ============ ROLES / PERMISSIONS (fully dynamic) ============
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_roles_updated before update on public.roles for each row execute function public.update_updated_at_column();

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

-- ============ PROFILES ============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated before update on public.profiles for each row execute function public.update_updated_at_column();

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  scope_department_id uuid, -- optional scoping
  created_at timestamptz not null default now(),
  unique (user_id, role_id)
);

-- ============ SECURITY DEFINER helpers ============
create or replace function public.has_role_slug(_user uuid, _slug text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = _user and r.slug = _slug
  );
$$;

create or replace function public.has_permission(_user uuid, _perm text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.permissions p on p.id = rp.permission_id
    where ur.user_id = _user and p.slug = _perm
  );
$$;

create or replace function public.is_admin(_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role_slug(_user, 'admin');
$$;

-- ============ MASTER DATA ============
create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  department_id uuid references public.departments(id) on delete set null,
  code text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.academic_years (
  id uuid primary key default gen_random_uuid(),
  label text unique not null, -- e.g. 2025-2026
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.semesters (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  academic_year_id uuid references public.academic_years(id) on delete set null,
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  website text,
  logo_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.domains (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.cohorts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  academic_year_id uuid references public.academic_years(id) on delete set null,
  start_date date,
  end_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.certificate_types (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text
);

-- ============ STUDENTS ============
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  roll_number text unique not null,
  full_name text not null,
  email text not null,
  phone text,
  gender text,
  department_id uuid references public.departments(id) on delete set null,
  program_id uuid references public.programs(id) on delete set null,
  academic_year_id uuid references public.academic_years(id) on delete set null,
  semester_id uuid references public.semesters(id) on delete set null,
  cohort_id uuid references public.cohorts(id) on delete set null,
  section text,
  status text not null default 'active',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_students_updated before update on public.students for each row execute function public.update_updated_at_column();
create index idx_students_dept on public.students(department_id);
create index idx_students_cohort on public.students(cohort_id);

-- ============ DYNAMIC FORMS ============
create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  version int not null default 1,
  status text not null default 'draft', -- draft, published, archived
  schema jsonb not null default '[]'::jsonb, -- field definitions
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_forms_updated before update on public.forms for each row execute function public.update_updated_at_column();

create table if not exists public.form_responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  submitted_by uuid references auth.users(id) on delete set null,
  student_id uuid references public.students(id) on delete set null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============ CERTIFICATES ============
create table if not exists public.certificate_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  domain_id uuid references public.domains(id) on delete set null,
  cohort_id uuid references public.cohorts(id) on delete set null,
  name text not null,
  file_url text,
  reference_features jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  submitted_by uuid references auth.users(id) on delete set null,
  cohort_id uuid references public.cohorts(id) on delete set null,
  domain_id uuid references public.domains(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  certificate_type_id uuid references public.certificate_types(id) on delete set null,
  certificate_number text,
  issue_date date,
  completion_date date,
  file_url text not null,
  file_mime text,
  file_size bigint,
  status text not null default 'pending', -- pending, ai_verified, needs_review, approved, rejected
  ai_confidence numeric,
  ai_authenticity numeric,
  ai_summary jsonb not null default '{}'::jsonb,
  ai_issues jsonb not null default '[]'::jsonb,
  extracted_data jsonb not null default '{}'::jsonb,
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewer_notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_certs_updated before update on public.certificates for each row execute function public.update_updated_at_column();
create index idx_certs_student on public.certificates(student_id);
create index idx_certs_status on public.certificates(status);

create table if not exists public.certificate_versions (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid not null references public.certificates(id) on delete cascade,
  file_url text not null,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.verification_logs (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid not null references public.certificates(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null, -- ai_run, approved, rejected, needs_review, note
  from_status text,
  to_status text,
  notes text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============ NOTIFICATIONS ============
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  link text,
  category text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notif_user on public.notifications(user_id, is_read);

-- ============ AUDIT LOGS ============
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  old_value jsonb,
  new_value jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

-- ============ SETTINGS (single key-value bag) ============
create table if not exists public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

-- ============ DOCUMENT TEMPLATES ============
create table if not exists public.document_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  content text not null default '', -- HTML with {{placeholders}}
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_doc_tmpl_updated before update on public.document_templates for each row execute function public.update_updated_at_column();

-- ============ GRANTS ============
grant select, insert, update, delete on
  public.roles, public.permissions, public.role_permissions,
  public.profiles, public.user_roles,
  public.departments, public.programs, public.academic_years, public.semesters,
  public.companies, public.domains, public.cohorts, public.certificate_types,
  public.students, public.forms, public.form_responses,
  public.certificate_templates, public.certificates, public.certificate_versions,
  public.verification_logs, public.notifications, public.audit_logs,
  public.settings, public.document_templates
to authenticated;
grant all on
  public.roles, public.permissions, public.role_permissions,
  public.profiles, public.user_roles,
  public.departments, public.programs, public.academic_years, public.semesters,
  public.companies, public.domains, public.cohorts, public.certificate_types,
  public.students, public.forms, public.form_responses,
  public.certificate_templates, public.certificates, public.certificate_versions,
  public.verification_logs, public.notifications, public.audit_logs,
  public.settings, public.document_templates
to service_role;

-- ============ RLS ============
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.departments enable row level security;
alter table public.programs enable row level security;
alter table public.academic_years enable row level security;
alter table public.semesters enable row level security;
alter table public.companies enable row level security;
alter table public.domains enable row level security;
alter table public.cohorts enable row level security;
alter table public.certificate_types enable row level security;
alter table public.students enable row level security;
alter table public.forms enable row level security;
alter table public.form_responses enable row level security;
alter table public.certificate_templates enable row level security;
alter table public.certificates enable row level security;
alter table public.certificate_versions enable row level security;
alter table public.verification_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.settings enable row level security;
alter table public.document_templates enable row level security;

-- Everyone signed in can read master data (dropdowns)
create policy "read master roles" on public.roles for select to authenticated using (true);
create policy "admin write roles" on public.roles for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "read master permissions" on public.permissions for select to authenticated using (true);
create policy "admin write permissions" on public.permissions for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "read role_permissions" on public.role_permissions for select to authenticated using (true);
create policy "admin write role_permissions" on public.role_permissions for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Profiles: user reads/updates self; admin reads all
create policy "profiles self read" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin(auth.uid()));
create policy "profiles self update" on public.profiles for update to authenticated using (id = auth.uid() or public.is_admin(auth.uid())) with check (id = auth.uid() or public.is_admin(auth.uid()));
create policy "profiles admin insert" on public.profiles for insert to authenticated with check (id = auth.uid() or public.is_admin(auth.uid()));
create policy "profiles admin delete" on public.profiles for delete to authenticated using (public.is_admin(auth.uid()));

-- User roles: user reads own; admin manages
create policy "user_roles self read" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "user_roles admin write" on public.user_roles for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Master data (dropdowns): read for all authenticated, write for admin
do $$
declare t text;
begin
  for t in select unnest(array[
    'departments','programs','academic_years','semesters',
    'companies','domains','cohorts','certificate_types',
    'certificate_templates','document_templates'
  ]) loop
    execute format('create policy "read %I" on public.%I for select to authenticated using (true);', t, t);
    execute format('create policy "admin write %I" on public.%I for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));', t, t);
  end loop;
end $$;

-- Students: student sees own record; admin all
create policy "students read own" on public.students for select to authenticated using (profile_id = auth.uid() or public.is_admin(auth.uid()));
create policy "students admin write" on public.students for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Forms: everyone can read published; admin manages
create policy "forms read" on public.forms for select to authenticated using (status = 'published' or public.is_admin(auth.uid()));
create policy "forms admin write" on public.forms for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Form responses: submitter reads own; admin all; anyone can insert their own
create policy "responses read own" on public.form_responses for select to authenticated using (submitted_by = auth.uid() or public.is_admin(auth.uid()));
create policy "responses insert self" on public.form_responses for insert to authenticated with check (submitted_by = auth.uid());
create policy "responses admin update" on public.form_responses for update to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "responses admin delete" on public.form_responses for delete to authenticated using (public.is_admin(auth.uid()));

-- Certificates: student can read/insert own; admin all
create policy "certs read own" on public.certificates for select to authenticated using (
  submitted_by = auth.uid()
  or public.is_admin(auth.uid())
  or exists (select 1 from public.students s where s.id = certificates.student_id and s.profile_id = auth.uid())
);
create policy "certs insert self" on public.certificates for insert to authenticated with check (
  submitted_by = auth.uid()
  or public.is_admin(auth.uid())
);
create policy "certs admin update" on public.certificates for update to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "certs admin delete" on public.certificates for delete to authenticated using (public.is_admin(auth.uid()));

create policy "cert versions read" on public.certificate_versions for select to authenticated using (
  public.is_admin(auth.uid()) or exists (
    select 1 from public.certificates c where c.id = certificate_id and (
      c.submitted_by = auth.uid() or exists (select 1 from public.students s where s.id = c.student_id and s.profile_id = auth.uid())
    )
  )
);
create policy "cert versions admin write" on public.certificate_versions for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "verif logs read" on public.verification_logs for select to authenticated using (
  public.is_admin(auth.uid()) or exists (
    select 1 from public.certificates c where c.id = certificate_id and (
      c.submitted_by = auth.uid() or exists (select 1 from public.students s where s.id = c.student_id and s.profile_id = auth.uid())
    )
  )
);
create policy "verif logs admin write" on public.verification_logs for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Notifications: user reads own
create policy "notif read own" on public.notifications for select to authenticated using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "notif update own" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notif admin write" on public.notifications for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Audit logs: admin only
create policy "audit admin read" on public.audit_logs for select to authenticated using (public.is_admin(auth.uid()));
create policy "audit admin write" on public.audit_logs for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Settings: read all authenticated, admin write
create policy "settings read" on public.settings for select to authenticated using (true);
create policy "settings admin write" on public.settings for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ============ AUTO-PROFILE ON SIGNUP + FIRST-USER ADMIN ============
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  admin_role_id uuid;
  student_role_id uuid;
  user_count int;
begin
  insert into public.profiles(id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;

  select id into admin_role_id from public.roles where slug = 'admin';
  select id into student_role_id from public.roles where slug = 'student';

  select count(*) into user_count from auth.users;
  if user_count <= 1 and admin_role_id is not null then
    insert into public.user_roles(user_id, role_id) values (new.id, admin_role_id) on conflict do nothing;
  elsif student_role_id is not null then
    insert into public.user_roles(user_id, role_id) values (new.id, student_role_id) on conflict do nothing;
  end if;

  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
