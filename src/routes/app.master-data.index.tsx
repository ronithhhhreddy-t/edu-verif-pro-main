import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, GlassCard } from "@/components/app-shell";
import { Users, Database, FileText, Settings, ShieldCheck, CheckSquare, UploadCloud, Layers } from "lucide-react";

export const Route = createFileRoute("/app/master-data/")({
  component: MasterDataIndex,
});

const MODULES = [
  { title: "Cohorts", icon: Users, to: "/app/master-data/cohorts", desc: "Manage student cohorts and batches" },
  { title: "Domains", icon: Database, to: "/app/master-data/domains", desc: "Manage domains and courses" },
  { title: "Departments", icon: Layers, to: "/app/master-data/departments", desc: "Manage academic departments" },
  { title: "Class", icon: Database, to: "/app/master-data/programs", desc: "Manage academic programs and classes" },
  { title: "Sections", icon: Users, to: "/app/master-data/sections", desc: "Manage class sections" },
  { title: "Academic Years", icon: Database, to: "/app/master-data/academic-years", desc: "Manage academic years" },
];

function MasterDataIndex() {
  return (
    <div>
      <PageHeader title="Master Data Modules" description="Select a module to manage its data" />
      
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {MODULES.map((mod) => (
          <Link key={mod.title} to={mod.to} className="group">
            <GlassCard className="h-full transition-all hover:bg-white/40 hover:shadow-[var(--shadow-glass)]">
              <div className="flex items-center gap-4">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                  <mod.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{mod.title}</h3>
                  <p className="text-xs text-muted-foreground">{mod.desc}</p>
                </div>
              </div>
            </GlassCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
