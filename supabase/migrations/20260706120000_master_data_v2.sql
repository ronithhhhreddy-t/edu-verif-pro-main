-- ============ NEW MASTER DATA TABLES ============
create table public.file_types (
  id uuid primary key default gen_random_uuid(),
  ext text unique not null,
  mime_type text not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.student_statuses (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.verification_statuses (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  created_at timestamptz not null default now()
);

-- Seed basic data
insert into public.file_types (ext, mime_type, name) values 
  ('pdf', 'application/pdf', 'PDF Document'),
  ('jpg', 'image/jpeg', 'JPEG Image'),
  ('png', 'image/png', 'PNG Image') on conflict do nothing;

insert into public.student_statuses (name) values ('Active'), ('Inactive'), ('Alumni') on conflict do nothing;
insert into public.verification_statuses (name) values ('Pending'), ('AI Verified'), ('Needs Review'), ('Approved'), ('Rejected') on conflict do nothing;


-- ============ COHORTS ============
alter table public.cohorts 
  add column if not exists registration_deadline date,
  add column if not exists verification_deadline date,
  add column if not exists status text not null default 'Active',
  add column if not exists description text,
  add column if not exists notes text;

-- ============ DOMAINS ============
alter table public.domains
  add column if not exists company_id uuid references public.companies(id) on delete set null,
  add column if not exists cohort_id uuid references public.cohorts(id) on delete cascade,
  add column if not exists certificate_type_id uuid references public.certificate_types(id) on delete set null,
  add column if not exists certificate_required boolean not null default true,
  add column if not exists max_marks int default 100,
  add column if not exists verification_required boolean not null default true,
  add column if not exists ai_verification_enabled boolean not null default false,
  add column if not exists faculty_incharge_id uuid references auth.users(id) on delete set null,
  add column if not exists status text not null default 'Active';

-- ============ FORMS ============
alter table public.forms
  add column if not exists cohort_id uuid references public.cohorts(id) on delete cascade,
  add column if not exists opening_date timestamptz,
  add column if not exists closing_date timestamptz,
  add column if not exists max_submissions int,
  add column if not exists upload_config jsonb not null default '{}'::jsonb;

-- ============ PERMISSIONS / RLS FOR NEW TABLES ============
grant all on public.file_types, public.student_statuses, public.verification_statuses to authenticated;
grant all on public.file_types, public.student_statuses, public.verification_statuses to service_role;

alter table public.file_types enable row level security;
alter table public.student_statuses enable row level security;
alter table public.verification_statuses enable row level security;

create policy "read file_types" on public.file_types for select to authenticated using (true);
create policy "admin file_types" on public.file_types for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "read student_statuses" on public.student_statuses for select to authenticated using (true);
create policy "admin student_statuses" on public.student_statuses for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "read verification_statuses" on public.verification_statuses for select to authenticated using (true);
create policy "admin verification_statuses" on public.verification_statuses for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));


-- ============ AUTO EXPIRE COHORTS FUNCTION ============
-- This can be called by pg_cron or an Edge Function daily
create or replace function public.auto_expire_cohorts()
returns void language sql security definer as $$
  update public.cohorts 
  set status = 'Expired' 
  where end_date < current_date and status = 'Active';
$$;

-- ============ STUDENT PROGRESS VIEW ============
-- Dynamic view to calculate student completion percentage and stats without manual updates
create or replace view public.student_progress_view as
select 
  s.id as student_id,
  s.cohort_id,
  count(d.id) as total_domains,
  count(c.id) filter (where c.status = 'approved') as completed_domains,
  case 
    when count(d.id) = 0 then 0 
    else round((count(c.id) filter (where c.status = 'approved')::numeric / count(d.id)::numeric) * 100, 2) 
  end as completion_percentage
from public.students s
left join public.domains d on d.cohort_id = s.cohort_id and d.status = 'Active'
left join public.certificates c on c.student_id = s.id and c.domain_id = d.id
group by s.id, s.cohort_id;
