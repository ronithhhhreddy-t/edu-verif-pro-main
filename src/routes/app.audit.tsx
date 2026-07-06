import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, GlassCard } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/audit")({ component: Audit });

function Audit() {
  const q = useQuery({ queryKey: ["audit"], queryFn: async () => (await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200)).data ?? [] });
  return (
    <div>
      <PageHeader title="Audit logs" description="Every important change is recorded." />
      <GlassCard className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background/40 text-left text-xs uppercase text-muted-foreground"><tr><th className="p-3">When</th><th className="p-3">Actor</th><th className="p-3">Action</th><th className="p-3">Entity</th><th className="p-3">Details</th></tr></thead>
            <tbody>{(q.data ?? []).map((r: any) => (
              <tr key={r.id} className="border-t border-border/50">
                <td className="p-3 text-xs">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-3 text-xs">{r.actor_id?.slice(0, 8) ?? "system"}</td>
                <td className="p-3">{r.action}</td>
                <td className="p-3">{r.entity}{r.entity_id ? <span className="text-xs text-muted-foreground"> · {r.entity_id.slice(0, 8)}</span> : null}</td>
                <td className="p-3 text-xs text-muted-foreground">{r.new_value ? JSON.stringify(r.new_value).slice(0, 120) : "—"}</td>
              </tr>
            ))}
            {(q.data ?? []).length === 0 && <tr><td colSpan={5} className="p-10 text-center text-sm text-muted-foreground">No audit events yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}