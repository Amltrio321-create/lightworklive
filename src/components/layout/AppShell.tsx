import { Link, useNavigate } from "@tanstack/react-router";
import { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import defaultLogo from "@/assets/logo.png";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, role, signOut } = useAuth();
  const { tenant, logoSrc } = useTenant();
  const nav = useNavigate();

  const home = role === "admin" ? "/admin" : role === "client" ? "/client" : "/worker";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="hi-vis-stripe h-2" />
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <Link to={home} className="flex items-center gap-2 font-bold">
            <img src={logo} alt="Light Work Live" className="h-12 w-auto" />
            {role && (
              <span className="ml-2 text-xs uppercase tracking-wider px-2 py-0.5 rounded bg-accent text-accent-foreground">
                {role}
              </span>
            )}
          </Link>
          {user && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:block">
                {user.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await signOut();
                  nav({ to: "/login" });
                }}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
