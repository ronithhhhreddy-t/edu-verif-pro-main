import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  certificate_id: z.string().uuid(),
  signed_url: z.string().url().optional(),
});

export const verifyCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: cert, error } = await supabase
      .from("certificates")
      .select("id, file_url, file_mime, student_id, domain_id, company_id, students(full_name, roll_number), domains(name), companies(name)")
      .eq("id", data.certificate_id)
      .maybeSingle();
    if (error || !cert) throw new Error("Certificate not found");

    let signedUrl = data.signed_url;
    if (!signedUrl) {
      const { data: s } = await supabase.storage.from("certificates").createSignedUrl(cert.file_url, 60 * 60);
      signedUrl = s?.signedUrl;
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey || !signedUrl) {
      await supabase.from("certificates").update({ status: "needs_review", ai_summary: { note: "AI not configured" } }).eq("id", data.certificate_id);
      return { status: "needs_review" as const };
    }

    const student = (cert as any).students;
    const domainName = (cert as any).domains?.name;
    const companyName = (cert as any).companies?.name;

    const systemPrompt = `You are an expert academic-credential auditor. You analyze uploaded internship / course completion certificates and return a strict JSON verdict.
Detect: fake certificates, edited images/PDFs, mismatched names/roll numbers, wrong domain/company, missing signatures, tampering.
Return ONLY valid JSON matching this schema:
{
  "extracted": { "student_name": string|null, "roll_number": string|null, "domain": string|null, "company": string|null, "certificate_id": string|null, "issue_date": string|null, "completion_date": string|null, "has_qr": boolean, "has_logo": boolean, "has_signature": boolean },
  "confidence": number (0..1),
  "authenticity": number (0..1),
  "issues": string[],
  "recommendation": "verified" | "needs_review" | "rejected",
  "notes": string
}`;

    const userText = `Verify this certificate against the student record.
Expected student: ${student?.full_name ?? "unknown"} · Roll: ${student?.roll_number ?? "unknown"}
Expected domain: ${domainName ?? "unknown"}
Expected company/issuer: ${companyName ?? "unknown"}
Compare extracted OCR fields against the expected values and flag any mismatch.`;

    const isPdf = cert.file_mime === "application/pdf";
    const parts: any[] = [{ type: "text", text: userText }];
    if (isPdf) {
      // For PDFs, use file part with signed URL fetched as base64
      const res = await fetch(signedUrl);
      const buf = await res.arrayBuffer();
      const b64 = Buffer.from(buf).toString("base64");
      parts.push({ type: "file", file: { filename: "certificate.pdf", file_data: `data:application/pdf;base64,${b64}` } });
    } else {
      parts.push({ type: "image_url", image_url: { url: signedUrl } });
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: parts },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      await supabase.from("certificates").update({ status: "needs_review", ai_summary: { error: errText.slice(0, 500) } }).eq("id", data.certificate_id);
      await supabase.from("verification_logs").insert({ certificate_id: data.certificate_id, action: "ai_run", to_status: "needs_review", notes: "AI error", payload: { status: aiRes.status } });
      return { status: "needs_review" as const, error: errText };
    }

    const aiJson = await aiRes.json();
    let parsed: any = {};
    try {
      parsed = JSON.parse(aiJson.choices?.[0]?.message?.content ?? "{}");
    } catch {
      parsed = { recommendation: "needs_review", issues: ["Could not parse AI response"], confidence: 0.3, authenticity: 0.3 };
    }

    const status = parsed.recommendation === "verified" ? "ai_verified"
      : parsed.recommendation === "rejected" ? "needs_review" // still requires admin final say
      : "needs_review";

    await supabase.from("certificates").update({
      status,
      ai_confidence: Number(parsed.confidence ?? 0),
      ai_authenticity: Number(parsed.authenticity ?? 0),
      ai_summary: { notes: parsed.notes ?? "", recommendation: parsed.recommendation },
      ai_issues: parsed.issues ?? [],
      extracted_data: parsed.extracted ?? {},
    }).eq("id", data.certificate_id);

    await supabase.from("verification_logs").insert({
      certificate_id: data.certificate_id,
      action: "ai_run",
      to_status: status,
      notes: parsed.notes ?? null,
      payload: parsed,
    });

    return { status, parsed };
  });

const ReviewInput = z.object({
  certificate_id: z.string().uuid(),
  decision: z.enum(["approved", "rejected", "needs_review"]),
  notes: z.string().optional(),
});

export const reviewCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ReviewInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("is_admin", { _user: userId });
    if (!isAdmin) throw new Error("Forbidden");
    const { data: prev } = await supabase.from("certificates").select("status, student_id").eq("id", data.certificate_id).maybeSingle();
    const upd = await supabase.from("certificates").update({
      status: data.decision,
      reviewer_id: userId,
      reviewer_notes: data.notes ?? null,
      reviewed_at: new Date().toISOString(),
    }).eq("id", data.certificate_id).select("id, student_id").single();
    if (upd.error) throw upd.error;
    await supabase.from("verification_logs").insert({
      certificate_id: data.certificate_id,
      actor_id: userId,
      action: "review",
      from_status: prev?.status,
      to_status: data.decision,
      notes: data.notes ?? null,
    });
    // Notify student
    const { data: student } = await supabase.from("students").select("profile_id").eq("id", upd.data.student_id).maybeSingle();
    if (student?.profile_id) {
      await supabase.from("notifications").insert({
        user_id: student.profile_id,
        title: `Certificate ${data.decision}`,
        body: data.notes ?? `Your certificate has been ${data.decision}.`,
        category: "certificate",
        link: "/app/my-certificates",
      });
    }
    return { ok: true };
  });