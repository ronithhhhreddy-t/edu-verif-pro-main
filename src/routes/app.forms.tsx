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
import { Plus, Trash2, Edit3, Eye, Settings2, FileText, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/app/forms")({ component: FormsPage });

type Field = { key: string; label: string; type: "text" | "textarea" | "email" | "phone" | "date" | "select" | "checkbox" | "file"; required?: boolean; options?: string[] };
type UploadConfig = { allowedTypes: string[]; maxSizeMB: number; requireSignature: boolean; enableOCR: boolean; enableAI: boolean; requireDeclaration: boolean };

function FormsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const q = useQuery({ 
    queryKey: ["forms"], 
    queryFn: async () => {
      const { data } = await supabase.from("forms").select("*, cohorts(name)").order("created_at", { ascending: false });
      return data ?? [];
    }
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("forms").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["forms"] }); toast.success("Deleted"); },
  });

  return (
    <div>
      <PageHeader 
        title="Form Builder" 
        description="Design dynamic forms, map them to cohorts, and set verification rules."
        actions={<Button className="gradient-primary text-white" onClick={() => setEditing({ title: "", slug: "", status: "draft", schema: [], upload_config: { allowedTypes: ["pdf", "jpg", "png"], maxSizeMB: 5, requireSignature: false, enableOCR: false, enableAI: false, requireDeclaration: true } })}><Plus className="mr-2 h-4 w-4" /> Create Form</Button>} 
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(q.data ?? []).map((f: any) => (
          <GlassCard key={f.id} className="flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{f.title}</h3>
                <div className="text-xs text-muted-foreground mt-1">/{f.slug}</div>
              </div>
              <Badge variant={f.status === 'published' ? 'default' : 'outline'} className={f.status === 'published' ? 'bg-primary text-white' : ''}>
                {f.status}
              </Badge>
            </div>
            
            <div className="flex-1 space-y-2 text-sm">
              <div className="flex justify-between border-b border-border/50 pb-1">
                <span className="text-muted-foreground">Cohort</span>
                <span className="font-medium">{f.cohorts?.name ?? "Global"}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-1">
                <span className="text-muted-foreground">Fields</span>
                <span className="font-medium">{(f.schema ?? []).length} custom fields</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-muted-foreground">Responses</span>
                <span className="font-medium">0 / {f.max_submissions || '∞'}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-border/50">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditing(f)}><Edit3 className="mr-2 h-4 w-4" /> Edit</Button>
              <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => del.mutate(f.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </GlassCard>
        ))}
        {(q.data ?? []).length === 0 && (
          <div className="col-span-full p-12 text-center border border-dashed border-border rounded-2xl">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
            <h3 className="text-lg font-medium">No forms created yet</h3>
            <p className="text-sm text-muted-foreground">Create your first form to start collecting certificates.</p>
          </div>
        )}
      </div>
      {editing && <FormEditor form={editing} onClose={() => setEditing(null)} onSaved={() => qc.invalidateQueries({ queryKey: ["forms"] })} />}
    </div>
  );
}

function FormEditor({ form, onClose, onSaved }: any) {
  const [f, setF] = useState<any>({ ...form, schema: form.schema ?? [], upload_config: form.upload_config ?? { allowedTypes: ["pdf", "jpg", "png"], maxSizeMB: 5 } });
  const [activeTab, setActiveTab] = useState<"general" | "fields" | "upload">("general");
  
  const cohortsQ = useQuery({ queryKey: ["cohorts_list"], queryFn: async () => (await supabase.from("cohorts").select("id, name")).data ?? [] });

  function addField() {
    setF({ ...f, schema: [...f.schema, { key: `field_${f.schema.length + 1}`, label: "New field", type: "text", required: false } as Field] });
  }
  function updField(i: number, patch: Partial<Field>) {
    const s = [...f.schema]; s[i] = { ...s[i], ...patch }; setF({ ...f, schema: s });
  }
  function delField(i: number) {
    const s = [...f.schema]; s.splice(i, 1); setF({ ...f, schema: s });
  }
  function moveField(i: number, dir: number) {
    const s = [...f.schema];
    if (i + dir < 0 || i + dir >= s.length) return;
    const temp = s[i];
    s[i] = s[i + dir];
    s[i + dir] = temp;
    setF({ ...f, schema: s });
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = { 
        title: f.title, slug: f.slug, status: f.status, schema: f.schema, description: f.description ?? null,
        cohort_id: f.cohort_id || null, opening_date: f.opening_date || null, closing_date: f.closing_date || null,
        max_submissions: f.max_submissions || null, upload_config: f.upload_config
      };
      if (f.id) { const { error } = await supabase.from("forms").update(payload).eq("id", f.id); if (error) throw error; }
      else { const { error } = await supabase.from("forms").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { toast.success("Saved"); onSaved(); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{f.id ? "Edit Form Template" : "New Form Template"}</DialogTitle></DialogHeader>
        
        <div className="flex border-b border-border mb-4">
          <button className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'general' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`} onClick={() => setActiveTab('general')}>General</button>
          <button className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'fields' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`} onClick={() => setActiveTab('fields')}>Form Fields</button>
          <button className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'upload' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`} onClick={() => setActiveTab('upload')}>Upload Config</button>
        </div>

        <div className={activeTab === 'general' ? 'block' : 'hidden'}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="text-xs font-medium">Form Title</label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. 2026 Semester 1 Verification" /></div>
            <div><label className="text-xs font-medium">URL Slug</label><Input value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value.replace(/[^a-z0-9-]/gi, "-").toLowerCase() })} /></div>
            <div><label className="text-xs font-medium">Applicable Cohort</label>
              <Select value={f.cohort_id || "none"} onValueChange={(v) => setF({ ...f, cohort_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Select Cohort" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Global (All Cohorts)</SelectItem>
                  {(cohortsQ.data ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><label className="text-xs font-medium">Status</label>
              <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="published">Published</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent>
              </Select>
            </div>
            <div><label className="text-xs font-medium">Opening Date (Optional)</label><Input type="date" value={f.opening_date ? f.opening_date.split('T')[0] : ""} onChange={(e) => setF({ ...f, opening_date: e.target.value || null })} /></div>
            <div><label className="text-xs font-medium">Closing Date (Optional)</label><Input type="date" value={f.closing_date ? f.closing_date.split('T')[0] : ""} onChange={(e) => setF({ ...f, closing_date: e.target.value || null })} /></div>
            <div className="sm:col-span-2"><label className="text-xs font-medium">Description</label><Textarea value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} rows={2} /></div>
          </div>
        </div>

        <div className={activeTab === 'fields' ? 'block' : 'hidden'}>
          <div className="mb-4 bg-muted/30 p-3 rounded-lg border border-border text-sm">
            <strong>Default Fields:</strong> Student Name, Reg No, Email, Dept, Section, Cohort, Domain are captured automatically. Add custom fields below.
          </div>
          <div className="space-y-3 mb-4">
            {f.schema.map((fd: Field, i: number) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-background/50 border border-border p-3">
                <div className="flex flex-col gap-1">
                  <button onClick={() => moveField(i, -1)} disabled={i===0} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button>
                  <button onClick={() => moveField(i, 1)} disabled={i===f.schema.length-1} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button>
                </div>
                <Input className="flex-1" placeholder="Label" value={fd.label} onChange={(e) => updField(i, { label: e.target.value, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })} />
                <Select value={fd.type} onValueChange={(v) => updField(i, { type: v as any })}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{["text","textarea","email","phone","date","select","checkbox","file"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
                <label className="flex items-center gap-2 text-xs font-medium px-2"><Checkbox checked={!!fd.required} onCheckedChange={(c) => updField(i, { required: !!c })} /> Req</label>
                <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => delField(i)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            {f.schema.length === 0 && <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">No custom fields added.</div>}
          </div>
          <Button size="sm" variant="outline" onClick={addField}><Plus className="mr-2 h-4 w-4" /> Add Custom Field</Button>
        </div>

        <div className={activeTab === 'upload' ? 'block' : 'hidden'}>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Max File Size (MB)</label>
              <Input type="number" className="mt-1" value={f.upload_config.maxSizeMB} onChange={(e) => setF({...f, upload_config: {...f.upload_config, maxSizeMB: parseInt(e.target.value)}})} />
            </div>
            <div>
              <label className="text-sm font-medium">Allowed File Types</label>
              <div className="flex gap-2 mt-2">
                {['pdf', 'jpg', 'png', 'docx', 'zip'].map(ext => (
                  <label key={ext} className="flex items-center gap-1 text-sm uppercase">
                    <Checkbox 
                      checked={f.upload_config.allowedTypes.includes(ext)} 
                      onCheckedChange={(c) => {
                        const types = new Set(f.upload_config.allowedTypes);
                        if (c) types.add(ext); else types.delete(ext);
                        setF({...f, upload_config: {...f.upload_config, allowedTypes: Array.from(types)}});
                      }} 
                    /> {ext}
                  </label>
                ))}
              </div>
            </div>
            
            <div className="sm:col-span-2 space-y-4 border-t border-border pt-4">
              <h4 className="font-medium">Verification Rules</h4>
              <label className="flex items-center gap-3">
                <Checkbox checked={f.upload_config.enableOCR} onCheckedChange={(c) => setF({...f, upload_config: {...f.upload_config, enableOCR: !!c}})} />
                <div>
                  <div className="text-sm font-medium">Enable OCR Data Extraction</div>
                  <div className="text-xs text-muted-foreground">Automatically read text from uploaded certificates</div>
                </div>
              </label>
              <label className="flex items-center gap-3">
                <Checkbox checked={f.upload_config.enableAI} onCheckedChange={(c) => setF({...f, upload_config: {...f.upload_config, enableAI: !!c}})} />
                <div>
                  <div className="text-sm font-medium">Enable AI Verification</div>
                  <div className="text-xs text-muted-foreground">Pre-verify certificates using AI before faculty review</div>
                </div>
              </label>
              <label className="flex items-center gap-3">
                <Checkbox checked={f.upload_config.requireDeclaration} onCheckedChange={(c) => setF({...f, upload_config: {...f.upload_config, requireDeclaration: !!c}})} />
                <div>
                  <div className="text-sm font-medium">Require Student Declaration</div>
                  <div className="text-xs text-muted-foreground">Student must agree to academic integrity terms</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6 border-t border-border pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="gradient-primary text-white" onClick={() => save.mutate()} disabled={save.isPending || !f.title || !f.slug}>
            {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Save Form
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}