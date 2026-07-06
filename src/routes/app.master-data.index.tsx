import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, GlassCard } from "@/components/app-shell";
import { Users, Database, FileText, Settings, ShieldCheck, CheckSquare, UploadCloud, Layers } from "lucide-react";

export const Route = createFileRoute("/app/master-data/")({
  component: MasterDataIndex,
});

const MODULES = [
  { title: "Departments", icon: Layers, to: "/app/master-data/departments", desc: "Manage academic departments" },
  { title: "Programs / Branches", icon: Database, to: "/app/master-data/programs", desc: "Manage academic programs" },
  { title: "Academic Years", icon: Database, to: "/app/master-data/academic-years", desc: "Manage academic years" },
  { title: "Semesters", icon: Database, to: "/app/master-data/semesters", desc: "Manage semesters" },
  { title: "Cohorts", icon: Users, to: "/app/master-data/cohorts", desc: "Manage student cohorts and batches" },
  { title: "Domains", icon: Database, to: "/app/master-data/domains", desc: "Manage domains and courses" },
  { title: "Companies", icon: Database, to: "/app/master-data/companies", desc: "Manage associated companies" },
  { title: "Certificate Types", icon: FileText, to: "/app/master-data/certificate-types", desc: "Manage certificate formats" },
  { title: "File Types", icon: UploadCloud, to: "/app/master-data/file-types", desc: "Manage allowed file uploads" },
  { title: "Student Status", icon: Users, to: "/app/master-data/student-statuses", desc: "Manage student lifecycle states" },
  { title: "Verification Status", icon: CheckSquare, to: "/app/master-data/verification-statuses", desc: "Manage certificate statuses" },
  { title: "Roles & Permissions", icon: ShieldCheck, to: "/app/roles", desc: "Manage system access" },
  { title: "Form Templates", icon: FileText, to: "/app/forms/builder", desc: "Manage dynamic forms" },
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
