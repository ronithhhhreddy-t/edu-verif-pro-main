import { useQuery } from "@tanstack/react-query";
import { PageHeader, GlassCard } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Users, FileCheck2, ShieldAlert, Clock, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";

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
  const cards = [
    { label: "Students", value: data?.students ?? 0, icon: Users, tone: "from-sky-500 to-blue-600" },
    { label: "Pending Review", value: data?.pending ?? 0, icon: Clock, tone: "from-amber-500 to-orange-600" },
    { label: "Approved", value: data?.approved ?? 0, icon: FileCheck2, tone: "from-emerald-500 to-teal-600" },
    { label: "Rejected", value: data?.rejected ?? 0, icon: ShieldAlert, tone: "from-rose-500 to-red-600" },
  ];
  return (
    <div>
      <PageHeader title="Admin Overview" description="Verification pipeline at a glance." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <GlassCard key={c.label} className="relative overflow-hidden">
            <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${c.tone} opacity-25 blur-2xl`} />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">{c.label}</div>
                <div className="mt-2 text-3xl font-bold tracking-tight">{c.value}</div>
              </div>
              <div className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${c.tone} text-white shadow-lg`}><c.icon className="h-5 w-5" /></div>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recent submissions</h3>
            <Link to="/app/certificates" className="text-sm text-primary hover:underline">View all →</Link>
          </div>
          <div className="space-y-2">
            {(data?.recent ?? []).map((c: any) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-border/50 bg-background/40 p-3">
                <div>
                  <div className="text-sm font-medium">{c.students?.full_name ?? "Unknown"} <span className="text-muted-foreground">· {c.students?.roll_number}</span></div>
                  <div className="text-xs text-muted-foreground">{c.domains?.name ?? "—"} · {c.companies?.name ?? "—"}</div>
                </div>
                <div className="flex items-center gap-3">
                  {c.ai_confidence != null ? <span className="text-xs text-muted-foreground">AI {Math.round(c.ai_confidence * 100)}%</span> : null}
                  <StatusBadge status={c.status} />
                </div>
              </div>
            ))}
            {(!data?.recent || data.recent.length === 0) && (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No submissions yet.</div>
            )}
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
    </div>
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