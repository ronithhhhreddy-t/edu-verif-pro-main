import { createFileRoute } from "@tanstack/react-router";
import { useMe } from "@/lib/auth";
import { AdminDashboard } from "@/features/dashboards/admin-dashboard";
import { StudentDashboard } from "@/features/dashboards/student-dashboard";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/")({
  component: Home,
});

function Home() {
  const me = useMe();
  if (me.isLoading) return <div className="grid h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  return me.data?.isAdmin ? <AdminDashboard /> : <StudentDashboard />;
}