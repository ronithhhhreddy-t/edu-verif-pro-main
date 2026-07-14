import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader, GlassCard } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Loader2, Edit3 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/app/master-data/cohorts")({
  component: CohortsList,
});

function formatMonthYear(ds: string | null) {
  if (!ds) return "—";
  const [year, month] = ds.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(month) - 1]}-${year.slice(2)}`;
}

function CohortsList() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);

  const q = useQuery({
    queryKey: ["cohorts_list"],
    queryFn: async () => {
      const { data: cohortsData, error } = await supabase.from("cohorts").select(`
        id, name, start_date, end_date, status, description,
        students (count)
      `).order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch domains separately to avoid PostgREST relationship ambiguity errors
      // when the unused cohort_domains table exists in the schema.
      const { data: domainsData } = await supabase.from("domains").select("cohort_id");

      return cohortsData.map((c: any) => {
        const domainCount = domainsData?.filter(d => d.cohort_id === c.id).length || 0;
        return {
          ...c,
          domainsCount: domainCount
        };
      });
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cohorts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cohort deleted");
      qc.invalidateQueries({ queryKey: ["cohorts_list"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader 
        title="Cohorts" 
        description="Manage student batches, assignments, and timelines." 
        actions={<Button className="gradient-primary text-white" onClick={() => setEditing({ status: 'Active' })}><Plus className="mr-2 h-4 w-4" /> Create Cohort</Button>}
      />
      <GlassCard className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-background/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-4 font-semibold">Cohort Name</th>
              <th className="p-4 font-semibold">Start Date</th>
              <th className="p-4 font-semibold">End Date</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-center">Domains</th>
              <th className="p-4 font-semibold text-center">Students</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {(q.data ?? []).map((c: any) => (
              <tr key={c.id} className="transition-colors hover:bg-muted/30">
                <td className="p-4 font-medium">{c.name}</td>
                <td className="p-4 text-muted-foreground">{formatMonthYear(c.start_date)}</td>
                <td className="p-4 text-muted-foreground">{formatMonthYear(c.end_date)}</td>
                <td className="p-4">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${c.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
                    {c.status}
                  </span>
                </td>
                <td className="p-4 text-center font-medium">{c.domainsCount}</td>
                <td className="p-4 text-center font-medium">{c.students?.[0]?.count ?? 0}</td>
                <td className="p-4 text-right">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(c)}>
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => {
                    if(confirm("Are you sure?")) del.mutate(c.id);
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {q.data?.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No cohorts found.</td></tr>}
          </tbody>
        </table>
      </GlassCard>

      {editing && <CohortEditor cohort={editing} onClose={() => setEditing(null)} onSaved={() => qc.invalidateQueries({ queryKey: ["cohorts_list"] })} />}
    </div>
  );
}

function CohortEditor({ cohort, onClose, onSaved }: any) {
  const [f, setF] = useState<any>({ ...cohort });
  const isNew = !cohort.id;

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...f };
      
      // Remove synthetic fields that don't belong in the database
      delete payload.domainsCount;
      delete payload.students;
      
      // If we used a month picker (YYYY-MM), pad it with -01 to become a valid date for Postgres
      if (payload.start_date && payload.start_date.length === 7) payload.start_date = `${payload.start_date}-01`;
      if (payload.end_date && payload.end_date.length === 7) payload.end_date = `${payload.end_date}-01`;
      
      if (!payload.start_date) payload.start_date = null;
      if (!payload.end_date) payload.end_date = null;
      
      if (isNew) {
        const { error } = await supabase.from("cohorts").insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cohorts").update(payload).eq("id", cohort.id);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Saved successfully"); onSaved(); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isNew ? "Create Cohort" : "Edit Cohort"}</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Cohort Name *</Label>
            <Input className="mt-1" value={f.name || ""} onChange={e => setF({...f, name: e.target.value})} placeholder="e.g. 2026 Batch - Engineering" />
          </div>
          <div>
            <Label>Start Date (Month & Year)</Label>
            <Input type="month" className="mt-1" value={f.start_date ? f.start_date.slice(0, 7) : ""} onChange={e => setF({...f, start_date: e.target.value})} />
          </div>
          <div>
            <Label>End Date (Month & Year)</Label>
            <Input type="month" className="mt-1" value={f.end_date ? f.end_date.slice(0, 7) : ""} onChange={e => setF({...f, end_date: e.target.value})} />
          </div>
          <div className="sm:col-span-2">
            <Label>Status</Label>
            <Select value={f.status} onValueChange={v => setF({...f, status: v})}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Description</Label>
            <Textarea className="mt-1" rows={3} value={f.description || ""} onChange={e => setF({...f, description: e.target.value})} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="gradient-primary text-white" disabled={save.isPending || !f.name} onClick={() => save.mutate()}>
            {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Cohort"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
