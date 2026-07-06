import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, Mail, Lock, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · EduSkills Verification" },
      { name: "description", content: "Sign in to the EduSkills certificate verification platform." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const [role, setRole] = useState("student");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app" });
    });
    
    // Check if an admin exists
    supabase.rpc('has_admin_user').then(({ data, error }) => {
      if (!error && data !== null) {
        setAdminExists(data as boolean);
        if (!data) setRole("admin");
      }
    });
  }, [navigate]);

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
        navigate({ to: "/app" });
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/app`, data: { full_name: fullName, role } },
        });
        if (error) throw error;
        toast.success("Account created — signing you in…");
        navigate({ to: "/app" });
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/app`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err?.message ?? "Google sign-in failed");
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-dvh w-full overflow-hidden aurora">
      {/* animated blobs */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full"
        style={{ background: "radial-gradient(closest-side, oklch(0.75 0.18 250 / 0.55), transparent)" }}
        animate={{ x: [0, 40, -20, 0], y: [0, 20, -10, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 h-[560px] w-[560px] rounded-full"
        style={{ background: "radial-gradient(closest-side, oklch(0.78 0.16 230 / 0.5), transparent)" }}
        animate={{ x: [0, -30, 20, 0], y: [0, -15, 10, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.9'/></svg>\")" }} />

      <div className="relative z-10 mx-auto grid min-h-dvh max-w-7xl grid-cols-1 items-center gap-10 px-6 py-10 lg:grid-cols-2">
        {/* Left: brand */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="hidden lg:flex flex-col justify-center gap-8">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white shadow-[var(--shadow-glass)] border border-border/50 overflow-hidden p-1.5">
              <img src="/logo.png" alt="EduSkills" className="h-full w-full object-contain" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">EduSkills Platform</div>
              <div className="text-lg font-semibold">Certificate Verification</div>
            </div>
          </div>
          <h1 className="text-5xl font-bold leading-[1.05] tracking-tight text-foreground">
            Verify every internship certificate with <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>AI-assisted trust</span>.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            A university-grade ERP for cohorts, domains, and completion certificates. Students upload once. Faculty and admins review with confidence.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 max-w-xl">
            {[
              { icon: ShieldCheck, title: "AI Verification", body: "OCR + template matching flags fakes automatically." },
              { icon: Sparkles, title: "Dynamic Everything", body: "Roles, forms, master data — all admin-managed." },
            ].map((f) => (
              <div key={f.title} className="glass-subtle rounded-2xl p-4">
                <f.icon className="h-5 w-5 text-primary" />
                <div className="mt-2 text-sm font-semibold">{f.title}</div>
                <div className="text-xs text-muted-foreground">{f.body}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right: login card */}
        <motion.div initial={{ opacity: 0, y: 30, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="mx-auto w-full max-w-md">
          <div className="glass rounded-3xl p-8">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white border border-border/50 overflow-hidden p-1">
                <img src="/logo.png" alt="EduSkills" className="h-full w-full object-contain" />
              </div>
              <div>
                <div className="text-sm font-semibold">EduSkills Verification</div>
                <div className="text-xs text-muted-foreground">Certificate management</div>
              </div>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Sign in to your portal</h2>

            <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="mt-6">
              <TabsList className="grid w-full grid-cols-2 rounded-full bg-secondary p-1">
                <TabsTrigger value="signin" className="rounded-full">Sign in</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-full">Create account</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-6">
                <form onSubmit={handleEmailAuth} className="space-y-4">
                  <div>
                    <Label htmlFor="e1">Email</Label>
                    <div className="relative mt-1.5">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="e1" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" placeholder="you@college.edu" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="p1">Password</Label>
                    <div className="relative mt-1.5">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="p1" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" placeholder="••••••••" />
                    </div>
                  </div>
                  <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl gradient-primary text-white shadow-[var(--shadow-glass)] hover:opacity-95">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <form onSubmit={handleEmailAuth} className="space-y-4">
                  {adminExists !== false && (
                    <div>
                      <Label>I am a...</Label>
                      <Select value={role} onValueChange={setRole}>
                        <SelectTrigger className="mt-1.5 h-11 bg-background/50">
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="faculty">Faculty</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {adminExists === false && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary">
                      You are creating the first account. You will automatically be granted <strong>Admin</strong> privileges.
                    </div>
                  )}
                  <div>
                    <Label htmlFor="n1">Full name</Label>
                    <Input id="n1" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5" placeholder="Your name" />
                  </div>
                  <div>
                    <Label htmlFor="e2">Email</Label>
                    <Input id="e2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" placeholder="you@college.edu" />
                  </div>
                  <div>
                    <Label htmlFor="p2">Password</Label>
                    <Input id="p2" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5" placeholder="At least 8 characters" />
                  </div>
                  <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl gradient-primary text-white shadow-[var(--shadow-glass)] hover:opacity-95">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> or continue with <div className="h-px flex-1 bg-border" />
            </div>

            <Button variant="outline" className="h-11 w-full rounded-xl border-border bg-card/60 backdrop-blur" onClick={handleGoogle} disabled={loading}>
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.12A6.98 6.98 0 0 1 5.5 12c0-.74.13-1.45.34-2.12V7.04H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.96l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
              Continue with Google
            </Button>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              By continuing you agree to the platform's acceptable-use policy.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}