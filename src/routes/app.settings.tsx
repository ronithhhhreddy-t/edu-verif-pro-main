import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader, GlassCard } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/app/settings")({ component: SettingsPage });

function SettingsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["settings"], queryFn: async () => (await supabase.from("settings").select("*")).data ?? [] });
  const college = q.data?.find((s: any) => s.key === "college")?.value ?? {};
  const platform = q.data?.find((s: any) => s.key === "platform")?.value ?? {};
  const [c, setC] = useState<any>(college);
  const [p, setP] = useState<any>(platform);
  useEffect(() => { setC(college); setP(platform); }, [q.data]);

  const save = useMutation({
    mutationFn: async () => {
      await supabase.from("settings").upsert([{ key: "college", value: c }, { key: "platform", value: p }]);
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["settings"] }); },
  });

  return (
    <div>
      <PageHeader title="Settings" description="College branding and platform configuration." />
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <h3 className="mb-3 text-lg font-semibold">College</h3>
          <label className="text-xs">Name</label><Input value={c.name ?? ""} onChange={(e) => setC({ ...c, name: e.target.value })} />
          <label className="mt-3 block text-xs">Tagline</label><Input value={c.tagline ?? ""} onChange={(e) => setC({ ...c, tagline: e.target.value })} />
          <label className="mt-3 block text-xs">Primary color (hex)</label><Input value={c.primary_color ?? ""} onChange={(e) => setC({ ...c, primary_color: e.target.value })} />
          <label className="mt-3 block text-xs">Logo URL</label><Input value={c.logo_url ?? ""} onChange={(e) => setC({ ...c, logo_url: e.target.value })} />
        </GlassCard>
        <GlassCard>
          <h3 className="mb-3 text-lg font-semibold">Platform</h3>
          <label className="text-xs">Platform name</label><Input value={p.name ?? ""} onChange={(e) => setP({ ...p, name: e.target.value })} />
          <label className="mt-3 block text-xs">Max upload (MB)</label><Input type="number" value={p.max_upload_mb ?? 15} onChange={(e) => setP({ ...p, max_upload_mb: Number(e.target.value) })} />
          <p className="mt-3 text-xs text-muted-foreground">AI verification uses Lovable AI (Gemini). No key setup required.</p>
        </GlassCard>
      </div>
      <div className="mt-4 flex justify-end">
        <Button className="gradient-primary text-white" onClick={() => save.mutate()} disabled={save.isPending}>Save changes</Button>
      </div>
    </div>
  );
}