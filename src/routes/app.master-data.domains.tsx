import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader, GlassCard } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Edit3, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/app/master-data/domains")({
  component: DomainsList,
});

function DomainsList() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);

  const q = useQuery({
    queryKey: ["domains_list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("domains").select(`
        id, name, description, cohort_id, certificate_required, ai_verification_enabled, status,
        cohorts (name)
      `).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("domains").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Domain deleted");
      qc.invalidateQueries({ queryKey: ["domains_list"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader 
        title="Domains" 
        description="Manage domain programs and verification rules." 
        actions={<Button className="gradient-primary text-white" onClick={() => setEditing({ status: 'Active', certificate_required: true, ai_verification_enabled: false })}><Plus className="mr-2 h-4 w-4" /> Create Domain</Button>}
      />
      <GlassCard className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-background/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-4 font-semibold">Domain Name</th>
              <th className="p-4 font-semibold">Cohort</th>
              <th className="p-4 font-semibold">Rules</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {(q.data ?? []).map((d: any) => (
              <tr key={d.id} className="transition-colors hover:bg-muted/30">
                <td className="p-4">
                  <div className="font-medium">{d.name}</div>
                </td>
                <td className="p-4 text-muted-foreground">{d.cohorts?.name ?? "—"}</td>
                <td className="p-4">
                  <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                    {d.certificate_required && <span>• Cert Required</span>}
                    {d.ai_verification_enabled && <span>• AI Verification</span>}
                  </div>
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${d.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                    {d.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(d)}>
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => {
                    if (confirm("Are you sure?")) del.mutate(d.id);
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {q.data?.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No domains found.</td></tr>}
          </tbody>
        </table>
      </GlassCard>

      {editing && <DomainEditor domain={editing} onClose={() => setEditing(null)} onSaved={() => qc.invalidateQueries({ queryKey: ["domains_list"] })} />}
    </div>
  );
}

function DomainEditor({ domain, onClose, onSaved }: any) {
  const [f, setF] = useState<any>({ ...domain });
  const isNew = !domain.id;

  const cohortsQ = useQuery({ queryKey: ["cohorts_dropdown"], queryFn: async () => (await supabase.from("cohorts").select("id, name").order("name")).data ?? [] });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...f };
      delete payload.cohorts; // remove join data
      
      if (!payload.cohort_id) payload.cohort_id = null;
      
      if (isNew) {
        const { error } = await supabase.from("domains").insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("domains").update(payload).eq("id", domain.id);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Saved successfully"); onSaved(); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{isNew ? "Create Domain" : "Edit Domain"}</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Domain Name *</Label>
            <Input className="mt-1" value={f.name || ""} onChange={e => setF({...f, name: e.target.value})} placeholder="e.g. Artificial Intelligence" />
          </div>
          <div>
            <Label>Assign to Cohort</Label>
            <Select value={f.cohort_id || "none"} onValueChange={v => setF({...f, cohort_id: v === "none" ? null : v})}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select Cohort" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {cohortsQ.data?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Description</Label>
            <Textarea className="mt-1" rows={2} value={f.description || ""} onChange={e => setF({...f, description: e.target.value})} />
          </div>
          
          <div className="sm:col-span-2 border-t border-border pt-4 mt-2">
            <h4 className="text-sm font-semibold mb-3">Verification Rules</h4>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="flex items-center gap-2">
                <Checkbox checked={f.certificate_required} onCheckedChange={c => setF({...f, certificate_required: !!c})} />
                <span className="text-sm">Certificate Required</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox checked={f.ai_verification_enabled} onCheckedChange={c => setF({...f, ai_verification_enabled: !!c})} />
                <span className="text-sm">Enable AI Verification</span>
              </label>
              <div>
                <Label>Status</Label>
                <Select value={f.status} onValueChange={v => setF({...f, status: v})}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="mt-4 border-t border-border pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="gradient-primary text-white" disabled={save.isPending || !f.name} onClick={() => save.mutate()}>
            {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Domain"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
