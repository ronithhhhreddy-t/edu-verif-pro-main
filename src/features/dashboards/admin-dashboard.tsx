import { useQuery } from "@tanstack/react-query";
import { PageHeader, GlassCard } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Users, FileCheck2, ShieldAlert, Clock, TrendingUp, Plus, LayoutGrid, FileText, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

function useDashboardStats() {
  return useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const [students, pending, approved, rejected, recent, byDept] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("certificates").select("id", { count: "exact", head: true }).in("status", ["pending", "needs_review"]),
        supabase.from("certificates").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("certificates").select("id", { count: "exact", head: true }).eq("status", "rejected"),
        supabase.from("certificates").select("id, status, created_at, ai_confidence, students(full_name, roll_number), domains(name), companies(name)").order("created_at", { ascending: false }).limit(6),
        supabase.from("students").select("department_id, departments(name)").limit(500),
      ]);
      const deptCounts = new Map<string, number>();
      (byDept.data ?? []).forEach((s: any) => {
        const n = s.departments?.name ?? "Unassigned";
        deptCounts.set(n, (deptCounts.get(n) ?? 0) + 1);
      });
      return {
        students: students.count ?? 0,
        pending: pending.count ?? 0,
        approved: approved.count ?? 0,
        rejected: rejected.count ?? 0,
        recent: recent.data ?? [],
        byDept: Array.from(deptCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6),
      };
    },
  });
}

export function AdminDashboard() {
  const { data } = useDashboardStats();
  const navigate = useNavigate();

  const cards = [
    { label: "Total Students", value: data?.students ?? 0, icon: Users, tone: "from-sky-500 to-blue-600" },
    { label: "Pending Review", value: data?.pending ?? 0, icon: Clock, tone: "from-amber-500 to-orange-600" },
    { label: "Approved Certs", value: data?.approved ?? 0, icon: FileCheck2, tone: "from-emerald-500 to-teal-600" },
    { label: "Rejected Certs", value: data?.rejected ?? 0, icon: ShieldAlert, tone: "from-rose-500 to-red-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <PageHeader title="Admin Overview" description="Verification pipeline and platform metrics." />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate({ to: "/app/students" })}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Student
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate({ to: "/app/forms" })}>
            <FileText className="mr-1.5 h-4 w-4" /> Form Builder
          </Button>
          <Button className="gradient-primary text-white" size="sm" onClick={() => navigate({ to: "/app/certificates" })}>
            <CheckCircle2 className="mr-1.5 h-4 w-4" /> Review Pending
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <GlassCard key={c.label} className="relative overflow-hidden group">
            <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${c.tone} opacity-20 blur-2xl transition-opacity group-hover:opacity-40`} />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">{c.label}</div>
                <div className="mt-2 text-3xl font-bold tracking-tight">{c.value}</div>
              </div>
              <div className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${c.tone} text-white shadow-lg`}><c.icon className="h-6 w-6" /></div>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions (Replacing previous layout structure) */}
        <div className="lg:col-span-1 space-y-6">
          <GlassCard>
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <ActionCard icon={Users} label="Cohorts" to="/app/master-data/cohorts" />
              <ActionCard icon={LayoutGrid} label="Domains" to="/app/master-data/domains" />
              <ActionCard icon={FileText} label="Forms" to="/app/forms" />
              <ActionCard icon={Users} label="Students" to="/app/students" />
            </div>
          </GlassCard>

          <GlassCard>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">By department</h3>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              {(data?.byDept ?? []).map(([name, count]) => {
                const max = data?.byDept?.[0]?.[1] || 1;
                return (
                  <div key={name}>
                    <div className="mb-1 flex items-center justify-between text-xs"><span className="font-medium">{name}</span><span className="text-muted-foreground">{count}</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full gradient-primary" style={{ width: `${(count / max) * 100}%` }} /></div>
                  </div>
                );
              })}
              {(!data?.byDept || data.byDept.length === 0) && <div className="text-sm text-muted-foreground">No students yet.</div>}
            </div>
          </GlassCard>
        </div>

        {/* Recent Submissions */}
        <div className="lg:col-span-2">
          <GlassCard className="h-full">
            <div className="mb-4 flex items-center justify-between border-b border-border/50 pb-4">
              <h3 className="text-lg font-semibold">Recent Submissions</h3>
              <Link to="/app/certificates" className="text-sm text-primary hover:underline font-medium">View all pipeline →</Link>
            </div>
            <div className="space-y-3">
              {(data?.recent ?? []).map((c: any) => (
                <div key={c.id} className="flex items-center justify-between rounded-xl border border-border/50 bg-background/40 p-4 transition-colors hover:bg-muted/30">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0 border border-primary/20">
                      {c.students?.full_name?.charAt(0) ?? "?"}
                    </div>
                    <div>
                      <div className="font-medium">{c.students?.full_name ?? "Unknown Student"}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{c.students?.roll_number} · {c.domains?.name ?? "—"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {c.ai_confidence != null ? <span className="text-xs font-medium text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-md">AI {Math.round(c.ai_confidence * 100)}%</span> : null}
                    <StatusBadge status={c.status} />
                  </div>
                </div>
              ))}
              {(!data?.recent || data.recent.length === 0) && (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No submissions waiting.</div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function ActionCard({ icon: Icon, label, to }: any) {
  return (
    <Link to={to} className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-background/40 p-4 transition-all hover:bg-muted/50 hover:shadow-sm">
      <Icon className="h-5 w-5 text-primary" />
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" },
    ai_verified: { label: "AI verified", className: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30" },
    needs_review: { label: "Needs review", className: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30" },
    approved: { label: "Approved", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
    rejected: { label: "Rejected", className: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30" },
  };
  const s = map[status] ?? { label: status, className: "" };
  return <Badge variant="outline" className={s.className}>{s.label}</Badge>;
}