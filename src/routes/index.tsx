import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { HardHat, Building2, ArrowRight } from "lucide-react";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/")({
  component: Portal,
});

function Portal() {
  const { user, role, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (user && role) {
      nav({
        to: role === "admin" ? "/admin" : role === "client" ? "/client" : "/worker",
        replace: true,
      });
    }
  }, [user, role, loading, nav]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="hi-vis-stripe h-3" />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <Link to="/" className="mb-8">
          <img src={logo} alt="Light Work Live" className="h-20 w-auto" />
        </Link>

        <div className="text-center max-w-xl mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight">
            Welcome — how can we help?
          </h1>
          <p className="mt-3 text-muted-foreground">
            Pick the option that describes you to sign in or create an account.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 w-full max-w-3xl">
          <Link
            to="/login"
            search={{ role: "worker" }}
            className="group relative rounded-2xl border-2 bg-card p-6 sm:p-8 hover:border-primary hover:shadow-lg transition-all"
          >
            <div className="w-14 h-14 rounded-xl bg-primary text-primary-foreground inline-flex items-center justify-center mb-4">
              <HardHat className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold">I'm looking for work</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Operatives — sign in to start your shift, share your location and
              upload site photos.
            </p>
            <span className="mt-4 inline-flex items-center text-sm font-semibold text-primary">
              Continue as worker
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>

          <Link
            to="/login"
            search={{ role: "client" }}
            className="group relative rounded-2xl border-2 bg-card p-6 sm:p-8 hover:border-accent hover:shadow-lg transition-all"
          >
            <div className="w-14 h-14 rounded-xl bg-accent text-accent-foreground inline-flex items-center justify-center mb-4">
              <Building2 className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold">I need labour supply</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Clients — sign in to track operatives on your sites in real time
              and view their hourly photo updates.
            </p>
            <span className="mt-4 inline-flex items-center text-sm font-semibold text-accent-foreground">
              Continue as client
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>
        </div>

        <p className="text-xs text-muted-foreground mt-8">
          Admin?{" "}
          <Link to="/login" className="underline hover:text-foreground">
            Sign in here
          </Link>
          .
        </p>
      </main>
      <div className="hi-vis-stripe h-2" />
    </div>
  );
}
