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
import { Trash2, Square, Radar, Users, Building2, HardHat, Activity, Receipt, PlayCircle } from "lucide-react";
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
          <TabsTrigger value="sites"><Building2 className="w-4 h-4 mr-1" />Sites</TabsTrigger>
          <TabsTrigger value="shifts"><HardHat className="w-4 h-4 mr-1" />Shifts</TabsTrigger>
          <TabsTrigger value="invoices"><Receipt className="w-4 h-4 mr-1" />Invoices</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4"><OverviewTab /></TabsContent>
        <TabsContent value="users" className="mt-4"><UsersTab /></TabsContent>
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
      .select("id, full_name, phone, company_name, company_address, worker_ref, trade, right_to_work")
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
    const { error } = await supabase.from("shifts").insert({
      worker_id: workerId,
      site_id: siteId,
      scheduled_start: new Date(start).toISOString(),
    });
    if (error) return toast.error(error.message);
    toast.success("Shift assigned");
    setWorkerId("");
    setSiteId("");
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
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
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
        <Button type="submit" className="w-full">Assign</Button>
      </form>
    </div>
  );
}
