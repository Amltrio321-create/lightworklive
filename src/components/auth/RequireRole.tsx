import { ReactNode, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth, AppRole } from "@/hooks/use-auth";
import { AppShell } from "@/components/layout/AppShell";

export function RequireRole({
  allow,
  children,
}: {
  allow: AppRole[];
  children: ReactNode;
}) {
  const { user, role, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      nav({ to: "/login", replace: true });
    } else if (role && !allow.includes(role)) {
      nav({
        to: role === "admin" ? "/admin" : role === "client" ? "/client" : "/worker",
        replace: true,
      });
    }
  }, [user, role, loading, allow, nav]);

  if (loading || !user || !role) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!allow.includes(role)) return null;

  return <AppShell>{children}</AppShell>;
}
