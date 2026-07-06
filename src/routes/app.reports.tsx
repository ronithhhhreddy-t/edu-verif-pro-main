import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, GlassCard } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";
import { useDropdowns } from "@/lib/api";
import { StatusBadge } from "@/features/dashboards/admin-dashboard";

export const Route = createFileRoute("/app/reports")({ component: Reports });

function Reports() {
  const [department, setDepartment] = useState("all");
  const [status, setStatus] = useState("all");
  const [cohort, setCohort] = useState("all");
  const dropdowns = useQuery({ queryKey: ["dropdowns"], queryFn: useDropdowns });

  const q = useQuery({
    queryKey: ["report", department, status, cohort],
    queryFn: async () => {
      let query = supabase.from("certificates").select("id, status, ai_confidence, created_at, reviewed_at, students(full_name, roll_number, email, departments(name)), domains(name), companies(name), cohorts(name)").limit(1000).order("created_at", { ascending: false });
      if (status !== "all") query = query.eq("status", status);
      if (cohort !== "all") query = query.eq("cohort_id", cohort);
      const { data } = await query;
      let rows = (data ?? []) as any[];
      if (department !== "all") rows = rows.filter((r) => r.students?.departments?.name && dropdowns.data?.departments.find((d) => d.id === department)?.name === r.students.departments.name);
      return rows;
    },
  });

  function exportCsv() {
    const rows = q.data ?? [];
    const csv = ["Roll,Name,Email,Department,Domain,Company,Cohort,Status,AI %,Submitted,Reviewed"].concat(
      rows.map((r: any) => [r.students?.roll_number, r.students?.full_name, r.students?.email, r.students?.departments?.name, r.domains?.name, r.companies?.name, r.cohorts?.name, r.status, r.ai_confidence != null ? Math.round(r.ai_confidence * 100) : "", r.created_at, r.reviewed_at ?? ""].map((v) => `"${(v ?? "").toString().replace(/"/g, '""')}"`).join(","))
    ).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "certificate-report.csv"; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader title="Reports" description="Filter, review, export." actions={<Button className="gradient-primary text-white" onClick={exportCsv}><Download className="mr-1 h-4 w-4" /> Export CSV</Button>} />
      <GlassCard className="mb-4">
        <div className="flex flex-wrap gap-3">
          <Select value={department} onValueChange={setDepartment}><SelectTrigger className="w-48"><SelectValue placeholder="Department" /></SelectTrigger><SelectContent><SelectItem value="all">All departments</SelectItem>{dropdowns.data?.departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select>
          <Select value={cohort} onValueChange={setCohort}><SelectTrigger className="w-48"><SelectValue placeholder="Cohort" /></SelectTrigger><SelectContent><SelectItem value="all">All cohorts</SelectItem>{dropdowns.data?.cohorts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select>
          <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{["pending","ai_verified","needs_review","approved","rejected"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
          <div className="ml-auto text-xs text-muted-foreground">{q.data?.length ?? 0} rows</div>
        </div>
      </GlassCard>
      <GlassCard className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background/40 text-left text-xs uppercase text-muted-foreground"><tr><th className="p-3">Student</th><th className="p-3">Dept</th><th className="p-3">Domain</th><th className="p-3">Company</th><th className="p-3">AI</th><th className="p-3">Status</th></tr></thead>
            <tbody>{(q.data ?? []).map((r: any) => (
              <tr key={r.id} className="border-t border-border/50">
                <td className="p-3"><div className="font-medium">{r.students?.full_name}</div><div className="text-xs text-muted-foreground">{r.students?.roll_number}</div></td>
                <td className="p-3">{r.students?.departments?.name ?? "—"}</td>
                <td className="p-3">{r.domains?.name ?? "—"}</td>
                <td className="p-3">{r.companies?.name ?? "—"}</td>
                <td className="p-3">{r.ai_confidence != null ? Math.round(r.ai_confidence * 100) + "%" : "—"}</td>
                <td className="p-3"><StatusBadge status={r.status} /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}