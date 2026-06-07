import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, AppRole } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { HardHat, Building2 } from "lucide-react";
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
import { COPYRIGHT } from "@/lib/legal";

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
    utrNumber: "",
    qualifications: [],
    drivingLicence: "",
    agreementsAccepted: false,
    vehiclePolicyAccepted: false,
    drugAlcoholAccepted: false,
    workingTimeOptOut: false,
    clientCode: "",
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

    if (sRole === "worker") {
      if (!/^\d{4}$/.test(worker.clientCode))
        return toast.error("Enter the 4-digit Client ID you were given");
      if (!worker.trade) return toast.error("Please select your trade");
      if (!worker.rightToWork)
        return toast.error("Please confirm your right to work");
      const { isValidUtr } = await import("@/components/auth/WorkerSignupFields");
      if (!isValidUtr(worker.utrNumber))
        return toast.error("Enter a valid UTR (10 digits, optional trailing K)");
      if (
        !worker.agreementsAccepted ||
        !worker.vehiclePolicyAccepted ||
        !worker.drugAlcoholAccepted
      )
        return toast.error(
          "Please accept the Operative Agreement, Vehicle Policy and Drugs & Alcohol Policy"
        );
    } else if (sRole === "client") {
      if (!client.companyName.trim())
        return toast.error("Company name is required");
      if (!client.siteName.trim())
        return toast.error("Please add your first site name");
    }

    setBusy(true);
    const { AGREEMENTS_VERSION } = await import("@/lib/legal");
    const metadata: Record<string, string | boolean | string[]> = {
      full_name: sFullName,
      phone: sPhone,
      role: sRole,
    };
    if (sRole === "worker") {
      metadata.client_code = worker.clientCode;
      metadata.worker_ref = worker.workerRef;
      metadata.trade = worker.trade;
      metadata.right_to_work = worker.rightToWork;
      metadata.utr_number = worker.utrNumber.replace(/\s+/g, "").toUpperCase();
      metadata.qualifications = worker.qualifications;
      metadata.driving_licence = worker.drivingLicence;
      metadata.agreements_version = AGREEMENTS_VERSION;
      metadata.agreements_accepted = worker.agreementsAccepted;
      metadata.vehicle_policy_accepted = worker.vehiclePolicyAccepted;
      metadata.drug_alcohol_policy_accepted = worker.drugAlcoholAccepted;
      metadata.working_time_optout_accepted = worker.workingTimeOptOut;
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
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <Link to="/" className="flex flex-col items-center justify-center mb-8">
            <img
              src={logo}
              alt="Light Work Live"
              className="h-40 sm:h-48 w-auto drop-shadow-lg"
            />
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
                    <Label>I am signing up as</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSRole("worker")}
                        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                          sRole === "worker"
                            ? "border-primary bg-primary/10"
                            : "border-input bg-background hover:border-muted-foreground"
                        }`}
                      >
                        <HardHat className={`w-8 h-8 ${sRole === "worker" ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="font-semibold">Operatives</span>
                        <span className="text-xs text-muted-foreground text-center">Workers on site</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSRole("client")}
                        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                          sRole === "client"
                            ? "border-primary bg-primary/10"
                            : "border-input bg-background hover:border-muted-foreground"
                        }`}
                      >
                        <Building2 className={`w-8 h-8 ${sRole === "client" ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="font-semibold">Clients</span>
                        <span className="text-xs text-muted-foreground text-center">Companies hiring</span>
                      </button>
                    </div>
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
      <footer className="border-t bg-card">
        <div className="max-w-6xl mx-auto px-4 py-4 text-xs text-center text-muted-foreground">
          {COPYRIGHT}
        </div>
      </footer>
      <div className="hi-vis-stripe h-2" />
    </div>
  );
}
