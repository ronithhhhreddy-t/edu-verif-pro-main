import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader, GlassCard } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/app/master-data/$module")({
  component: GenericMasterEditor,
});

const SCHEMAS: Record<string, { table: string; label: string; fields: Array<{ key: string; label: string }> }> = {
  "departments": { table: "departments", label: "Departments", fields: [{ key: "code", label: "Code" }, { key: "name", label: "Name" }] },
  "programs": { table: "programs", label: "Programs", fields: [{ key: "code", label: "Code" }, { key: "name", label: "Name" }] },
  "academic-years": { table: "academic_years", label: "Academic Years", fields: [{ key: "label", label: "Name" }] },
  "semesters": { table: "semesters", label: "Semesters", fields: [{ key: "label", label: "Name" }] },
  "sections": { table: "sections", label: "Sections", fields: [{ key: "name", label: "Name" }] },
  "companies": { table: "companies", label: "Companies", fields: [{ key: "name", label: "Name" }, { key: "website", label: "Website" }] },
  "certificate-types": { table: "certificate_types", label: "Certificate Types", fields: [{ key: "name", label: "Name" }] },
  "file-types": { table: "file_types", label: "File Types", fields: [{ key: "ext", label: "Extension" }, { key: "mime_type", label: "MIME Type" }, { key: "name", label: "Name" }] },
  "student-statuses": { table: "student_statuses", label: "Student Statuses", fields: [{ key: "name", label: "Name" }] },
  "verification-statuses": { table: "verification_statuses", label: "Verification Statuses", fields: [{ key: "name", label: "Name" }] },
};

function GenericMasterEditor() {
  const { module } = useParams({ from: "/app/master-data/$module" });
  const spec = SCHEMAS[module];

  if (!spec) {
    return <div>Module not found</div>;
  }

  const qc = useQueryClient();
  const [f, setF] = useState<any>({});
  
  const q = useQuery({ 
    queryKey: ["md", spec.table], 
    queryFn: async () => (await supabase.from(spec.table as any).select("*").order("created_at", { ascending: false }).limit(200)).data ?? [] 
  });

  const add = useMutation({
    mutationFn: async () => { const { error } = await supabase.from(spec.table as any).insert(f); if (error) throw error; },
    onSuccess: () => { toast.success("Added"); setF({}); qc.invalidateQueries({ queryKey: ["md", spec.table] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from(spec.table as any).delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["md", spec.table] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <div className="mb-4">
        <Link to="/app/master-data" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Master Data
        </Link>
      </div>
      <PageHeader title={spec.label} description={`Manage ${spec.label.toLowerCase()} entries in the database.`} />
      
      <GlassCard>
        <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl bg-background/50 p-4 border border-border/50">
          {spec.fields.map((fd) => (
            <div key={fd.key} className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground">{fd.label}</label>
              <Input className="mt-1.5 bg-white/50" value={f[fd.key] ?? ""} onChange={(e) => setF({ ...f, [fd.key]: e.target.value })} placeholder={`Enter ${fd.label.toLowerCase()}`} />
            </div>
          ))}
          <Button className="gradient-primary text-white" onClick={() => add.mutate()} disabled={add.isPending || !spec.fields.every((fd) => f[fd.key])}>
            {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-1 h-4 w-4" /> Add Record</>}
          </Button>
        </div>

        <div className="grid gap-3 sm:gap-0 sm:glass sm:rounded-2xl sm:overflow-hidden sm:border sm:border-border/50">
          <div className="hidden sm:flex items-center p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-background/40">
            {spec.fields.map((fd) => <div key={fd.key} className="flex-1">{fd.label}</div>)}
            <div className="w-24 text-right">Actions</div>
          </div>
          {(q.data ?? []).map((row: any) => (
            <div key={row.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 border-b border-border/50 hover:bg-accent/30 glass sm:bg-transparent rounded-2xl sm:rounded-none transition-colors">
              {spec.fields.map((fd) => (
                <div key={fd.key} className="flex-1 flex flex-col min-w-0">
                  <div className="text-[10px] font-bold uppercase text-muted-foreground sm:hidden mb-1">{fd.label}</div>
                  <div className="font-medium truncate">{row[fd.key] ?? "—"}</div>
                </div>
              ))}
              <div className="w-full sm:w-24 mt-2 sm:mt-0 flex sm:justify-end">
                <Button size="icon" variant="ghost" className="w-full sm:w-auto rounded-xl border border-destructive/20 text-destructive bg-destructive/5 hover:bg-destructive/10 sm:border-transparent sm:bg-transparent" onClick={() => del.mutate(row.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {q.data?.length === 0 && (
            <div className="p-8 text-center text-muted-foreground glass sm:bg-transparent rounded-2xl sm:rounded-none">No records found.</div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
