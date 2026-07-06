import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader, GlassCard } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/master-data")({ component: MasterData });

const TABS: Array<{ key: string; table: string; label: string; fields: Array<{ key: string; label: string; type?: string }> }> = [
  { key: "departments", table: "departments", label: "Departments", fields: [{ key: "code", label: "Code" }, { key: "name", label: "Name" }] },
  { key: "programs", table: "programs", label: "Programs", fields: [{ key: "code", label: "Code" }, { key: "name", label: "Name" }] },
  { key: "academic_years", table: "academic_years", label: "Academic Years", fields: [{ key: "label", label: "Label" }] },
  { key: "semesters", table: "semesters", label: "Semesters", fields: [{ key: "label", label: "Label" }] },
  { key: "cohorts", table: "cohorts", label: "Cohorts", fields: [{ key: "name", label: "Name" }] },
  { key: "domains", table: "domains", label: "Domains", fields: [{ key: "code", label: "Code" }, { key: "name", label: "Name" }] },
  { key: "companies", table: "companies", label: "Companies", fields: [{ key: "name", label: "Name" }, { key: "website", label: "Website" }] },
  { key: "certificate_types", table: "certificate_types", label: "Certificate Types", fields: [{ key: "name", label: "Name" }] },
];

function MasterData() {
  const [tab, setTab] = useState(TABS[0].key);
  return (
    <div>
      <PageHeader title="Master data" description="Every dropdown across the platform lives here — fully dynamic." />
      <GlassCard>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4 flex flex-wrap">{TABS.map((t) => <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>)}</TabsList>
          {TABS.map((t) => (
            <TabsContent key={t.key} value={t.key}>
              <MasterEditor spec={t} />
            </TabsContent>
          ))}
        </Tabs>
      </GlassCard>
    </div>
  );
}

function MasterEditor({ spec }: { spec: typeof TABS[number] }) {
  const qc = useQueryClient();
  const [f, setF] = useState<any>({});
  const q = useQuery({ queryKey: ["md", spec.key], queryFn: async () => (await supabase.from(spec.table as any).select("*").order("created_at", { ascending: false }).limit(200)).data ?? [] });
  const add = useMutation({
    mutationFn: async () => { const { error } = await supabase.from(spec.table as any).insert(f); if (error) throw error; },
    onSuccess: () => { toast.success("Added"); setF({}); qc.invalidateQueries({ queryKey: ["md", spec.key] }); qc.invalidateQueries({ queryKey: ["dropdowns"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from(spec.table as any).delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["md", spec.key] }); qc.invalidateQueries({ queryKey: ["dropdowns"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-2">
        {spec.fields.map((fd) => (
          <div key={fd.key}><label className="text-xs text-muted-foreground">{fd.label}</label><Input className="mt-1" value={f[fd.key] ?? ""} onChange={(e) => setF({ ...f, [fd.key]: e.target.value })} /></div>
        ))}
        <Button className="gradient-primary text-white" onClick={() => add.mutate()} disabled={add.isPending || !spec.fields.every((fd) => f[fd.key])}>
          {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-1 h-4 w-4" /> Add</>}
        </Button>
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-background/40 text-left text-xs uppercase text-muted-foreground">
            <tr>{spec.fields.map((fd) => <th key={fd.key} className="p-3">{fd.label}</th>)}<th className="p-3 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {(q.data ?? []).map((row: any) => (
              <tr key={row.id} className="border-t border-border/50">
                {spec.fields.map((fd) => <td key={fd.key} className="p-3">{row[fd.key] ?? "—"}</td>)}
                <td className="p-3 text-right"><Button size="sm" variant="ghost" className="text-destructive" onClick={() => del.mutate(row.id)}><Trash2 className="h-4 w-4" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}