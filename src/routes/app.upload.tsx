import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Upload, FileText, Loader2, Sparkles, CheckSquare } from "lucide-react";
import { PageHeader, GlassCard } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { verifyCertificate } from "@/lib/certificate-verify.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/app/upload")({ component: UploadPage });

function UploadPage() {
  const navigate = useNavigate();
  const me = useMe();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  
  // State for dynamic form
  const [selectedFormId, setSelectedFormId] = useState<string>("");
  const [dynamicValues, setDynamicValues] = useState<Record<string, any>>({});
  const [declarationChecked, setDeclarationChecked] = useState(false);
  
  const [studentDetails, setStudentDetails] = useState({
    full_name: "",
    roll_number: "",
    department_id: "",
    section_id: "",
    program_id: "",
    academic_year_id: ""
  });

  // Queries
  const activeFormsQ = useQuery({ 
    queryKey: ["active_forms"], 
    queryFn: async () => (await supabase.from("forms").select("*, cohorts(name)").eq("status", "published")).data ?? [] 
  });
  
  const selectedForm = activeFormsQ.data?.find((f: any) => f.id === selectedFormId);
  const cohortId = selectedForm?.cohort_id;
  const uploadConfig = selectedForm?.upload_config ?? {};

  const domainsQ = useQuery({ 
    queryKey: ["domains_for_cohort", cohortId], 
    queryFn: async () => {
      let q = supabase.from("domains").select("*");
      if (cohortId) q = q.eq("cohort_id", cohortId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    }
  });

  const studentQ = useQuery({
    queryKey: ["my_student_profile", me.data?.user.id],
    queryFn: async () => {
      if (!me.data?.user.id) return null;
      const { data } = await supabase.from("students").select("*, departments(name)").eq("profile_id", me.data.user.id).maybeSingle();
      return data;
    },
    enabled: !!me.data?.user.id
  });

  const submissionsQ = useQuery({
    queryKey: ["my_submissions", studentQ.data?.id],
    queryFn: async () => {
      if (!studentQ.data?.id) return [];
      const { data } = await supabase.from("certificates").select("domain_id").eq("student_id", studentQ.data.id);
      return data?.map(d => d.domain_id) ?? [];
    },
    enabled: !!studentQ.data?.id
  });

  const deptsQ = useQuery({ queryKey: ["departments"], queryFn: async () => (await supabase.from("departments").select("*")).data ?? [] });
  const sectionsQ = useQuery({ queryKey: ["sections"], queryFn: async () => (await supabase.from("sections").select("*")).data ?? [] });
  const programsQ = useQuery({ queryKey: ["programs"], queryFn: async () => (await supabase.from("programs").select("*")).data ?? [] });
  const yearsQ = useQuery({ queryKey: ["academic_years"], queryFn: async () => (await supabase.from("academic_years").select("*")).data ?? [] });

  const { register, handleSubmit, setValue, formState, watch } = useForm();

  useEffect(() => {
    if (studentQ.data) {
      setStudentDetails({
        full_name: studentQ.data.full_name || "",
        roll_number: studentQ.data.roll_number || "",
        department_id: studentQ.data.department_id || "",
        section_id: studentQ.data.section_id || "",
        program_id: studentQ.data.program_id || "",
        academic_year_id: studentQ.data.academic_year_id || ""
      });
    } else if (me.data?.user) {
      setStudentDetails(prev => ({
        ...prev,
        full_name: me.data.user.user_metadata?.full_name || me.data.user.email?.split("@")[0] || ""
      }));
    }
  }, [studentQ.data, me.data]);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      if (!selectedForm) throw new Error("Please select an active form");
      if (!file) throw new Error("Please select a file");
      
      // Validate config
      const maxBytes = (uploadConfig.maxSizeMB || 15) * 1024 * 1024;
      if (file.size > maxBytes) throw new Error(`File is too large (max ${uploadConfig.maxSizeMB}MB)`);
      if (uploadConfig.requireDeclaration && !declarationChecked) throw new Error("You must agree to the declaration");

      if (!me.data?.user.id) throw new Error("Not signed in");
      
      let studentId = studentQ.data?.id;

      if (!studentDetails.full_name || !studentDetails.roll_number) {
        throw new Error("Please fill in your Name and Registration Number in the Student Details section.");
      }

      const studentData = {
        profile_id: me.data.user.id,
        email: me.data.user.email || "",
        full_name: studentDetails.full_name,
        roll_number: studentDetails.roll_number,
        department_id: studentDetails.department_id || null,
        section_id: studentDetails.section_id || null,
        program_id: studentDetails.program_id || null,
        academic_year_id: studentDetails.academic_year_id || null,
        status: "active"
      };

      if (!studentId) {
        // Auto-create student record if it doesn't exist
        const insStudent = await supabase.from("students").insert(studentData).select("id").single();
        if (insStudent.error) throw insStudent.error;
        studentId = insStudent.data.id;
      } else {
        // Update existing student record with new details
        const upStudent = await supabase.from("students").update(studentData).eq("id", studentId);
        if (upStudent.error) throw upStudent.error;
      }

      if (submissionsQ.data?.includes(values.domain_id)) throw new Error("You have already submitted a certificate for this domain.");

      const path = `${me.data.user.id}/${crypto.randomUUID()}-${file.name}`;
      const up = await supabase.storage.from("certificates").upload(path, file, { contentType: file.type });
      if (up.error) throw up.error;
      const { data: signed } = await supabase.storage.from("certificates").createSignedUrl(path, 60 * 60);

      const formResponse = await supabase.from("form_responses").insert({
        form_id: selectedForm.id,
        student_id: studentId,
        submitted_by: me.data.user.id,
        data: dynamicValues
      });
      if (formResponse.error) throw formResponse.error;

      const ins = await supabase.from("certificates").insert({
        student_id: studentId,
        submitted_by: me.data.user.id,
        domain_id: values.domain_id,
        cohort_id: cohortId,
        file_url: path,
        file_mime: file.type,
        file_size: file.size,
        status: "pending",
      }).select("id").single();
      if (ins.error) throw ins.error;

      // Kick off AI verification if enabled for this form
      if (uploadConfig.enableAI !== false) {
        try { await verifyCertificate({ data: { certificate_id: ins.data.id, signed_url: signed?.signedUrl } }); } 
        catch (e) { console.warn("AI verify skipped", e); }
      }
      return ins.data.id;
    },
    onSuccess: () => {
      toast.success("Certificate submitted successfully!");
      qc.invalidateQueries();
      navigate({ to: "/app/my-certificates" });
    },
    onError: (e: any) => toast.error(e.message ?? "Upload failed"),
  });

  return (
    <div>
      <PageHeader title="Submit Certificate" description="Complete an active form to submit your verification request." />
      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard>
          <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-6">
            
            {/* Form Selection Step */}
            <div className="space-y-3 p-4 bg-primary/5 rounded-xl border border-primary/20">
              <Label className="text-primary font-semibold">1. Select Verification Form</Label>
              <Select onValueChange={setSelectedFormId}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="Select an active form..." /></SelectTrigger>
                <SelectContent>
                  {(activeFormsQ.data ?? []).map((f: any) => (
                    <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedForm && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                
                {/* Student Details Form */}
                <div className="bg-primary/5 rounded-xl border border-primary/20 p-4 space-y-4">
                  <Label className="text-primary font-semibold border-b border-primary/10 pb-2 flex">Student Details</Label>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-xs">Name *</Label>
                      <Input value={studentDetails.full_name} onChange={e => setStudentDetails({...studentDetails, full_name: e.target.value})} required />
                    </div>
                    <div>
                      <Label className="text-xs">Registration Number *</Label>
                      <Input value={studentDetails.roll_number} onChange={e => setStudentDetails({...studentDetails, roll_number: e.target.value})} required />
                    </div>
                    <div>
                      <Label className="text-xs">Department</Label>
                      <Select value={studentDetails.department_id} onValueChange={v => setStudentDetails({...studentDetails, department_id: v})}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select Department" /></SelectTrigger>
                        <SelectContent>
                          {deptsQ.data?.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Section</Label>
                      <Select value={studentDetails.section_id} onValueChange={v => setStudentDetails({...studentDetails, section_id: v})}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select Section" /></SelectTrigger>
                        <SelectContent>
                          {sectionsQ.data?.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Class</Label>
                      <Select value={studentDetails.program_id} onValueChange={v => setStudentDetails({...studentDetails, program_id: v})}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select Class" /></SelectTrigger>
                        <SelectContent>
                          {programsQ.data?.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Year</Label>
                      <Select value={studentDetails.academic_year_id} onValueChange={v => setStudentDetails({...studentDetails, academic_year_id: v})}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select Year" /></SelectTrigger>
                        <SelectContent>
                          {yearsQ.data?.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs uppercase">Assigned Cohort</Label>
                    <div className="mt-1 font-medium bg-muted/30 px-3 py-2 rounded-md border border-border cursor-not-allowed">
                      {selectedForm.cohorts?.name ?? "Global"}
                    </div>
                  </div>
                  <div>
                    <Label>Domain *</Label>
                    <Select onValueChange={(v) => setValue("domain_id", v)} required>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select Domain" /></SelectTrigger>
                      <SelectContent>
                        {domainsQ.data?.map((d: any) => {
                          const isSub = submissionsQ.data?.includes(d.id);
                          return (
                            <SelectItem key={d.id} value={d.id} disabled={isSub}>
                              {d.name} {isSub && " (✓ Already Submitted)"}
                            </SelectItem>
                          );
                        })}
                        {domainsQ.data?.length === 0 && <SelectItem value="none" disabled>No domains in this cohort</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Dynamic Fields */}
                {selectedForm.schema?.length > 0 && (
                  <div className="space-y-4 border-t border-border/50 pt-4">
                    <Label className="text-sm font-semibold">Additional Information</Label>
                    {selectedForm.schema.map((fd: any) => (
                      <div key={fd.key}>
                        <Label>{fd.label} {fd.required && "*"}</Label>
                        {fd.type === "textarea" ? (
                          <Textarea className="mt-1.5" required={fd.required} onChange={e => setDynamicValues({...dynamicValues, [fd.key]: e.target.value})} />
                        ) : (
                          <Input className="mt-1.5" type={fd.type} required={fd.required} onChange={e => setDynamicValues({...dynamicValues, [fd.key]: e.target.value})} />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t border-border/50 pt-4">
                  <Label>Certificate File *</Label>
                  <label className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/70 bg-background/40 p-8 transition hover:border-primary/60 hover:bg-primary/5">
                    <Upload className="h-6 w-6 text-primary" />
                    <div className="text-sm font-medium">{file?.name ?? "Click to upload or drag & drop"}</div>
                    <div className="text-xs text-muted-foreground">
                      Allowed: {uploadConfig.allowedTypes?.join(', ').toUpperCase() ?? 'PDF, JPG, PNG'} · max {uploadConfig.maxSizeMB ?? 15} MB
                    </div>
                    <input type="file" className="hidden" 
                           accept={(uploadConfig.allowedTypes ?? ['pdf','jpg','png']).map((t: string) => `.${t}`).join(',')}
                           onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                  </label>
                </div>

                {uploadConfig.requireDeclaration && (
                  <label className="flex items-start gap-3 p-4 bg-muted/30 rounded-xl border border-border">
                    <Checkbox checked={declarationChecked} onCheckedChange={(c) => setDeclarationChecked(!!c)} className="mt-0.5" />
                    <div className="text-sm">
                      <span className="font-medium text-foreground">Academic Integrity Declaration</span>
                      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                        I hereby declare that the certificate uploaded is authentic and rightfully belongs to me. I understand that submitting fraudulent documents will result in disciplinary action.
                      </p>
                    </div>
                  </label>
                )}

                <Button disabled={mutation.isPending || !file || (uploadConfig.requireDeclaration && !declarationChecked)} className="h-11 w-full rounded-xl gradient-primary text-white">
                  {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                    <><Sparkles className="mr-2 h-4 w-4" /> Submit Certificate</>
                  )}
                </Button>
              </motion.div>
            )}
          </form>
        </GlassCard>

        <GlassCard>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Preview</h3>
          {!preview ? (
            <div className="grid h-80 place-items-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
              <div className="text-center"><FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />No file selected</div>
            </div>
          ) : file?.type === "application/pdf" ? (
            <object data={preview} type="application/pdf" className="h-[600px] w-full rounded-xl" />
          ) : (
            <motion.img initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} src={preview} className="max-h-[600px] w-full rounded-xl object-contain" alt="Certificate preview" />
          )}
        </GlassCard>
      </div>
    </div>
  );
}