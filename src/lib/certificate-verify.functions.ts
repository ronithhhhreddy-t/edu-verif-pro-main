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
      .select("id, file_url, file_mime, student_id, domain_id, students(full_name, roll_number), domains(name)")
      .eq("id", data.certificate_id)
      .maybeSingle();
    if (error || !cert) throw new Error("Certificate not found");

    let signedUrl = data.signed_url;
    if (!signedUrl) {
      const { data: s } = await supabase.storage.from("certificates").createSignedUrl(cert.file_url, 60 * 60);
      signedUrl = s?.signedUrl;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || !signedUrl) {
      await supabase.from("certificates").update({ status: "needs_review", ai_summary: { note: "AI not configured (GEMINI_API_KEY missing)" } }).eq("id", data.certificate_id);
      return { status: "needs_review" as const };
    }

    const student = (cert as any).students;
    const domainName = (cert as any).domains?.name;

    const systemPrompt = `You are an enterprise-grade AI Certificate Verification Engine. 
You must analyze uploaded internship/course completion certificates and run a strict verification pipeline.

Pipeline Steps:
1. OCR Extraction: Extract all visible text (Student Name, Registration/Roll Number, Company Name, Domain, Dates, QR Code text, Signatures).
2. Student Record Validation: Compare extracted data exactly with the expected student profile and domain. Any mismatch is a red flag.
3. Template & Logo Matching: Identify the corporate logo (e.g. AWS, Google, Cisco) and verify if the layout matches typical templates for that issuer.
4. Tampering & Image Forensics: Inspect for signs of digital tampering, copy-pasting, font anomalies, or manipulated text overlays.
5. Decision Engine: Combine findings into a final authenticity score and recommendation.

Return ONLY valid JSON matching this schema:
{
  "extracted": { "student_name": string|null, "roll_number": string|null, "company_name": string|null, "domain": string|null, "certificate_id": string|null, "issue_date": string|null, "completion_date": string|null, "has_qr": boolean, "has_logo": boolean, "has_signature": boolean },
  "confidence": number (0..1),
  "authenticity": number (0..1),
  "issues": string[],
  "recommendation": "verified" | "needs_review" | "rejected",
  "notes": string
}`;

    const userText = `Verify this certificate against the student record.
Expected student: ${student?.full_name ?? "unknown"} · Roll: ${student?.roll_number ?? "unknown"}
Expected domain: ${domainName ?? "unknown"}
Compare extracted OCR fields against the expected values and flag any mismatch.`;

    const isPdf = cert.file_mime === "application/pdf";
    const res = await fetch(signedUrl);
    const buf = await res.arrayBuffer();
    const b64 = Buffer.from(buf).toString("base64");
    const mimeType = isPdf ? "application/pdf" : (cert.file_mime || "image/jpeg");

    const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          {
            parts: [
              { text: userText },
              { inlineData: { mimeType, data: b64 } }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
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
      const text = aiJson.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
      parsed = JSON.parse(text);
    } catch {
      parsed = { recommendation: "needs_review", issues: ["Could not parse AI response"], confidence: 0.3, authenticity: 0.3 };
    }

    const status = parsed.recommendation === "verified" ? "approved"
      : parsed.recommendation === "rejected" ? "rejected"
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
    
    // Auto-cleanup: If verified (approved), delete the file to save storage space
    if (status === "approved" && cert.file_url) {
      await supabase.storage.from("certificates").remove([cert.file_url]);
    }

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
    // Auto-cleanup: If admin manually approves, delete the file to save storage space
    if (data.decision === "approved" && prev) {
       const { data: certDetails } = await supabase.from("certificates").select("file_url").eq("id", data.certificate_id).single();
       if (certDetails?.file_url) {
         await supabase.storage.from("certificates").remove([certDetails.file_url]);
       }
    }

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