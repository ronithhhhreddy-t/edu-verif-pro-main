import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useSession } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/app")({
  ssr: false,
  component: Protected,
});

function Protected() {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [loading, user, navigate]);
  if (loading || !user) {
    return (
      <div className="grid min-h-dvh place-items-center aurora">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  return <AppShell><Outlet /></AppShell>;
}