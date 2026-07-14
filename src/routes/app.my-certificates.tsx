import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, GlassCard } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { StatusBadge } from "@/features/dashboards/admin-dashboard";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Upload } from "lucide-react";

export const Route = createFileRoute("/app/my-certificates")({ component: MyCerts });

function MyCerts() {
  const me = useMe();
  const q = useQuery({
    queryKey: ["my-certs", me.data?.user.id],
    enabled: !!me.data?.user.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificates")
        .select("*, domains(name), companies(name), certificate_types(name)")
        .eq("submitted_by", me.data!.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  return (
    <div>
      <PageHeader title="My certificates" description="Every submission with its AI + admin verdict."
        actions={<Button asChild className="rounded-xl gradient-primary text-white"><Link to="/app/upload"><Upload className="mr-2 h-4 w-4" /> New upload</Link></Button>} />
      {q.isLoading ? <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : q.isError ? (
        <div className="p-8 text-center text-red-500 bg-red-50 dark:bg-red-950/20 rounded-xl">
          Error loading certificates: {(q.error as Error).message}
        </div>
      ) : (
        <div className="grid gap-3">
          {(q.data ?? []).map((c: any) => (
            <GlassCard key={c.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-base font-semibold">{c.domains?.name ?? "—"}</div>
                <div className="text-sm text-muted-foreground">{c.companies?.name ?? "—"} · {c.certificate_types?.name ?? "Certificate"} · {new Date(c.created_at).toLocaleDateString()}</div>
                {c.reviewer_notes ? <div className="mt-2 text-xs text-muted-foreground italic">Note: {c.reviewer_notes}</div> : null}
                {c.ai_issues?.length ? <div className="mt-2 text-xs text-amber-700 dark:text-amber-400">Issues: {c.ai_issues.join(", ")}</div> : null}
              </div>
              <div className="flex items-center gap-3">
                {c.ai_confidence != null ? <span className="text-xs text-muted-foreground">AI {Math.round(c.ai_confidence * 100)}%</span> : null}
                <StatusBadge status={c.status} />
                <Button size="sm" variant="outline" onClick={async () => {
                  const { data } = await supabase.storage.from("certificates").createSignedUrl(c.file_url, 300);
                  if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                }}><Download className="mr-1 h-3 w-3" /> View</Button>
              </div>
            </GlassCard>
          ))}
          {(q.data ?? []).length === 0 && (
            <GlassCard><div className="p-8 text-center text-sm text-muted-foreground">No certificates yet.</div></GlassCard>
          )}
        </div>
      )}
    </div>
  );
}