import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, AppRole } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import {
  WorkerSignupFields,
  WorkerFieldsValue,
} from "@/components/auth/WorkerSignupFields";
import {
  ClientSignupFields,
  ClientFieldsValue,
} from "@/components/auth/ClientSignupFields";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    role: (search.role === "worker" || search.role === "client"
      ? (search.role as AppRole)
      : undefined) as AppRole | undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, role, loading } = useAuth();
  const nav = useNavigate();
  const { role: presetRole } = Route.useSearch();
  const [busy, setBusy] = useState(false);

  // Login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Signup fields
  const [sEmail, setSEmail] = useState("");
  const [sPassword, setSPassword] = useState("");
  const [sFullName, setSFullName] = useState("");
  const [sPhone, setSPhone] = useState("");
  const [sRole, setSRole] = useState<AppRole>(presetRole ?? "worker");
  const [worker, setWorker] = useState<WorkerFieldsValue>({
    workerRef: "",
    trade: "",
    rightToWork: false,
  });
  const [client, setClient] = useState<ClientFieldsValue>({
    companyName: "",
    companyAddress: "",
    siteName: "",
    siteAddress: "",
  });

  useEffect(() => {
    if (loading) return;
    if (user && role) {
      nav({
        to: role === "admin" ? "/admin" : role === "client" ? "/client" : "/worker",
        replace: true,
      });
    }
  }, [user, role, loading, nav]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Welcome back");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Role-specific validation
    if (sRole === "worker") {
      if (!worker.trade) return toast.error("Please select your trade");
      if (!worker.rightToWork)
        return toast.error("Please confirm your right to work");
    } else if (sRole === "client") {
      if (!client.companyName.trim())
        return toast.error("Company name is required");
      if (!client.siteName.trim())
        return toast.error("Please add your first site name");
    }

    setBusy(true);
    const metadata: Record<string, string | boolean> = {
      full_name: sFullName,
      phone: sPhone,
      role: sRole,
    };
    if (sRole === "worker") {
      metadata.worker_ref = worker.workerRef;
      metadata.trade = worker.trade;
      metadata.right_to_work = worker.rightToWork;
    } else if (sRole === "client") {
      metadata.company_name = client.companyName;
      metadata.company_address = client.companyAddress;
    }

    const { data, error } = await supabase.auth.signUp({
      email: sEmail,
      password: sPassword,
      options: {
        emailRedirectTo: window.location.origin,
        data: metadata,
      },
    });

    if (error) {
      setBusy(false);
      return toast.error(error.message);
    }

    // For client signup, create the first site if we have a session
    if (sRole === "client" && data.session && client.siteName.trim()) {
      const { error: siteErr } = await supabase.from("sites").insert({
        client_id: data.session.user.id,
        name: client.siteName.trim(),
        address: client.siteAddress.trim() || null,
      });
      if (siteErr) {
        toast.error(`Account created, but site failed: ${siteErr.message}`);
      }
    }

    setBusy(false);
    toast.success("Account created — you can sign in now");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="hi-vis-stripe h-2" />
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center justify-center mb-6">
            <img src={logo} alt="Light Work Live" className="h-20 w-auto" />
          </Link>
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <Tabs defaultValue={presetRole ? "signup" : "login"}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="login">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <Button type="submit" disabled={busy} className="w-full font-semibold">
                    {busy ? "Signing in…" : "Sign in"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label>I am a…</Label>
                    <RadioGroup value={sRole} onValueChange={(v) => setSRole(v as AppRole)} className="grid grid-cols-2 gap-2">
                      <label className="flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary">
                        <RadioGroupItem value="worker" /> Worker
                      </label>
                      <label className="flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary">
                        <RadioGroupItem value="client" /> Client
                      </label>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sFullName">Full name</Label>
                    <Input id="sFullName" required value={sFullName} onChange={(e) => setSFullName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sPhone">Phone</Label>
                    <Input id="sPhone" type="tel" required value={sPhone} onChange={(e) => setSPhone(e.target.value)} />
                  </div>

                  {sRole === "worker" && (
                    <WorkerSignupFields value={worker} onChange={setWorker} />
                  )}
                  {sRole === "client" && (
                    <ClientSignupFields value={client} onChange={setClient} />
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="sEmail">Email</Label>
                    <Input id="sEmail" type="email" required value={sEmail} onChange={(e) => setSEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sPassword">Password</Label>
                    <Input id="sPassword" type="password" required minLength={6} value={sPassword} onChange={(e) => setSPassword(e.target.value)} />
                  </div>
                  <Button type="submit" disabled={busy} className="w-full font-semibold">
                    {busy ? "Creating…" : "Create account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
          <p className="text-xs text-center text-muted-foreground mt-4">
            Admin accounts are assigned by your organisation.
          </p>
        </div>
      </div>
      <div className="hi-vis-stripe h-2" />
    </div>
  );
}
