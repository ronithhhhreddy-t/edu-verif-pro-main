import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Papa from "papaparse";
import { PageHeader, GlassCard } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Upload, Download, Trash2, Edit3, Loader2 } from "lucide-react";
import { useDropdowns } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/app/students")({ component: StudentsPage });

function StudentsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState<string>("all");
  const [editing, setEditing] = useState<any | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const dropdowns = useQuery({ queryKey: ["dropdowns"], queryFn: useDropdowns });

  const q = useQuery({
    queryKey: ["students", search, dept],
    queryFn: async () => {
      let query = supabase.from("students").select("*, departments(name), cohorts(name)").order("full_name").limit(500);
      if (dept !== "all") query = query.eq("department_id", dept);
      const { data } = await query;
      let rows = data ?? [];
      if (search) {
        const s = search.toLowerCase();
        rows = rows.filter((r: any) => [r.full_name, r.roll_number, r.email].some((v) => (v ?? "").toString().toLowerCase().includes(s)));
      }
      return rows;
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("students").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["students"] }); },
  });

  return (
    <div>
      <PageHeader
        title="Students"
        description="Directory, imports and profile management."
        actions={<>
          <Button variant="outline" onClick={downloadTemplate}><Download className="mr-1 h-4 w-4" /> Template</Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="mr-1 h-4 w-4" /> Import CSV</Button>
          <Button className="gradient-primary text-white" onClick={() => setEditing({})}><Plus className="mr-1 h-4 w-4" /> Add student</Button>
        </>}
      />
      <GlassCard className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input placeholder="Search name, roll or email…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {dropdowns.data?.departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="ml-auto text-xs text-muted-foreground">{q.data?.length ?? 0} students</div>
        </div>
      </GlassCard>

      <GlassCard className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-3">Name</th><th className="p-3">Roll</th><th className="p-3">Email</th><th className="p-3">Department</th><th className="p-3">Cohort</th><th className="p-3 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {(q.data ?? []).map((s: any) => (
                <tr key={s.id} className="border-t border-border/50 hover:bg-accent/30">
                  <td className="p-3 font-medium">{s.full_name}</td>
                  <td className="p-3">{s.roll_number}</td>
                  <td className="p-3 text-muted-foreground">{s.email}</td>
                  <td className="p-3">{s.departments?.name ?? "—"}</td>
                  <td className="p-3">{s.cohorts?.name ?? "—"}</td>
                  <td className="p-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(s)}><Edit3 className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => del.mutate(s.id)}><Trash2 className="h-4 w-4" /></Button>
                  </td>
                </tr>
              ))}
              {q.isLoading ? <tr><td colSpan={6} className="p-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr> :
                (q.data ?? []).length === 0 ? <tr><td colSpan={6} className="p-10 text-center text-sm text-muted-foreground">No students yet. Import or add one.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {editing && <StudentDialog student={editing} onClose={() => setEditing(null)} dropdowns={dropdowns.data} onSaved={() => qc.invalidateQueries({ queryKey: ["students"] })} />}
      {importOpen && <ImportDialog onClose={() => setImportOpen(false)} dropdowns={dropdowns.data} onDone={() => qc.invalidateQueries({ queryKey: ["students"] })} />}
    </div>
  );
}

function StudentDialog({ student, onClose, dropdowns, onSaved }: any) {
  const [f, setF] = useState<any>({
    full_name: student.full_name ?? "",
    roll_number: student.roll_number ?? "",
    email: student.email ?? "",
    phone: student.phone ?? "",
    gender: student.gender ?? "",
    department_id: student.department_id ?? "",
    cohort_id: student.cohort_id ?? "",
    section: student.section ?? "",
    status: student.status ?? "active",
  });
  const isNew = !student.id;
  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...f };
      for (const k of Object.keys(payload)) if (payload[k] === "") payload[k] = null;
      if (isNew) { const { error } = await supabase.from("students").insert(payload); if (error) throw error; }
      else { const { error } = await supabase.from("students").update(payload).eq("id", student.id); if (error) throw error; }
    },
    onSuccess: () => { toast.success("Saved"); onSaved(); onClose(); },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{isNew ? "Add student" : "Edit student"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Full name *"><Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></Field>
          <Field label="Roll number *"><Input value={f.roll_number} onChange={(e) => setF({ ...f, roll_number: e.target.value })} /></Field>
          <Field label="Email *"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Phone"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="Department"><Select value={f.department_id || undefined} onValueChange={(v) => setF({ ...f, department_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{dropdowns?.departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Cohort"><Select value={f.cohort_id || undefined} onValueChange={(v) => setF({ ...f, cohort_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{dropdowns?.cohorts.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Gender"><Select value={f.gender || undefined} onValueChange={(v) => setF({ ...f, gender: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></Field>
          <Field label="Section"><Input value={f.section} onChange={(e) => setF({ ...f, section: e.target.value })} /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="gradient-primary text-white" onClick={() => save.mutate()} disabled={save.isPending || !f.full_name || !f.roll_number || !f.email}>{save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs">{label}</Label><div className="mt-1">{children}</div></div>;
}

function ImportDialog({ onClose, dropdowns, onDone }: any) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  function handleFile(file: File) {
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        const parsed: any[] = [];
        const errs: string[] = [];
        for (const r of res.data as any[]) {
          if (!r.full_name || !r.roll_number || !r.email) { errs.push(`Missing required fields: ${JSON.stringify(r)}`); continue; }
          const dept = dropdowns?.departments.find((d: any) => d.code === r.department_code || d.name === r.department);
          const cohort = dropdowns?.cohorts.find((c: any) => c.name === r.cohort);
          parsed.push({
            full_name: r.full_name.trim(),
            roll_number: r.roll_number.trim(),
            email: r.email.trim().toLowerCase(),
            phone: r.phone || null,
            gender: r.gender || null,
            section: r.section || null,
            department_id: dept?.id ?? null,
            cohort_id: cohort?.id ?? null,
          });
        }
        setRows(parsed);
        setErrors(errs);
      },
    });
  }

  async function runImport() {
    setProgress({ done: 0, total: rows.length });
    let done = 0, ok = 0, fail = 0;
    for (const r of rows) {
      const { error } = await supabase.from("students").upsert(r, { onConflict: "roll_number" });
      if (error) fail++; else ok++;
      done++; setProgress({ done, total: rows.length });
    }
    toast.success(`Imported ${ok} students, ${fail} failed`);
    onDone(); onClose();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Import students (CSV)</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Columns: <code>full_name, roll_number, email, phone, gender, section, department_code, cohort</code></p>
        <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        <Button variant="outline" onClick={() => inputRef.current?.click()}><Upload className="mr-2 h-4 w-4" /> Choose CSV</Button>
        {rows.length > 0 && (
          <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-background/60 text-left"><tr><th className="p-2">Name</th><th className="p-2">Roll</th><th className="p-2">Email</th><th className="p-2">Dept</th></tr></thead>
              <tbody>
                {rows.slice(0, 50).map((r, i) => <tr key={i} className="border-t border-border/50"><td className="p-2">{r.full_name}</td><td className="p-2">{r.roll_number}</td><td className="p-2">{r.email}</td><td className="p-2">{r.department_id ? "✓" : "—"}</td></tr>)}
              </tbody>
            </table>
          </div>
        )}
        {errors.length > 0 && <div className="max-h-24 overflow-auto rounded-lg bg-destructive/10 p-2 text-xs text-destructive">{errors.slice(0, 5).map((e, i) => <div key={i}>{e}</div>)}</div>}
        {progress && <div className="text-xs">Importing {progress.done}/{progress.total}…</div>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="gradient-primary text-white" disabled={!rows.length || !!progress} onClick={runImport}>Import {rows.length} rows</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function downloadTemplate() {
  const csv = "full_name,roll_number,email,phone,gender,section,department_code,cohort\nJane Doe,CSE2025001,jane@college.edu,9999999999,female,A,CSE,Cohort 10 · 2025-2026\n";
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a"); a.href = url; a.download = "students-template.csv"; a.click(); URL.revokeObjectURL(url);
}