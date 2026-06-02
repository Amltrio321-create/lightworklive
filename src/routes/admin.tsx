import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { RequireRole } from "@/components/auth/RequireRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Square, Radar, Users, Building2, HardHat, Activity, Receipt, PlayCircle, Send, ShieldCheck, Check, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { sendInvoiceEmail } from "@/lib/invoices.functions";
import { Checkbox } from "@/components/ui/checkbox";
import { QUALIFICATIONS } from "@/components/auth/WorkerSignupFields";
import type { AppRole } from "@/hooks/use-auth";

export const Route = createFileRoute("/admin")({
  component: () => (
    <RequireRole allow={["admin"]}>
      <AdminPage />
    </RequireRole>
  ),
});

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  company_name: string | null;
  company_address: string | null;
  worker_ref: string | null;
  trade: string | null;
  right_to_work: boolean | null;
  utr_number: string | null;
  roles: AppRole[];
};

type Site = {
  id: string;
  name: string;
  address: string | null;
  client_id: string;
};

type ShiftRow = {
  id: string;
  worker_id: string;
  site_id: string;
  status: "scheduled" | "active" | "ended";
  scheduled_start: string;
  started_at: string | null;
  ended_at: string | null;
  hourly_rate: number | null;
  required_qualifications?: string[] | null;
  sites?: { name: string } | null;
  worker_name?: string | null;
};

function AdminPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold">Admin console</h1>
      <p className="text-sm text-muted-foreground">
        Full visibility — manage users, sites and shift assignments.
      </p>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview"><Activity className="w-4 h-4 mr-1" />Overview</TabsTrigger>
          <TabsTrigger value="users"><Users className="w-4 h-4 mr-1" />Users</TabsTrigger>
          <TabsTrigger value="quals"><ShieldCheck className="w-4 h-4 mr-1" />Qualifications</TabsTrigger>
          <TabsTrigger value="sites"><Building2 className="w-4 h-4 mr-1" />Sites</TabsTrigger>
          <TabsTrigger value="shifts"><HardHat className="w-4 h-4 mr-1" />Shifts</TabsTrigger>
          <TabsTrigger value="invoices"><Receipt className="w-4 h-4 mr-1" />Invoices</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4"><OverviewTab /></TabsContent>
        <TabsContent value="users" className="mt-4"><UsersTab /></TabsContent>
        <TabsContent value="quals" className="mt-4"><QualificationsTab /></TabsContent>
        <TabsContent value="sites" className="mt-4"><SitesTab /></TabsContent>
        <TabsContent value="shifts" className="mt-4"><ShiftsTab /></TabsContent>
        <TabsContent value="invoices" className="mt-4"><InvoicesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- Overview ---------------- */

function OverviewTab() {
  const [stats, setStats] = useState({
    workers: 0,
    clients: 0,
    sites: 0,
    activeShifts: 0,
    scheduledShifts: 0,
    pingsLastHour: 0,
    photosToday: 0,
  });
  const [active, setActive] = useState<ShiftRow[]>([]);

  const load = useCallback(async () => {
    const [
      { count: workers },
      { count: clients },
      { count: sites },
      { count: activeShifts },
      { count: scheduledShifts },
      { count: pingsLastHour },
      { count: photosToday },
    ] = await Promise.all([
      supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "worker"),
      supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "client"),
      supabase.from("sites").select("*", { count: "exact", head: true }),
      supabase.from("shifts").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("shifts").select("*", { count: "exact", head: true }).eq("status", "scheduled"),
      supabase
        .from("location_pings")
        .select("*", { count: "exact", head: true })
        .gte("recorded_at", new Date(Date.now() - 60 * 60 * 1000).toISOString()),
      supabase
        .from("photo_updates")
        .select("*", { count: "exact", head: true })
        .gte("taken_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    ]);
    setStats({
      workers: workers ?? 0,
      clients: clients ?? 0,
      sites: sites ?? 0,
      activeShifts: activeShifts ?? 0,
      scheduledShifts: scheduledShifts ?? 0,
      pingsLastHour: pingsLastHour ?? 0,
      photosToday: photosToday ?? 0,
    });

    const { data: shiftsData } = await supabase
      .from("shifts")
      .select("*, sites(name)")
      .eq("status", "active")
      .order("started_at", { ascending: false });
    const ids = Array.from(new Set((shiftsData ?? []).map((s) => s.worker_id)));
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const byId = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
    setActive(
      (shiftsData ?? []).map((s) => ({ ...(s as ShiftRow), worker_name: byId.get(s.worker_id) ?? null })),
    );
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  const cards = [
    { label: "Workers", value: stats.workers, icon: HardHat },
    { label: "Clients", value: stats.clients, icon: Building2 },
    { label: "Sites", value: stats.sites, icon: Building2 },
    { label: "On shift now", value: stats.activeShifts, icon: Activity },
    { label: "Scheduled", value: stats.scheduledShifts, icon: Activity },
    { label: "Pings (1h)", value: stats.pingsLastHour, icon: Radar },
    { label: "Photos today", value: stats.photosToday, icon: Activity },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
              {c.label}
              <c.icon className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold mt-1">{c.value}</div>
          </div>
        ))}
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            On shift right now
          </h2>
          <Link to="/client/live" className="text-sm text-primary hover:underline">
            Open live map →
          </Link>
        </div>
        {active.length === 0 ? (
          <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground text-sm">
            Nobody on site right now.
          </div>
        ) : (
          <ul className="rounded-lg border bg-card divide-y">
            {active.map((s) => (
              <li key={s.id} className="p-3 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{s.worker_name ?? "Worker"}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.sites?.name} · started{" "}
                    {s.started_at ? new Date(s.started_at).toLocaleTimeString() : "—"}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-bold uppercase text-success">
                  <span className="w-2 h-2 rounded-full bg-success live-pulse" />
                  Live
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ---------------- Users ---------------- */

function UsersTab() {
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [filter, setFilter] = useState<"all" | AppRole>("all");

  const load = useCallback(async () => {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, phone, company_name, company_address, worker_ref, trade, right_to_work, utr_number")
      .order("full_name");
    const ids = (profs ?? []).map((p) => p.id);
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const rolesByUser = new Map<string, AppRole[]>();
    (roles ?? []).forEach((r) => {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role as AppRole);
      rolesByUser.set(r.user_id, arr);
    });
    setUsers(
      (profs ?? []).map((p) => ({
        ...p,
        roles: rolesByUser.get(p.id) ?? [],
      })),
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setRole = async (userId: string, newRole: AppRole) => {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: newRole });
    if (error) return toast.error(error.message);
    toast.success("Role updated");
    load();
  };

  const visible = users.filter((u) =>
    filter === "all" ? true : u.roles.includes(filter),
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {(["all", "worker", "client", "admin"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-muted text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Contact</th>
              <th className="text-left p-3">Details</th>
              <th className="text-left p-3">Role</th>
              <th className="text-left p-3 w-44">Change role</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((u) => {
              const isWorker = u.roles.includes("worker");
              const isClient = u.roles.includes("client");
              return (
                <tr key={u.id} className="border-t align-top">
                  <td className="p-3 font-medium">
                    {u.full_name ?? <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {u.phone ?? "—"}
                  </td>
                  <td className="p-3 text-xs space-y-0.5">
                    {isWorker && (
                      <>
                        {u.trade && <div><span className="text-muted-foreground">Trade:</span> {u.trade}</div>}
                        {u.worker_ref && <div><span className="text-muted-foreground">Ref:</span> {u.worker_ref}</div>}
                        <UtrEditor profileId={u.id} initial={u.utr_number} onSaved={load} />
                        <div className={u.right_to_work ? "text-success" : "text-destructive"}>
                          {u.right_to_work ? "✓ Right to work" : "⚠ No right-to-work confirmation"}
                        </div>
                      </>
                    )}
                    {isClient && (
                      <>
                        {u.company_name && <div className="font-medium">{u.company_name}</div>}
                        {u.company_address && <div className="text-muted-foreground">{u.company_address}</div>}
                      </>
                    )}
                  </td>
                  <td className="p-3">
                    {u.roles.map((r) => (
                      <span
                        key={r}
                        className="inline-block mr-1 px-2 py-0.5 rounded bg-accent text-accent-foreground text-xs uppercase"
                      >
                        {r}
                      </span>
                    ))}
                  </td>
                  <td className="p-3">
                    <Select onValueChange={(v) => setRole(u.id, v as AppRole)}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Set role…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="worker">Worker</SelectItem>
                        <SelectItem value="client">Client</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  No users.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UtrEditor({ profileId, initial, onSaved }: { profileId: string; initial: string | null; onSaved: () => void }) {
  const [val, setVal] = useState(initial ?? "");
  const [saving, setSaving] = useState(false);
  const clean = val.replace(/\s+/g, "").toUpperCase();
  const ok = /^\d{10}K?$/.test(clean);
  const dirty = clean !== (initial ?? "");
  const save = async () => {
    if (!ok) return toast.error("UTR must be 10 digits, optional trailing K");
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ utr_number: clean }).eq("id", profileId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("UTR saved");
    onSaved();
  };
  return (
    <div className="flex items-center gap-1 mt-1">
      <span className="text-muted-foreground">UTR:</span>
      <Input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className={`h-6 w-32 text-xs ${val && !ok ? "border-destructive" : ""}`}
        placeholder="10 digits"
      />
      {dirty && (
        <Button size="sm" variant="outline" className="h-6 px-2 text-xs" disabled={!ok || saving} onClick={save}>
          {saving ? "…" : "Save"}
        </Button>
      )}
    </div>
  );
}

/* ---------------- Sites ---------------- */

function SitesTab() {
  const [sites, setSites] = useState<(Site & { client_name: string | null })[]>([]);
  const [clients, setClients] = useState<{ id: string; full_name: string | null; company_name: string | null }[]>([]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [clientId, setClientId] = useState("");

  const load = useCallback(async () => {
    const { data: sitesData } = await supabase.from("sites").select("*").order("name");
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "client");
    const clientIds = (roles ?? []).map((r) => r.user_id);
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, company_name")
      .in("id", clientIds.length ? clientIds : ["00000000-0000-0000-0000-000000000000"]);
    setClients(profs ?? []);
    const byId = new Map((profs ?? []).map((p) => [p.id, p]));
    setSites(
      (sitesData ?? []).map((s) => ({
        ...s,
        client_name:
          byId.get(s.client_id)?.company_name ??
          byId.get(s.client_id)?.full_name ??
          null,
      })),
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return toast.error("Pick a client");
    const { error } = await supabase
      .from("sites")
      .insert({ client_id: clientId, name, address: address || null });
    if (error) return toast.error(error.message);
    toast.success("Site created");
    setName("");
    setAddress("");
    setClientId("");
    load();
  };

  const removeSite = async (id: string) => {
    if (!confirm("Delete this site? Existing shifts will be detached.")) return;
    const { error } = await supabase.from("sites").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Site deleted");
    load();
  };

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left p-3">Site</th>
              <th className="text-left p-3">Client</th>
              <th className="text-left p-3">Address</th>
              <th className="p-3 w-12" />
            </tr>
          </thead>
          <tbody>
            {sites.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-3 font-medium">{s.name}</td>
                <td className="p-3">{s.client_name ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{s.address ?? "—"}</td>
                <td className="p-3">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeSite(s.id)}
                    aria-label="Delete site"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
            {sites.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted-foreground">
                  No sites yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <form onSubmit={create} className="rounded-lg border bg-card p-4 space-y-3 h-fit">
        <h3 className="font-semibold">New site</h3>
        <div className="space-y-1">
          <Label>Client</Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger>
              <SelectValue placeholder="Select client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.company_name ?? c.full_name ?? c.id.slice(0, 8)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Name</Label>
          <Input required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Address</Label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <Button type="submit" className="w-full">Create site</Button>
      </form>
    </div>
  );
}

/* ---------------- Shifts ---------------- */

function ShiftsTab() {
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [workers, setWorkers] = useState<{ id: string; full_name: string | null }[]>([]);
  const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
  const [workerId, setWorkerId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [rate, setRate] = useState("");
  const [requiredQuals, setRequiredQuals] = useState<string[]>([]);
  const [start, setStart] = useState(() =>
    new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
  );

  const load = useCallback(async () => {
    const { data: shiftsData } = await supabase
      .from("shifts")
      .select("*, sites(name)")
      .order("scheduled_start", { ascending: false })
      .limit(100);
    const ids = Array.from(new Set((shiftsData ?? []).map((s) => s.worker_id)));
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const byId = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
    setShifts(
      (shiftsData ?? []).map((s) => ({
        ...(s as ShiftRow),
        worker_name: byId.get(s.worker_id) ?? null,
      })),
    );

    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "worker");
    const workerIds = (roles ?? []).map((r) => r.user_id);
    const { data: workerProfs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", workerIds.length ? workerIds : ["00000000-0000-0000-0000-000000000000"]);
    setWorkers(workerProfs ?? []);

    const { data: sitesData } = await supabase
      .from("sites")
      .select("id, name")
      .order("name");
    setSites(sitesData ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerId || !siteId) return toast.error("Pick worker and site");
    const rateNum = rate ? Number(rate) : null;
    if (rate && (!Number.isFinite(rateNum!) || rateNum! <= 0))
      return toast.error("Hourly rate must be a positive number");
    const { error } = await supabase.from("shifts").insert({
      worker_id: workerId,
      site_id: siteId,
      scheduled_start: new Date(start).toISOString(),
      hourly_rate: rateNum,
      required_qualifications: requiredQuals,
    });
    if (error) return toast.error(error.message);
    toast.success("Shift assigned");
    setWorkerId("");
    setSiteId("");
    setRate("");
    setRequiredQuals([]);
    load();
  };

  const endShift = async (id: string) => {
    const { error } = await supabase
      .from("shifts")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Shift ended");
    load();
  };

  const deleteShift = async (id: string) => {
    if (!confirm("Delete this shift?")) return;
    const { error } = await supabase.from("shifts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Shift deleted");
    load();
  };

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-muted text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left p-3">When</th>
              <th className="text-left p-3">Worker</th>
              <th className="text-left p-3">Site</th>
              <th className="text-left p-3">Required quals</th>
              <th className="text-left p-3">Rate</th>
              <th className="text-left p-3">Status</th>
              <th className="p-3 w-24" />
            </tr>
          </thead>
          <tbody>
            {shifts.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-3">{new Date(s.scheduled_start).toLocaleString()}</td>
                <td className="p-3">{s.worker_name ?? "—"}</td>
                <td className="p-3">{s.sites?.name}</td>
                <td className="p-3">
                  {s.required_qualifications && s.required_qualifications.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {s.required_qualifications.map((q) => (
                        <span
                          key={q}
                          className="inline-block px-1.5 py-0.5 rounded bg-muted text-xs"
                        >
                          {QUALIFICATIONS.find((x) => x.value === q)?.label ?? q}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Any</span>
                  )}
                </td>
                <td className="p-3">{s.hourly_rate != null ? `£${Number(s.hourly_rate).toFixed(2)}/hr` : "—"}</td>
                <td className="p-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs uppercase ${
                      s.status === "active"
                        ? "bg-success text-success-foreground"
                        : s.status === "ended"
                          ? "bg-muted text-muted-foreground"
                          : "bg-warning text-warning-foreground"
                    }`}
                  >
                    {s.status}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex gap-1 justify-end">
                    {s.status === "active" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => endShift(s.id)}
                        aria-label="End shift"
                      >
                        <Square className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                    {s.status !== "active" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteShift(s.id)}
                        aria-label="Delete shift"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {shifts.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  No shifts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <form onSubmit={create} className="rounded-lg border bg-card p-4 space-y-3 h-fit">
        <h3 className="font-semibold">Assign shift</h3>
        <div className="space-y-1">
          <Label>Worker</Label>
          <Select value={workerId} onValueChange={setWorkerId}>
            <SelectTrigger>
              <SelectValue placeholder="Select worker" />
            </SelectTrigger>
            <SelectContent>
              {workers.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.full_name ?? w.id.slice(0, 8)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Site</Label>
          <Select value={siteId} onValueChange={setSiteId}>
            <SelectTrigger>
              <SelectValue placeholder="Select site" />
            </SelectTrigger>
            <SelectContent>
              {sites.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Scheduled start</Label>
          <Input
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Hourly rate (£)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g. 18.50"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Used for weekly CIS invoice generation.</p>
        </div>
        <Button type="submit" className="w-full">Assign</Button>
      </form>
    </div>
  );
}

/* ---------------- Invoices ---------------- */

type InvoiceRow = {
  id: string;
  invoice_number: string;
  worker_id: string;
  period_start: string;
  period_end: string;
  total_hours: number;
  gross_amount: number;
  cis_rate: number;
  cis_deduction: number;
  net_amount: number;
  status: string;
  created_at: string;
  worker_name?: string | null;
};

function InvoicesTab() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [utrByWorker, setUtrByWorker] = useState<Record<string, string | null>>({});
  const sendFn = useServerFn(sendInvoiceEmail);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    const ids = Array.from(new Set((data ?? []).map((i) => i.worker_id)));
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, utr_number")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const byId = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
    const utrMap: Record<string, string | null> = {};
    (profs ?? []).forEach((p) => { utrMap[p.id] = p.utr_number ?? null; });
    setUtrByWorker(utrMap);
    setInvoices(
      (data ?? []).map((i) => ({
        ...(i as InvoiceRow),
        worker_name: byId.get(i.worker_id) ?? null,
      })),
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const generateNow = async () => {
    setBusy(true);
    // Previous Mon–Sun
    const today = new Date();
    const day = today.getDay() || 7; // 1..7 (Mon=1)
    const lastSun = new Date(today);
    lastSun.setDate(today.getDate() - day);
    const lastMon = new Date(lastSun);
    lastMon.setDate(lastSun.getDate() - 6);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const { data, error } = await supabase.rpc("generate_weekly_invoices", {
      _period_start: fmt(lastMon),
      _period_end: fmt(lastSun),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Generated ${data ?? 0} invoice(s) for ${fmt(lastMon)} → ${fmt(lastSun)}`);
    load();
  };

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("invoices").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this invoice? Its line items will be removed.")) return;
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Invoice deleted");
    load();
  };

  const sendOne = async (id: string) => {
    setSendingId(id);
    try {
      const res = await sendFn({ data: { invoiceId: id } });
      if (res.emailDelivered) {
        toast.success(`Emailed ${res.invoiceNumber} to ${res.recipient}`);
      } else {
        toast.warning(
          `Marked ${res.invoiceNumber} as sent. Email not delivered: ${res.deliveryNote}`,
          { duration: 8000 },
        );
      }
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSendingId(null);
    }
  };

  const sendAllDrafts = async () => {
    const drafts = invoices.filter((i) => i.status === "draft");
    if (drafts.length === 0) return toast.info("No draft invoices to send");
    if (!confirm(`Send ${drafts.length} draft invoice(s) to workers?`)) return;
    setBusy(true);
    let ok = 0, fail = 0;
    for (const inv of drafts) {
      try { await sendFn({ data: { invoiceId: inv.id } }); ok++; }
      catch { fail++; }
    }
    setBusy(false);
    toast.success(`Sent ${ok} · failed ${fail}`);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="font-semibold">CIS invoices</h3>
          <p className="text-xs text-muted-foreground">
            Auto-generated every Monday for the previous week's ended shifts. CIS deducted at each worker's rate.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={sendAllDrafts} disabled={busy}>
            <Send className="w-4 h-4 mr-1" />Send all drafts
          </Button>
          <Button onClick={generateNow} disabled={busy}>
            <PlayCircle className="w-4 h-4 mr-1" />
            {busy ? "Working…" : "Generate last week now"}
          </Button>
        </div>
      </div>
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead className="bg-muted text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left p-3">Invoice #</th>
              <th className="text-left p-3">Worker</th>
              <th className="text-left p-3">Period</th>
              <th className="text-right p-3">Hours</th>
              <th className="text-right p-3">Gross</th>
              <th className="text-right p-3">CIS</th>
              <th className="text-right p-3">Net</th>
              <th className="text-left p-3">Status</th>
              <th className="p-3 w-44" />
            </tr>
          </thead>
          <tbody>
            {invoices.map((i) => {
              const utr = utrByWorker[i.worker_id];
              const utrOk = !!utr && /^\d{10}K?$/i.test(utr);
              return (
              <tr key={i.id} className="border-t">
                <td className="p-3 font-mono text-xs">{i.invoice_number}</td>
                <td className="p-3">
                  <div>{i.worker_name ?? "—"}</div>
                  <div className={`text-xs ${utrOk ? "text-muted-foreground" : "text-destructive"}`}>
                    {utrOk ? `UTR ${utr}` : "⚠ UTR missing/invalid"}
                  </div>
                </td>
                <td className="p-3">{i.period_start} → {i.period_end}</td>
                <td className="p-3 text-right">{Number(i.total_hours).toFixed(2)}</td>
                <td className="p-3 text-right">£{Number(i.gross_amount).toFixed(2)}</td>
                <td className="p-3 text-right">£{Number(i.cis_deduction).toFixed(2)} ({Number(i.cis_rate).toFixed(0)}%)</td>
                <td className="p-3 text-right font-semibold">£{Number(i.net_amount).toFixed(2)}</td>
                <td className="p-3">
                  <Select value={i.status} onValueChange={(v) => setStatus(i.id, v)}>
                    <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-3">
                  <div className="flex gap-1 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!utrOk || sendingId === i.id}
                      onClick={() => sendOne(i.id)}
                      title={utrOk ? "Email invoice to worker" : "Worker UTR is required"}
                    >
                      <Send className="w-3.5 h-3.5 mr-1" />
                      {sendingId === i.id ? "Sending…" : "Send"}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(i.id)} aria-label="Delete invoice">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
              );
            })}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={9} className="p-6 text-center text-muted-foreground">
                  No invoices yet. Assign shifts with hourly rates, then click "Generate last week now".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== Qualifications verification ====================

type AdminQualRow = {
  id: string;
  worker_id: string;
  qualification: string;
  photo_path: string;
  status: "pending" | "verified" | "rejected";
  notes: string | null;
  verified_at: string | null;
  created_at: string;
  worker_name?: string | null;
};

function QualificationsTab() {
  const [rows, setRows] = useState<AdminQualRow[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"pending" | "verified" | "rejected" | "all">("pending");
  const [noteFor, setNoteFor] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("worker_qualifications")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    const list = (data ?? []) as AdminQualRow[];
    const workerIds = Array.from(new Set(list.map((r) => r.worker_id)));
    if (workerIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", workerIds);
      const map = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
      list.forEach((r) => {
        r.worker_name = map.get(r.worker_id) ?? null;
      });
    }
    setRows(list);

    // Fetch signed URLs (lazy import to avoid circular)
    const { getSignedPhotoUrl } = await import("@/lib/photos");
    const urlMap: Record<string, string> = {};
    await Promise.all(
      list.map(async (r) => {
        const u = await getSignedPhotoUrl(r.photo_path, "qualification-photos");
        if (u) urlMap[r.id] = u;
      }),
    );
    setUrls(urlMap);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (row: AdminQualRow, status: "verified" | "rejected") => {
    setBusyId(row.id);
    const notes = status === "rejected" ? (noteFor[row.id] ?? "").trim() || null : null;
    const { error } = await supabase
      .from("worker_qualifications")
      .update({
        status,
        notes,
        verified_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success(status === "verified" ? "Qualification verified" : "Qualification rejected");
    load();
  };

  const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter);
  const pendingCount = rows.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {(["pending", "verified", "rejected", "all"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
          >
            {f === "pending" && pendingCount > 0 && (
              <span className="mr-1 bg-warning text-warning-foreground rounded-full px-1.5 text-xs">
                {pendingCount}
              </span>
            )}
            {f[0].toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
          No {filter === "all" ? "" : filter} qualifications.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{r.worker_name ?? "Unknown worker"}</div>
                  <div className="text-sm text-muted-foreground">{r.qualification}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Submitted {new Date(r.created_at).toLocaleString()}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    r.status === "verified"
                      ? "bg-success/20 text-success"
                      : r.status === "rejected"
                        ? "bg-destructive/15 text-destructive"
                        : "bg-warning/20 text-warning-foreground"
                  }`}
                >
                  {r.status}
                </span>
              </div>

              {urls[r.id] ? (
                <a href={urls[r.id]} target="_blank" rel="noreferrer">
                  <img
                    src={urls[r.id]}
                    alt={r.qualification}
                    className="w-full max-h-64 object-contain rounded border bg-muted"
                  />
                </a>
              ) : (
                <div className="w-full h-48 bg-muted animate-pulse rounded" />
              )}

              {r.status === "rejected" && r.notes && (
                <p className="text-xs text-muted-foreground">
                  Rejection note: {r.notes}
                </p>
              )}

              {r.status === "pending" && (
                <div className="space-y-2">
                  <Input
                    placeholder="Optional rejection note"
                    value={noteFor[r.id] ?? ""}
                    onChange={(e) =>
                      setNoteFor((m) => ({ ...m, [r.id]: e.target.value }))
                    }
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => decide(r, "verified")}
                      disabled={busyId === r.id}
                      className="flex-1"
                    >
                      <Check className="w-4 h-4 mr-1" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => decide(r, "rejected")}
                      disabled={busyId === r.id}
                      className="flex-1"
                    >
                      <X className="w-4 h-4 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
