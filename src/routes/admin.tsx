import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { RequireRole } from "@/components/auth/RequireRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
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
  company_name: string | null;
  roles: AppRole[];
};

type Site = { id: string; name: string; address: string | null; client_id: string };

function AdminPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold">Admin console</h1>
      <p className="text-sm text-muted-foreground">
        Manage users, sites and shift assignments.
      </p>

      <Tabs defaultValue="users" className="mt-6">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="sites">Sites</TabsTrigger>
          <TabsTrigger value="shifts">Shifts</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-4"><UsersTab /></TabsContent>
        <TabsContent value="sites" className="mt-4"><SitesTab /></TabsContent>
        <TabsContent value="shifts" className="mt-4"><ShiftsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<ProfileRow[]>([]);

  const load = useCallback(async () => {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, company_name")
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
      }))
    );
  }, []);

  useEffect(() => { load(); }, [load]);

  const setRole = async (userId: string, newRole: AppRole) => {
    // Remove existing roles, set new single role
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    if (error) return toast.error(error.message);
    toast.success("Role updated");
    load();
  };

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted text-xs uppercase tracking-wider">
          <tr>
            <th className="text-left p-3">Name</th>
            <th className="text-left p-3">Company</th>
            <th className="text-left p-3">Role</th>
            <th className="text-left p-3 w-48">Change role</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t">
              <td className="p-3 font-medium">{u.full_name ?? <span className="text-muted-foreground">—</span>}</td>
              <td className="p-3">{u.company_name ?? "—"}</td>
              <td className="p-3">
                {u.roles.map((r) => (
                  <span key={r} className="inline-block mr-1 px-2 py-0.5 rounded bg-accent text-accent-foreground text-xs uppercase">
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
          ))}
          {users.length === 0 && (
            <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No users yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SitesTab() {
  const [sites, setSites] = useState<(Site & { client_name: string | null })[]>([]);
  const [clients, setClients] = useState<{ id: string; full_name: string | null; company_name: string | null }[]>([]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [clientId, setClientId] = useState("");

  const load = useCallback(async () => {
    const { data: sitesData } = await supabase.from("sites").select("*").order("name");
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "client");
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
        client_name: byId.get(s.client_id)?.company_name ?? byId.get(s.client_id)?.full_name ?? null,
      }))
    );
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return toast.error("Pick a client");
    const { error } = await supabase.from("sites").insert({
      client_id: clientId, name, address: address || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Site created");
    setName(""); setAddress(""); setClientId("");
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
            </tr>
          </thead>
          <tbody>
            {sites.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-3 font-medium">{s.name}</td>
                <td className="p-3">{s.client_name ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{s.address ?? "—"}</td>
              </tr>
            ))}
            {sites.length === 0 && (
              <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">No sites yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <form onSubmit={create} className="rounded-lg border bg-card p-4 space-y-3 h-fit">
        <h3 className="font-semibold">New site</h3>
        <div className="space-y-1">
          <Label>Client</Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
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

function ShiftsTab() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [workers, setWorkers] = useState<{ id: string; full_name: string | null }[]>([]);
  const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
  const [workerId, setWorkerId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [start, setStart] = useState(() => new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16));

  const load = useCallback(async () => {
    const { data: shiftsData } = await supabase
      .from("shifts")
      .select("*, sites(name)")
      .order("scheduled_start", { ascending: false })
      .limit(50);
    const ids = Array.from(new Set((shiftsData ?? []).map((s) => s.worker_id)));
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const byId = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
    setShifts((shiftsData ?? []).map((s) => ({ ...s, worker_name: byId.get(s.worker_id) })));

    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "worker");
    const workerIds = (roles ?? []).map((r) => r.user_id);
    const { data: workerProfs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", workerIds.length ? workerIds : ["00000000-0000-0000-0000-000000000000"]);
    setWorkers(workerProfs ?? []);

    const { data: sitesData } = await supabase.from("sites").select("id, name").order("name");
    setSites(sitesData ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

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
    setWorkerId(""); setSiteId("");
    load();
  };

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left p-3">When</th>
              <th className="text-left p-3">Worker</th>
              <th className="text-left p-3">Site</th>
              <th className="text-left p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-3">{new Date(s.scheduled_start).toLocaleString()}</td>
                <td className="p-3">{s.worker_name ?? "—"}</td>
                <td className="p-3">{s.sites?.name}</td>
                <td className="p-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs uppercase ${
                    s.status === "active" ? "bg-success text-success-foreground" :
                    s.status === "ended" ? "bg-muted text-muted-foreground" :
                    "bg-warning text-warning-foreground"
                  }`}>{s.status}</span>
                </td>
              </tr>
            ))}
            {shifts.length === 0 && (
              <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No shifts yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <form onSubmit={create} className="rounded-lg border bg-card p-4 space-y-3 h-fit">
        <h3 className="font-semibold">Assign shift</h3>
        <div className="space-y-1">
          <Label>Worker</Label>
          <Select value={workerId} onValueChange={setWorkerId}>
            <SelectTrigger><SelectValue placeholder="Select worker" /></SelectTrigger>
            <SelectContent>
              {workers.map((w) => (
                <SelectItem key={w.id} value={w.id}>{w.full_name ?? w.id.slice(0, 8)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Site</Label>
          <Select value={siteId} onValueChange={setSiteId}>
            <SelectTrigger><SelectValue placeholder="Select site" /></SelectTrigger>
            <SelectContent>
              {sites.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Scheduled start</Label>
          <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <Button type="submit" className="w-full">Assign</Button>
      </form>
    </div>
  );
}
