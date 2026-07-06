import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader, GlassCard } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/features/dashboards/admin-dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Check, X, Eye, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { verifyCertificate, reviewCertificate } from "@/lib/certificate-verify.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/app/certificates")({ component: CertsReview });

function CertsReview() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [notes, setNotes] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const verify = useServerFn(verifyCertificate);
  const review = useServerFn(reviewCertificate);

  const q = useQuery({
    queryKey: ["certs", status, search],
    queryFn: async () => {
      let query = supabase.from("certificates").select("*, students(full_name, roll_number, email, departments(name)), domains(name), companies(name)").order("created_at", { ascending: false }).limit(200);
      if (status !== "all") query = query.eq("status", status);
      const { data } = await query;
      let rows = data ?? [];
      if (search) {
        const s = search.toLowerCase();
        rows = rows.filter((r: any) => [r.students?.full_name, r.students?.roll_number, r.students?.email, r.domains?.name, r.companies?.name, r.certificate_number].some((v) => (v ?? "").toString().toLowerCase().includes(s)));
      }
      return rows;
    },
  });

  async function openDetails(row: any) {
    setSelected(row);
    setNotes(row.reviewer_notes ?? "");
    const { data } = await supabase.storage.from("certificates").createSignedUrl(row.file_url, 300);
    setPreviewUrl(data?.signedUrl ?? null);
  }

  const reReview = useMutation({
    mutationFn: async (id: string) => verify({ data: { certificate_id: id } }),
    onSuccess: () => { toast.success("AI re-verification complete"); qc.invalidateQueries(); },
    onError: (e: any) => toast.error(e.message ?? "AI failed"),
  });

  const decide = useMutation({
    mutationFn: async (decision: "approved" | "rejected" | "needs_review") =>
      review({ data: { certificate_id: selected.id, decision, notes } }),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries(); setSelected(null); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  return (
    <div>
      <PageHeader title="Certificate review queue" description="AI proposes; admin decides." />
      <GlassCard className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input placeholder="Search student, roll, domain, company…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="ai_verified">AI verified</SelectItem>
              <SelectItem value="needs_review">Needs review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </GlassCard>

      <GlassCard className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3">Student</th><th className="p-3">Domain</th><th className="p-3">Company</th>
                <th className="p-3">AI</th><th className="p-3">Status</th><th className="p-3">Date</th><th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(q.data ?? []).map((r: any) => (
                <tr key={r.id} className="border-t border-border/50 hover:bg-accent/30">
                  <td className="p-3">
                    <div className="font-medium">{r.students?.full_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{r.students?.roll_number} · {r.students?.departments?.name ?? ""}</div>
                  </td>
                  <td className="p-3">{r.domains?.name ?? "—"}</td>
                  <td className="p-3">{r.companies?.name ?? "—"}</td>
                  <td className="p-3">{r.ai_confidence != null ? `${Math.round(r.ai_confidence * 100)}%` : "—"}</td>
                  <td className="p-3"><StatusBadge status={r.status} /></td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="p-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => openDetails(r)}><Eye className="h-4 w-4" /></Button>
                  </td>
                </tr>
              ))}
              {(q.data ?? []).length === 0 && (
                <tr><td colSpan={7} className="p-10 text-center text-sm text-muted-foreground">No certificates match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader><DialogTitle>Certificate review</DialogTitle></DialogHeader>
          {selected && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-border">
                {previewUrl ? (
                  selected.file_mime === "application/pdf"
                    ? <object data={previewUrl} type="application/pdf" className="h-[520px] w-full rounded-xl" />
                    : <img src={previewUrl} className="max-h-[520px] w-full rounded-xl object-contain" />
                ) : <div className="grid h-[520px] place-items-center text-sm text-muted-foreground">Loading…</div>}
              </div>
              <div className="space-y-4">
                <div className="rounded-xl border border-border p-3 text-sm">
                  <div className="font-semibold">{selected.students?.full_name}</div>
                  <div className="text-muted-foreground">{selected.students?.roll_number} · {selected.students?.email}</div>
                </div>
                <div className="rounded-xl border border-border p-3 text-sm">
                  <div className="mb-1 flex items-center justify-between"><span className="font-semibold">AI verdict</span><StatusBadge status={selected.status} /></div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>Confidence: <span className="font-medium">{selected.ai_confidence != null ? Math.round(selected.ai_confidence * 100) + "%" : "—"}</span></div>
                    <div>Authenticity: <span className="font-medium">{selected.ai_authenticity != null ? Math.round(selected.ai_authenticity * 100) + "%" : "—"}</span></div>
                  </div>
                  {selected.ai_issues?.length ? <div className="mt-2 text-xs text-amber-700 dark:text-amber-400">Issues: {selected.ai_issues.join(", ")}</div> : null}
                  <div className="mt-2 text-xs text-muted-foreground">{selected.ai_summary?.notes}</div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-muted-foreground">Extracted fields</summary>
                    <pre className="mt-2 overflow-x-auto rounded bg-background/60 p-2 text-[10px]">{JSON.stringify(selected.extracted_data, null, 2)}</pre>
                  </details>
                </div>
                <div>
                  <label className="text-sm font-medium">Reviewer notes</label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1.5" placeholder="Reason for decision…" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button className="gradient-primary text-white" disabled={decide.isPending} onClick={() => decide.mutate("approved")}><Check className="mr-1 h-4 w-4" /> Approve</Button>
                  <Button variant="destructive" disabled={decide.isPending} onClick={() => decide.mutate("rejected")}><X className="mr-1 h-4 w-4" /> Reject</Button>
                  <Button variant="outline" disabled={decide.isPending} onClick={() => decide.mutate("needs_review")}>Needs review</Button>
                  <Button variant="outline" disabled={reReview.isPending} onClick={() => reReview.mutate(selected.id)}>
                    {reReview.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="mr-1 h-4 w-4" /> Re-run AI</>}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}