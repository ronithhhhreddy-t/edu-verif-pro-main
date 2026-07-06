import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader, GlassCard } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Edit3, Eye } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/forms")({ component: FormsPage });

type Field = { key: string; label: string; type: "text" | "textarea" | "email" | "phone" | "date" | "select" | "checkbox" | "file"; required?: boolean; options?: string[] };

function FormsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const q = useQuery({ queryKey: ["forms"], queryFn: async () => (await supabase.from("forms").select("*").order("created_at", { ascending: false })).data ?? [] });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("forms").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["forms"] }); toast.success("Deleted"); },
  });
  return (
    <div>
      <PageHeader title="Form builder" description="Publish dynamic forms — no code changes needed."
        actions={<Button className="gradient-primary text-white" onClick={() => setEditing({ title: "", slug: "", status: "draft", schema: [] })}><Plus className="mr-1 h-4 w-4" /> New form</Button>} />
      <div className="grid gap-3">
        {(q.data ?? []).map((f: any) => (
          <GlassCard key={f.id} className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2"><span className="font-semibold">{f.title}</span><Badge variant="outline">{f.status}</Badge><span className="text-xs text-muted-foreground">v{f.version}</span></div>
              <div className="text-xs text-muted-foreground">/{f.slug} · {(f.schema ?? []).length} fields</div>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setEditing(f)}><Edit3 className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => del.mutate(f.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </GlassCard>
        ))}
        {(q.data ?? []).length === 0 && <GlassCard><div className="p-8 text-center text-sm text-muted-foreground">No forms yet.</div></GlassCard>}
      </div>
      {editing && <FormEditor form={editing} onClose={() => setEditing(null)} onSaved={() => qc.invalidateQueries({ queryKey: ["forms"] })} />}
    </div>
  );
}

function FormEditor({ form, onClose, onSaved }: any) {
  const [f, setF] = useState<any>({ ...form, schema: form.schema ?? [] });
  const [preview, setPreview] = useState(false);
  function addField() {
    setF({ ...f, schema: [...f.schema, { key: `field_${f.schema.length + 1}`, label: "New field", type: "text", required: false } as Field] });
  }
  function updField(i: number, patch: Partial<Field>) {
    const s = [...f.schema]; s[i] = { ...s[i], ...patch }; setF({ ...f, schema: s });
  }
  function delField(i: number) {
    const s = [...f.schema]; s.splice(i, 1); setF({ ...f, schema: s });
  }
  const save = useMutation({
    mutationFn: async () => {
      const payload: any = { title: f.title, slug: f.slug, status: f.status, schema: f.schema, description: f.description ?? null };
      if (f.id) { const { error } = await supabase.from("forms").update(payload).eq("id", f.id); if (error) throw error; }
      else { const { error } = await supabase.from("forms").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { toast.success("Saved"); onSaved(); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader><DialogTitle>{f.id ? "Edit form" : "New form"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="text-xs">Title</label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div><label className="text-xs">Slug</label><Input value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value.replace(/[^a-z0-9-]/gi, "-").toLowerCase() })} /></div>
          <div><label className="text-xs">Status</label>
            <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="published">Published</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent></Select>
          </div>
          <div className="sm:col-span-2"><label className="text-xs">Description</label><Textarea value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} rows={2} /></div>
        </div>
        <div className="mt-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Fields</h3>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => setPreview(!preview)}><Eye className="mr-1 h-4 w-4" /> {preview ? "Editor" : "Preview"}</Button>
              <Button size="sm" onClick={addField}><Plus className="mr-1 h-4 w-4" /> Add field</Button>
            </div>
          </div>
          {!preview ? (
            <div className="max-h-96 space-y-2 overflow-y-auto rounded-xl border border-border p-2">
              {f.schema.map((fd: Field, i: number) => (
                <div key={i} className="grid grid-cols-12 gap-2 rounded-lg bg-background/40 p-2">
                  <Input className="col-span-3" placeholder="Key" value={fd.key} onChange={(e) => updField(i, { key: e.target.value })} />
                  <Input className="col-span-4" placeholder="Label" value={fd.label} onChange={(e) => updField(i, { label: e.target.value })} />
                  <Select value={fd.type} onValueChange={(v) => updField(i, { type: v as any })}>
                    <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                    <SelectContent>{["text","textarea","email","phone","date","select","checkbox","file"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                  <label className="col-span-1 flex items-center gap-1 text-xs"><input type="checkbox" checked={!!fd.required} onChange={(e) => updField(i, { required: e.target.checked })} /> req</label>
                  <Button size="icon" variant="ghost" className="col-span-1 text-destructive" onClick={() => delField(i)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              {f.schema.length === 0 && <div className="p-8 text-center text-xs text-muted-foreground">No fields yet.</div>}
            </div>
          ) : (
            <div className="rounded-xl border border-border p-4">
              <h4 className="mb-2 font-semibold">{f.title}</h4>
              {f.schema.map((fd: Field) => (
                <div key={fd.key} className="mb-3">
                  <label className="text-xs">{fd.label}{fd.required ? " *" : ""}</label>
                  {fd.type === "textarea" ? <Textarea /> : <Input type={fd.type === "phone" ? "tel" : fd.type} />}
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="gradient-primary text-white" onClick={() => save.mutate()} disabled={save.isPending || !f.title || !f.slug}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}