import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Upload, FileText, Loader2, Sparkles } from "lucide-react";
import { PageHeader, GlassCard } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { useDropdowns } from "@/lib/api";
import { verifyCertificate } from "@/lib/certificate-verify.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/app/upload")({ component: UploadPage });

const schema = z.object({
  domain_id: z.string().min(1, "Select a domain"),
  company_id: z.string().min(1, "Select a company"),
  certificate_type_id: z.string().optional(),
  cohort_id: z.string().optional(),
  certificate_number: z.string().optional(),
  completion_date: z.string().optional(),
});

function UploadPage() {
  const navigate = useNavigate();
  const me = useMe();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const dropdowns = useQuery({ queryKey: ["dropdowns"], queryFn: useDropdowns });
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof schema>) => {
      if (!file) throw new Error("Please select a file");
      if (!me.data?.user.id) throw new Error("Not signed in");
      const student = await supabase.from("students").select("id").eq("profile_id", me.data.user.id).maybeSingle();
      if (!student.data) throw new Error("Your student record isn't linked. Ask admin to import you.");

      const path = `${me.data.user.id}/${crypto.randomUUID()}-${file.name}`;
      const up = await supabase.storage.from("certificates").upload(path, file, { contentType: file.type });
      if (up.error) throw up.error;
      const { data: signed } = await supabase.storage.from("certificates").createSignedUrl(path, 60 * 60);

      const ins = await supabase.from("certificates").insert({
        student_id: student.data.id,
        submitted_by: me.data.user.id,
        domain_id: values.domain_id,
        company_id: values.company_id,
        certificate_type_id: values.certificate_type_id || null,
        cohort_id: values.cohort_id || null,
        certificate_number: values.certificate_number || null,
        completion_date: values.completion_date || null,
        file_url: path,
        file_mime: file.type,
        file_size: file.size,
        status: "pending",
      }).select("id").single();
      if (ins.error) throw ins.error;

      // Kick off AI verification (best-effort)
      try {
        await verifyCertificate({ data: { certificate_id: ins.data.id, signed_url: signed?.signedUrl } });
      } catch (e) {
        console.warn("AI verify skipped", e);
      }
      return ins.data.id;
    },
    onSuccess: () => {
      toast.success("Certificate submitted — AI analysis started");
      qc.invalidateQueries();
      navigate({ to: "/app/my-certificates" });
    },
    onError: (e: any) => toast.error(e.message ?? "Upload failed"),
  });

  return (
    <div>
      <PageHeader title="Upload certificate" description="PDF, PNG or JPEG · up to 15 MB" />
      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <div>
              <Label>Domain *</Label>
              <Select onValueChange={(v) => form.setValue("domain_id", v)}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{dropdowns.data?.domains.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
              {form.formState.errors.domain_id && <p className="mt-1 text-xs text-destructive">{form.formState.errors.domain_id.message}</p>}
            </div>
            <div>
              <Label>Company / Issuer *</Label>
              <Select onValueChange={(v) => form.setValue("company_id", v)}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{dropdowns.data?.companies.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
              {form.formState.errors.company_id && <p className="mt-1 text-xs text-destructive">{form.formState.errors.company_id.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cohort</Label>
                <Select onValueChange={(v) => form.setValue("cohort_id", v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{dropdowns.data?.cohorts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Certificate type</Label>
                <Select onValueChange={(v) => form.setValue("certificate_type_id", v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{dropdowns.data?.certificate_types.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Certificate number</Label><Input className="mt-1.5" {...form.register("certificate_number")} placeholder="ID / serial" /></div>
              <div><Label>Completion date</Label><Input className="mt-1.5" type="date" {...form.register("completion_date")} /></div>
            </div>
            <div>
              <Label>Certificate file *</Label>
              <label className="mt-1.5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/70 bg-background/40 p-8 transition hover:border-primary/60">
                <Upload className="h-6 w-6 text-primary" />
                <div className="text-sm font-medium">{file?.name ?? "Click to upload or drag & drop"}</div>
                <div className="text-xs text-muted-foreground">PDF, PNG, JPEG · max 15 MB</div>
                <input type="file" accept="application/pdf,image/png,image/jpeg" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
            <Button disabled={mutation.isPending || !file} className="h-11 w-full rounded-xl gradient-primary text-white">
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="mr-2 h-4 w-4" /> Submit for AI verification</>}
            </Button>
          </form>
        </GlassCard>

        <GlassCard>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Preview</h3>
          {!preview ? (
            <div className="grid h-80 place-items-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
              <div className="text-center"><FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />Nothing selected</div>
            </div>
          ) : file?.type === "application/pdf" ? (
            <object data={preview} type="application/pdf" className="h-96 w-full rounded-xl" />
          ) : (
            <motion.img initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} src={preview} className="max-h-96 w-full rounded-xl object-contain" alt="Certificate preview" />
          )}
        </GlassCard>
      </div>
    </div>
  );
}