import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { RequireRole } from "@/components/auth/RequireRole";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MapPin, Camera, Plus, Clock } from "lucide-react";
import { MapEmbed } from "@/components/MapEmbed";
import { getSignedPhotoUrl } from "@/lib/photos";

type Site = { id: string; name: string; address: string | null };
type Shift = {
  id: string;
  site_id: string;
  worker_id: string;
  status: "scheduled" | "active" | "ended";
  started_at: string | null;
  scheduled_start: string;
  sites?: Site | null;
  worker?: { full_name: string | null } | null;
};
type Ping = { latitude: number; longitude: number; recorded_at: string };
type Photo = {
  id: string;
  photo_path: string;
  caption: string | null;
  taken_at: string;
  latitude: number | null;
  longitude: number | null;
};

export const Route = createFileRoute("/client")({
  component: () => (
    <RequireRole allow={["client"]}>
      <ClientPage />
    </RequireRole>
  ),
});

function ClientPage() {
  const { user } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [latestPing, setLatestPing] = useState<Record<string, Ping>>({});
  const [latestPhoto, setLatestPhoto] = useState<Record<string, Photo>>({});
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [siteName, setSiteName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");

  const loadSites = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("sites")
      .select("id, name, address")
      .eq("client_id", user.id)
      .order("name");
    setSites((data ?? []) as Site[]);
  }, [user]);

  const loadShifts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("shifts")
      .select("*, sites(id, name, address)")
      .in("status", ["active", "scheduled"])
      .order("started_at", { ascending: false });
    const list = (data ?? []) as Shift[];
    // Lookup worker names via profiles
    const workerIds = Array.from(new Set(list.map((s) => s.worker_id)));
    if (workerIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", workerIds);
      const byId = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
      list.forEach((s) => {
        s.worker = { full_name: byId.get(s.worker_id) ?? null };
      });
    }
    setShifts(list);
  }, [user]);

  const loadLatestForShift = useCallback(async (shiftId: string) => {
    const [{ data: pings }, { data: photos }] = await Promise.all([
      supabase
        .from("location_pings")
        .select("latitude, longitude, recorded_at")
        .eq("shift_id", shiftId)
        .order("recorded_at", { ascending: false })
        .limit(1),
      supabase
        .from("photo_updates")
        .select("id, photo_path, caption, taken_at, latitude, longitude")
        .eq("shift_id", shiftId)
        .order("taken_at", { ascending: false })
        .limit(1),
    ]);
    if (pings && pings[0]) setLatestPing((m) => ({ ...m, [shiftId]: pings[0] as Ping }));
    if (photos && photos[0]) {
      const ph = photos[0] as Photo;
      setLatestPhoto((m) => ({ ...m, [shiftId]: ph }));
      const url = await getSignedPhotoUrl(ph.photo_path);
      if (url) setPhotoUrls((m) => ({ ...m, [shiftId]: url }));
    }
  }, []);

  useEffect(() => {
    loadSites();
    loadShifts();
  }, [loadSites, loadShifts]);

  useEffect(() => {
    shifts.filter((s) => s.status === "active").forEach((s) => loadLatestForShift(s.id));
  }, [shifts, loadLatestForShift]);

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("client-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "location_pings" }, (p) => {
        const ping = p.new as Ping & { shift_id: string };
        if (shifts.some((s) => s.id === ping.shift_id)) {
          setLatestPing((m) => ({ ...m, [ping.shift_id]: ping }));
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "photo_updates" }, async (p) => {
        const ph = p.new as Photo & { shift_id: string };
        if (shifts.some((s) => s.id === ph.shift_id)) {
          setLatestPhoto((m) => ({ ...m, [ph.shift_id]: ph }));
          const url = await getSignedPhotoUrl(ph.photo_path);
          if (url) setPhotoUrls((m) => ({ ...m, [ph.shift_id]: url }));
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "shifts" }, () => {
        loadShifts();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [shifts, loadShifts]);

  const createSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("sites").insert({
      client_id: user.id,
      name: siteName,
      address: siteAddress || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Site added");
    setSiteName("");
    setSiteAddress("");
    setOpen(false);
    loadSites();
  };

  const activeShifts = shifts.filter((s) => s.status === "active");
  const scheduledShifts = shifts.filter((s) => s.status === "scheduled");

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Live operations</h1>
          <p className="text-sm text-muted-foreground">
            Workers currently on your sites.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-1" /> Add site
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a site</DialogTitle>
            </DialogHeader>
            <form onSubmit={createSite} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="sn">Site name</Label>
                <Input id="sn" required value={siteName} onChange={(e) => setSiteName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sa">Address</Label>
                <Input id="sa" value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)} />
              </div>
              <DialogFooter>
                <Button type="submit">Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          On shift now
        </h2>
        {activeShifts.length === 0 ? (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
            No workers on site right now.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {activeShifts.map((s) => {
              const ping = latestPing[s.id];
              const photo = latestPhoto[s.id];
              const photoUrl = photoUrls[s.id];
              return (
                <article key={s.id} className="rounded-lg border bg-card overflow-hidden">
                  <div className="p-4 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-success live-pulse" />
                        <span className="text-xs font-bold uppercase tracking-wider text-success">
                          Live
                        </span>
                      </div>
                      <h3 className="mt-1 font-bold text-lg">
                        {s.worker?.full_name ?? "Worker"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {s.sites?.name}
                        {s.sites?.address ? ` — ${s.sites.address}` : ""}
                      </p>
                    </div>
                    {s.started_at && (
                      <div className="text-right text-xs text-muted-foreground">
                        Started
                        <div>{new Date(s.started_at).toLocaleTimeString()}</div>
                      </div>
                    )}
                  </div>

                  {ping ? (
                    <MapEmbed lat={ping.latitude} lng={ping.longitude} className="w-full h-56 border-y" />
                  ) : (
                    <div className="w-full h-56 bg-muted flex items-center justify-center text-sm text-muted-foreground border-y">
                      <MapPin className="w-4 h-4 mr-1" /> Waiting for GPS…
                    </div>
                  )}

                  <div className="p-4 grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Location
                      </div>
                      {ping ? (
                        <>
                          <div className="text-sm font-mono">
                            {ping.latitude.toFixed(5)}, {ping.longitude.toFixed(5)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(ping.recorded_at).toLocaleTimeString()}
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-muted-foreground">—</div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Camera className="w-3 h-3" /> Latest photo
                      </div>
                      {photo ? (
                        photoUrl ? (
                          <a href={photoUrl} target="_blank" rel="noreferrer" className="block">
                            <img src={photoUrl} alt="" className="mt-1 h-16 w-full object-cover rounded" />
                            <div className="text-xs text-muted-foreground mt-1">
                              {new Date(photo.taken_at).toLocaleTimeString()}
                            </div>
                          </a>
                        ) : (
                          <div className="h-16 bg-muted animate-pulse rounded mt-1" />
                        )
                      ) : (
                        <div className="text-sm text-muted-foreground">No photo yet</div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Scheduled
        </h2>
        {scheduledShifts.length === 0 ? (
          <div className="text-sm text-muted-foreground">No upcoming shifts.</div>
        ) : (
          <ul className="rounded-lg border bg-card divide-y">
            {scheduledShifts.map((s) => (
              <li key={s.id} className="p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{s.worker?.full_name ?? "Worker"} — {s.sites?.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {new Date(s.scheduled_start).toLocaleString()}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Your sites
        </h2>
        {sites.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No sites yet — add one to get started.
          </div>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {sites.map((s) => (
              <li key={s.id} className="rounded-md border bg-card p-3">
                <div className="font-medium">{s.name}</div>
                {s.address && <div className="text-xs text-muted-foreground">{s.address}</div>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
