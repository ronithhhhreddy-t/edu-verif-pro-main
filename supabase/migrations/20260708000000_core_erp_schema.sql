-- ============ SECTIONS ============
create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  department_id uuid references public.departments(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.students
  add column if not exists section_id uuid references public.sections(id) on delete set null;

-- ============ COHORT DOMAINS ============
create table if not exists public.cohort_domains (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid references public.cohorts(id) on delete cascade,
  domain_id uuid references public.domains(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(cohort_id, domain_id)
);

-- ============ FORM FIELDS ============
create table if not exists public.form_fields (
  id uuid primary key default gen_random_uuid(),
  form_id uuid references public.forms(id) on delete cascade,
  name text not null,
  field_type text not null,
  is_required boolean default true,
  options jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ AI VERIFICATIONS ============
create table if not exists public.ai_verifications (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid references public.certificates(id) on delete cascade,
  authenticity_score numeric(5,2),
  confidence_score numeric(5,2),
  risk_level text,
  ai_remarks text,
  extracted_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ VERIFICATION HISTORY ============
create table if not exists public.verification_history (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid references public.certificates(id) on delete cascade,
  action text not null,
  user_id uuid references auth.users(id) on delete set null,
  old_status text,
  new_status text,
  remarks text,
  device_info text,
  ip_address text,
  created_at timestamptz not null default now()
);

-- ============ REPORTS ============
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  report_type text not null,
  generated_by uuid references auth.users(id) on delete set null,
  parameters jsonb,
  file_url text,
  created_at timestamptz not null default now()
);

-- ============ RLS & PERMISSIONS ============
grant all on public.sections, public.cohort_domains, public.form_fields, public.ai_verifications, public.verification_history, public.reports to authenticated;
grant all on public.sections, public.cohort_domains, public.form_fields, public.ai_verifications, public.verification_history, public.reports to service_role;

alter table public.sections enable row level security;
alter table public.cohort_domains enable row level security;
alter table public.form_fields enable row level security;
alter table public.ai_verifications enable row level security;
alter table public.verification_history enable row level security;
alter table public.reports enable row level security;

-- Sections
create policy "read sections" on public.sections for select to authenticated using (true);
create policy "admin sections" on public.sections for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Cohort Domains
create policy "read cohort_domains" on public.cohort_domains for select to authenticated using (true);
create policy "admin cohort_domains" on public.cohort_domains for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Form Fields
create policy "read form_fields" on public.form_fields for select to authenticated using (true);
create policy "admin form_fields" on public.form_fields for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- AI Verifications
create policy "read ai_verifications" on public.ai_verifications for select to authenticated using (true);
create policy "admin ai_verifications" on public.ai_verifications for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Verification History
create policy "read verification_history" on public.verification_history for select to authenticated using (true);
create policy "admin verification_history" on public.verification_history for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Reports
create policy "read reports" on public.reports for select to authenticated using (public.is_admin(auth.uid()));
create policy "admin reports" on public.reports for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
