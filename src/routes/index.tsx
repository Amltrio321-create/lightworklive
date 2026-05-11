import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { MapPin, Camera, ShieldCheck } from "lucide-react";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
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
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <img src={logo} alt="Light Work Live" className="h-14 w-auto" />
          <Link to="/login">
            <Button variant="outline" size="sm">Sign in</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-4 py-16 sm:py-24">
          <div className="max-w-2xl">
            <span className="inline-block px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-semibold uppercase tracking-wider">
              Traffic management workforce
            </span>
            <h1 className="mt-6 text-4xl sm:text-6xl font-bold leading-[1.05]">
              Eyes on every site, <span className="text-accent">live</span>.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">
              Workers share their location and hourly photos from site. Clients see
              exactly who's on the ground, where they are, and what they're doing —
              in real time.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login">
                <Button size="lg" className="font-semibold">Get started</Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline">Client sign in</Button>
              </Link>
            </div>
          </div>

          <div className="mt-16 grid gap-4 sm:grid-cols-3">
            {[
              { Icon: MapPin, title: "Live GPS", body: "Continuous location streamed from worker to client while on shift." },
              { Icon: Camera, title: "Hourly photos", body: "Workers post a quick photo every hour to confirm site presence and conditions." },
              { Icon: ShieldCheck, title: "Role-based access", body: "Admins assign workers, clients only see their own sites." },
            ].map(({ Icon, title, body }) => (
              <div key={title} className="p-5 rounded-lg border bg-card">
                <div className="w-10 h-10 rounded-md bg-primary text-primary-foreground inline-flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <div className="hi-vis-stripe h-2" />
    </div>
  );
}
