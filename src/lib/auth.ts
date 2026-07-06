import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SessionUser = { id: string; email: string | null } | null;

export function useSession() {
  const [user, setUser] = useState<SessionUser>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session ? { id: data.session.user.id, email: data.session.user.email ?? null } : null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session ? { id: session.user.id, email: session.user.email ?? null } : null);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);
  return { user, loading };
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", auth.user.id).maybeSingle(),
        supabase.from("user_roles").select("role_id, roles(slug, name)").eq("user_id", auth.user.id),
      ]);
      const roleSlugs = (roles ?? []).map((r: any) => r.roles?.slug).filter(Boolean) as string[];
      const isAdmin = roleSlugs.includes("admin");
      const isStudent = roleSlugs.includes("student");
      return {
        user: auth.user,
        profile,
        roles: roleSlugs,
        isAdmin,
        isStudent,
      };
    },
  });
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = "/auth";
}