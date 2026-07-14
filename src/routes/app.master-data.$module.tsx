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

        <div className="overflow-hidden rounded-xl border border-border bg-white/30 backdrop-blur-md">
          <table className="w-full text-sm">
            <thead className="bg-background/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                {spec.fields.map((fd) => <th key={fd.key} className="p-4 font-semibold">{fd.label}</th>)}
                <th className="p-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {(q.data ?? []).map((row: any) => (
                <tr key={row.id} className="transition-colors hover:bg-muted/30">
                  {spec.fields.map((fd) => <td key={fd.key} className="p-4">{row[fd.key] ?? "—"}</td>)}
                  <td className="p-4 text-right">
                    <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => del.mutate(row.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {q.data?.length === 0 && (
                <tr>
                  <td colSpan={spec.fields.length + 1} className="p-8 text-center text-muted-foreground">No records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
