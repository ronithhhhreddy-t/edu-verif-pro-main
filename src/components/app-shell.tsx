import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard, GraduationCap, Users, Database, FileCheck2, FileText,
  BarChart3, Settings, ShieldCheck, LogOut, Bell, Search, Menu, X, Upload, History, ScrollText,
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

export function AppShell({ children }: { children: React.ReactNode }) {
  const me = useMe();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navGroups = useMemo(() => (me.data?.isAdmin ? ADMIN_NAV : STUDENT_NAV), [me.data?.isAdmin]);
  const initials = (me.data?.profile?.full_name ?? me.data?.user.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <div className="relative min-h-dvh aurora">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")" }} />
      <div className="relative z-10 flex min-h-dvh">
        {/* Sidebar */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 transform p-4 transition-transform lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="glass flex h-full flex-col rounded-3xl p-4">
            <div className="flex items-center justify-between px-2 py-2">
              <Link to="/app" className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-white border border-border/50 overflow-hidden p-1">
                  <img src="/logo.png" alt="EduSkills" className="h-full w-full object-contain" />
                </div>
                <div>
                  <div className="text-sm font-semibold leading-tight">EduSkills</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Verification</div>
                </div>
              </Link>
              <button className="rounded-md p-1.5 lg:hidden" onClick={() => setMobileOpen(false)}><X className="h-4 w-4" /></button>
            </div>

            <nav className="mt-4 flex-1 space-y-4 overflow-y-auto px-1 scrollbar-hide">
              {navGroups.map((group, idx) => (
                <div key={idx}>
                  {group.group && <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{group.group}</div>}
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const active = location.pathname === item.to || (item.to !== "/app" && location.pathname.startsWith(item.to));
                      return (
                        <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)}
                          className={cn(
                            "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                            active ? "text-primary-foreground" : "text-foreground/70 hover:bg-accent/50 hover:text-foreground"
                          )}
                        >
                          {active && (
                            <motion.div layoutId="nav-active" className="absolute inset-0 rounded-xl gradient-primary shadow-[var(--shadow-glass)]" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                          )}
                          <item.icon className={cn("relative h-4 w-4", active ? "text-white" : "")} />
                          <span className={cn("relative", active ? "text-white" : "")}>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="mt-3 rounded-2xl glass-subtle p-3">
              <div className="flex items-center gap-2">
                <Avatar className="h-9 w-9"><AvatarFallback className="gradient-primary text-white text-xs">{initials}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{me.data?.profile?.full_name ?? me.data?.user.email}</div>
                  <div className="truncate text-[11px] text-muted-foreground capitalize">{me.data?.roles.join(" · ") || "member"}</div>
                </div>
                <button onClick={signOut} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" title="Sign out"><LogOut className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 px-4 pt-4 lg:pl-0">
            <div className="glass flex items-center gap-3 rounded-2xl px-3 py-2.5">
              <button className="rounded-md p-1.5 lg:hidden" onClick={() => setMobileOpen(true)}><Menu className="h-4 w-4" /></button>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search students, certificates, domains…" className="h-9 border-transparent bg-transparent pl-9 shadow-none focus-visible:ring-0" />
              </div>
              <Button size="icon" variant="ghost" className="h-9 w-9"><Bell className="h-4 w-4" /></Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full"><Avatar className="h-9 w-9"><AvatarFallback className="gradient-primary text-white text-xs">{initials}</AvatarFallback></Avatar></button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="text-sm">{me.data?.profile?.full_name}</div>
                    <div className="text-xs text-muted-foreground">{me.data?.user.email}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate({ to: "/app/settings" })}>Settings</DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut} className="text-destructive">Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="min-h-0 flex-1 p-4 lg:pl-0">{children}</main>
        </div>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function GlassCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("glass rounded-2xl p-6", className)}>{children}</div>;
}