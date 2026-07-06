import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader, GlassCard } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/roles")({ component: RolesPage });

function RolesPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const roles = useQuery({ queryKey: ["roles"], queryFn: async () => (await supabase.from("roles").select("*").order("name")).data ?? [] });
  const perms = useQuery({ queryKey: ["perms"], queryFn: async () => (await supabase.from("permissions").select("*").order("category")).data ?? [] });
  const rp = useQuery({ queryKey: ["role_perms"], queryFn: async () => (await supabase.from("role_permissions").select("*")).data ?? [] });

  const addRole = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("roles").insert({ name, slug: slug.toLowerCase() }); if (error) throw error; },
    onSuccess: () => { setName(""); setSlug(""); qc.invalidateQueries({ queryKey: ["roles"] }); toast.success("Role created"); },
    onError: (e: any) => toast.error(e.message),
  });
  const delRole = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("roles").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["roles"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });
  const toggle = useMutation({
    mutationFn: async ({ role_id, permission_id, on }: { role_id: string; permission_id: string; on: boolean }) => {
      if (on) await supabase.from("role_permissions").insert({ role_id, permission_id });
      else await supabase.from("role_permissions").delete().eq("role_id", role_id).eq("permission_id", permission_id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["role_perms"] }),
  });

  const grouped = (perms.data ?? []).reduce((acc: any, p: any) => { (acc[p.category ?? "Other"] ??= []).push(p); return acc; }, {});

  return (
    <div>
      <PageHeader title="Roles & permissions" description="Create any role; grant granular permissions." />
      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <GlassCard>
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold"><ShieldCheck className="h-4 w-4" /> Roles</h3>
          <div className="mb-3 flex gap-2">
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
            <Button className="gradient-primary text-white" onClick={() => addRole.mutate()} disabled={!name || !slug}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-1">
            {(roles.data ?? []).map((r: any) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-border/50 p-2 text-sm">
                <div><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground">{r.slug}</div></div>
                {!r.is_system && <Button size="icon" variant="ghost" className="text-destructive" onClick={() => delRole.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="mb-3 text-lg font-semibold">Permission matrix</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr><th className="p-2 text-left">Permission</th>{(roles.data ?? []).map((r: any) => <th key={r.id} className="p-2 text-center">{r.name}</th>)}</tr></thead>
              <tbody>
                {Object.entries(grouped).map(([cat, list]: any) => (
                  <>
                    <tr key={cat}><td colSpan={(roles.data?.length ?? 0) + 1} className="bg-background/40 p-2 text-xs uppercase tracking-wider text-muted-foreground">{cat}</td></tr>
                    {list.map((p: any) => (
                      <tr key={p.id} className="border-t border-border/40">
                        <td className="p-2"><div className="font-medium">{p.name}</div><div className="text-[10px] text-muted-foreground">{p.slug}</div></td>
                        {(roles.data ?? []).map((r: any) => {
                          const on = !!rp.data?.find((x: any) => x.role_id === r.id && x.permission_id === p.id);
                          return <td key={r.id} className="p-2 text-center"><input type="checkbox" checked={on} onChange={(e) => toggle.mutate({ role_id: r.id, permission_id: p.id, on: e.target.checked })} /></td>;
                        })}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}