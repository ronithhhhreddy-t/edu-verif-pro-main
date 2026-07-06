import { supabase } from "@/integrations/supabase/client";

export async function useDropdowns() {
  const [depts, programs, years, semesters, cohorts, domains, companies, certTypes, roles] = await Promise.all([
    supabase.from("departments").select("id, code, name").order("name"),
    supabase.from("programs").select("id, code, name, department_id").order("name"),
    supabase.from("academic_years").select("id, label, is_current").order("label", { ascending: false }),
    supabase.from("semesters").select("id, label, is_current").order("label"),
    supabase.from("cohorts").select("id, name, is_active").order("name"),
    supabase.from("domains").select("id, code, name").order("name"),
    supabase.from("companies").select("id, name").order("name"),
    supabase.from("certificate_types").select("id, name").order("name"),
    supabase.from("roles").select("id, slug, name"),
  ]);
  return {
    departments: depts.data ?? [],
    programs: programs.data ?? [],
    academic_years: years.data ?? [],
    semesters: semesters.data ?? [],
    cohorts: cohorts.data ?? [],
    domains: domains.data ?? [],
    companies: companies.data ?? [],
    certificate_types: certTypes.data ?? [],
    roles: roles.data ?? [],
  };
}

export type Dropdowns = Awaited<ReturnType<typeof useDropdowns>>;

export async function logAudit(action: string, entity: string, entity_id?: string, old_value?: any, new_value?: any) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  await supabase.from("audit_logs").insert({
    actor_id: u.user.id,
    action, entity, entity_id: entity_id ?? null,
    old_value: old_value ?? null,
    new_value: new_value ?? null,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
  });
}