import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, GraduationCap, Users, Database, FileCheck2, FileText,
  BarChart3, Settings, ShieldCheck, LogOut, Bell, Search, Menu, X, Upload, History, ScrollText,
  Plus, X as XIcon, PenTool, UserPlus, ListPlus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMe, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItem = { to: string; label: string; icon: any };
type NavGroup = { group?: string; items: NavItem[] };

const ADMIN_NAV: NavGroup[] = [
  { items: [{ to: "/app", label: "Dashboard", icon: LayoutDashboard }] },
  {
    group: "Verification",
    items: [
      { to: "/app/certificates", label: "Certificates", icon: FileCheck2 },
      { to: "/app/students", label: "Students", icon: Users },
      { to: "/app/forms", label: "Form Builder", icon: FileText },
    ]
  },
  {
    group: "System Setup",
    items: [
      { to: "/app/master-data", label: "Master Data", icon: Database },
      { to: "/app/roles", label: "Roles & Users", icon: ShieldCheck },
    ]
  },
  {
    items: [
      { to: "/app/audit", label: "Audit Logs", icon: ScrollText },
      { to: "/app/settings", label: "Settings", icon: Settings },
    ]
  }
];

const STUDENT_NAV: NavGroup[] = [
  { items: [
    { to: "/app", label: "Dashboard", icon: LayoutDashboard },
    { to: "/app/upload", label: "Upload Certificate", icon: Upload },
    { to: "/app/my-certificates", label: "My Certificates", icon: History },
  ]}
];

// Bottom Nav Items
const ADMIN_BOTTOM = [
  { to: "/app", label: "Home", icon: LayoutDashboard },
  { to: "/app/students", label: "Students", icon: Users },
  { to: "/app/forms", label: "Forms", icon: FileText },
  { to: "/app/settings", label: "Profile", icon: Settings },
];

const STUDENT_BOTTOM = [
  { to: "/app", label: "Home", icon: LayoutDashboard },
  { to: "/app/upload", label: "Upload", icon: Upload },
  { to: "/app/my-certificates", label: "History", icon: History },
  { to: "/app/settings", label: "Profile", icon: Settings },
];

function FAB({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const actions = isAdmin ? [
    { to: "/app/forms", label: "Create Form", icon: FileText },
    { to: "/app/students", label: "Add Student", icon: UserPlus },
    { to: "/app/master-data", label: "Master Data", icon: Database },
  ] : [
    { to: "/app/upload", label: "Upload", icon: Upload },
    { to: "/app", label: "Fill Form", icon: PenTool },
  ];

  return (
    <div className="fixed bottom-20 right-4 z-40 sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            className="absolute bottom-16 right-0 flex flex-col items-end gap-3"
          >
            {actions.map((act, i) => (
              <Link key={i} to={act.to} onClick={() => setOpen(false)} className="flex items-center gap-3">
                <span className="glass-subtle rounded-lg px-2.5 py-1 text-sm font-medium shadow-sm">{act.label}</span>
                <button className="grid h-12 w-12 place-items-center rounded-full bg-white text-primary shadow-lg ring-1 ring-border">
                  <act.icon className="h-5 w-5" />
                </button>
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen(!open)}
        className="gradient-primary grid h-14 w-14 place-items-center rounded-full text-white shadow-xl shadow-primary/20 transition-transform hover:scale-105 active:scale-95"
      >
        <motion.div animate={{ rotate: open ? 45 : 0 }}><Plus className="h-6 w-6" /></motion.div>
      </button>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const me = useMe();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isAdmin = me.data?.isAdmin ?? false;
  const navGroups = useMemo(() => (isAdmin ? ADMIN_NAV : STUDENT_NAV), [isAdmin]);
  const bottomNav = useMemo(() => (isAdmin ? ADMIN_BOTTOM : STUDENT_BOTTOM), [isAdmin]);
  const initials = (me.data?.profile?.full_name ?? me.data?.user.email ?? "?").slice(0, 2).toUpperCase();

  // Handle ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawerOpen(false); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  return (
    <div className="relative min-h-dvh aurora flex flex-col bg-background selection:bg-primary/20">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.02]" style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")" }} />
      
      {/* Header */}
      <header className="sticky top-0 z-30 w-full border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="flex h-16 items-center px-4 sm:px-6">
          <button className="mr-4 rounded-md p-2 -ml-2 text-foreground/80 hover:bg-accent hover:text-foreground" onClick={() => setDrawerOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          
          <Link to="/app" className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-white shadow-sm overflow-hidden">
              <img src="/logo.png" alt="EduSkills" className="h-full w-full object-cover invert opacity-90 mix-blend-screen" />
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-bold leading-tight">EduSkills</div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full"><Search className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full"><Bell className="h-4 w-4" /></Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-1 rounded-full"><Avatar className="h-9 w-9 border border-border/50"><AvatarFallback className="gradient-primary text-white text-xs">{initials}</AvatarFallback></Avatar></button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuLabel>
                  <div className="text-sm font-medium">{me.data?.profile?.full_name}</div>
                  <div className="text-xs font-normal text-muted-foreground">{me.data?.user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/app/settings" })} className="rounded-lg">Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={signOut} className="text-destructive rounded-lg">Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-background/80 backdrop-blur-2xl shadow-2xl border-r border-border/50 flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-border/40">
                <Link to="/app" className="flex items-center gap-3 px-2" onClick={() => setDrawerOpen(false)}>
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-white shadow-sm overflow-hidden">
                    <img src="/logo.png" alt="EduSkills" className="h-full w-full object-cover invert opacity-90 mix-blend-screen" />
                  </div>
                  <div>
                    <div className="text-base font-bold leading-tight">EduSkills</div>
                  </div>
                </Link>
                <button className="rounded-full p-2 hover:bg-accent" onClick={() => setDrawerOpen(false)}><XIcon className="h-5 w-5" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {navGroups.map((group, idx) => (
                  <div key={idx}>
                    {group.group && <div className="mb-2 px-3 pt-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">{group.group}</div>}
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const active = location.pathname === item.to || (item.to !== "/app" && location.pathname.startsWith(item.to));
                        return (
                          <Link key={item.to} to={item.to} onClick={() => setDrawerOpen(false)}
                            className={cn(
                              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                              active ? "text-primary bg-primary/10" : "text-foreground/80 hover:bg-accent hover:text-foreground"
                            )}
                          >
                            <item.icon className={cn("h-4 w-4", active ? "text-primary" : "")} />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-border/40 bg-accent/20">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-border/50 shadow-sm"><AvatarFallback className="gradient-primary text-white text-sm">{initials}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{me.data?.profile?.full_name ?? me.data?.user.email}</div>
                    <div className="truncate text-[11px] font-medium text-muted-foreground capitalize">{me.data?.roles.join(" • ") || "member"}</div>
                  </div>
                  <button onClick={signOut} className="rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"><LogOut className="h-4 w-4" /></button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 relative z-10 w-full mx-auto p-4 sm:p-6 pb-24 sm:pb-6">
        {children}
      </main>

      <FAB isAdmin={isAdmin} />

      {/* Mobile Bottom Navigation */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-t border-border/50 pb-safe">
        <div className="flex h-16 items-center justify-around px-2">
          {bottomNav.map((item) => {
            const active = location.pathname === item.to || (item.to !== "/app" && location.pathname.startsWith(item.to));
            return (
              <Link key={item.to} to={item.to} className={cn("flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors", active ? "text-primary" : "text-muted-foreground")}>
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:mt-0">{actions}</div>}
    </div>
  );
}

export function GlassCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("bg-card/60 backdrop-blur-2xl border border-border/50 rounded-2xl shadow-sm p-4 sm:p-6", className)}>{children}</div>;
}
