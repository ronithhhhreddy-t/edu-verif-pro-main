import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { PageHeader, GlassCard } from "@/components/app-shell";
import { useMe } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileCheck2, Clock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./admin-dashboard";

export function StudentDashboard() {
  const me = useMe();
  const q = useQuery({
    queryKey: ["student-dash", me.data?.user.id],
    enabled: !!me.data?.user.id,
    queryFn: async () => {
      const { data: student } = await supabase.from("students").select("*, departments(name), cohorts(name)").eq("profile_id", me.data!.user.id).maybeSingle();
      const { data: certs } = await supabase.from("certificates").select("*, domains(name)").eq("submitted_by", me.data!.user.id).order("created_at", { ascending: false });
      return { student, certs: certs ?? [] };
    },
  });
  const certs = q.data?.certs ?? [];
  const approved = certs.filter((c: any) => c.status === "approved").length;
  const pending = certs.filter((c: any) => ["pending", "needs_review", "ai_verified"].includes(c.status)).length;
  const rejected = certs.filter((c: any) => c.status === "rejected").length;
  return (
    <div>
      <PageHeader
        title={`Welcome${me.data?.profile?.full_name ? `, ${me.data.profile.full_name.split(" ")[0]}` : ""}`}
        description="Track your internship & EduSkills certificate verifications."
        actions={<Button asChild className="rounded-xl gradient-primary text-white"><Link to="/app/upload"><Upload className="mr-2 h-4 w-4" /> Upload certificate</Link></Button>}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Approved", value: approved, icon: FileCheck2, tone: "from-emerald-500 to-teal-600" },
          { label: "In progress", value: pending, icon: Clock, tone: "from-amber-500 to-orange-600" },
          { label: "Rejected", value: rejected, icon: ShieldAlert, tone: "from-rose-500 to-red-600" },
        ].map((c) => (
          <GlassCard key={c.label} className="relative overflow-hidden">
            <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${c.tone} opacity-25 blur-2xl`} />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">{c.label}</div>
                <div className="mt-2 text-3xl font-bold">{c.value}</div>
              </div>
              <div className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${c.tone} text-white`}><c.icon className="h-5 w-5" /></div>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <h3 className="mb-4 text-lg font-semibold">Recent certificates</h3>
          <div className="space-y-2">
            {certs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center">
                <p className="text-sm text-muted-foreground">You haven't uploaded any certificates yet.</p>
                <Button asChild className="mt-3 rounded-xl gradient-primary text-white"><Link to="/app/upload">Upload your first certificate</Link></Button>
              </div>
            ) : (
              certs.slice(0, 6).map((c: any) => (
                <div key={c.id} className="flex items-center justify-between rounded-xl border border-border/50 bg-background/40 p-3">
                  <div>
                    <div className="text-sm font-medium">{c.domains?.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{c.domains?.name ?? "—"} · {new Date(c.created_at).toLocaleDateString()}</div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="mb-4 text-lg font-semibold">Your profile</h3>
          <dl className="space-y-2 text-sm">
            <Row label="Name" value={q.data?.student?.full_name ?? me.data?.profile?.full_name ?? "—"} />
            <Row label="Roll number" value={q.data?.student?.roll_number ?? "—"} />
            <Row label="Department" value={q.data?.student?.departments?.name ?? "—"} />
            <Row label="Cohort" value={q.data?.student?.cohorts?.name ?? "—"} />
          </dl>
          {!q.data?.student && (
            <p className="mt-3 rounded-lg bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300">
              Your student record isn't linked yet. Ask admin to import your record with roll number and this email.
            </p>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex justify-between border-b border-border/50 pb-2 last:border-0"><dt className="text-muted-foreground">{label}</dt><dd className="font-medium">{value}</dd></div>;
}