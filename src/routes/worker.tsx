import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { RequireRole } from "@/components/auth/RequireRole";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Camera, MapPin, Play, Square, Clock, AlertCircle } from "lucide-react";
import { getSignedPhotoUrl } from "@/lib/photos";

type Shift = {
  id: string;
  site_id: string;
  scheduled_start: string;
  scheduled_end: string | null;
  started_at: string | null;
  ended_at: string | null;
  status: "scheduled" | "active" | "ended";
  notes: string | null;
  sites?: { name: string; address: string | null } | null;
};

type Photo = {
  id: string;
  shift_id: string;
  photo_path: string;
  caption: string | null;
  taken_at: string;
};

const PING_INTERVAL_MS = 30_000;

export const Route = createFileRoute("/worker")({
  component: () => (
    <RequireRole allow={["worker"]}>
      <WorkerPage />
    </RequireRole>
  ),
});

function WorkerPage() {
  const { user } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [active, setActive] = useState<Shift | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [lastPing, setLastPing] = useState<{ lat: number; lng: number; at: Date } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastPhotoAt = photos[0]?.taken_at ? new Date(photos[0].taken_at) : null;
  const minutesSincePhoto = lastPhotoAt
    ? Math.floor((Date.now() - lastPhotoAt.getTime()) / 60000)
    : null;
  const photoDue = !lastPhotoAt || (minutesSincePhoto ?? 0) >= 60;

  const loadShifts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("shifts")
      .select("*, sites(name, address)")
      .eq("worker_id", user.id)
      .in("status", ["scheduled", "active"])
      .order("scheduled_start", { ascending: true });
    const list = (data ?? []) as Shift[];
    setShifts(list);
    const a = list.find((s) => s.status === "active") ?? null;
    setActive(a);
  }, [user]);

  const loadPhotos = useCallback(async (shiftId: string) => {
    const { data } = await supabase
      .from("photo_updates")
      .select("*")
      .eq("shift_id", shiftId)
      .order("taken_at", { ascending: false });
    const list = (data ?? []) as Photo[];
    setPhotos(list);
    const urls: Record<string, string> = {};
    await Promise.all(
      list.slice(0, 6).map(async (p) => {
        const u = await getSignedPhotoUrl(p.photo_path);
        if (u) urls[p.id] = u;
      })
    );
    setPhotoUrls(urls);
  }, []);

  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  useEffect(() => {
    if (active) loadPhotos(active.id);
    else {
      setPhotos([]);
      setPhotoUrls({});
    }
  }, [active, loadPhotos]);

  // GPS streaming while shift active
  useEffect(() => {
    if (!active || !user) return;
    if (!("geolocation" in navigator)) {
      setGpsError("Geolocation not supported on this device.");
      return;
    }
    let stopped = false;

    const ping = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          if (stopped) return;
          const { latitude, longitude, accuracy } = pos.coords;
          setLastPing({ lat: latitude, lng: longitude, at: new Date() });
          setGpsError(null);
          await supabase.from("location_pings").insert({
            shift_id: active.id,
            worker_id: user.id,
            latitude,
            longitude,
            accuracy,
          });
        },
        (err) => {
          setGpsError(err.message);
        },
        { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 }
      );
    };

    ping();
    const id = setInterval(ping, PING_INTERVAL_MS);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [active, user]);

  const startShift = async (shift: Shift) => {
    const { error } = await supabase
      .from("shifts")
      .update({ status: "active", started_at: new Date().toISOString() })
      .eq("id", shift.id);
    if (error) return toast.error(error.message);
    toast.success("Shift started");
    loadShifts();
  };

  const endShift = async () => {
    if (!active) return;
    const { error } = await supabase
      .from("shifts")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", active.id);
    if (error) return toast.error(error.message);
    toast.success("Shift ended");
    loadShifts();
  };

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !active || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${active.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("shift-photos")
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;

      // Get current location for the photo
      const coords = await new Promise<GeolocationCoordinates | null>((resolve) => {
        if (!("geolocation" in navigator)) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          (p) => resolve(p.coords),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 10_000 }
        );
      });

      const { error: insErr } = await supabase.from("photo_updates").insert({
        shift_id: active.id,
        worker_id: user.id,
        photo_path: path,
        caption: caption.trim() || null,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
      });
      if (insErr) throw insErr;
      setCaption("");
      toast.success("Photo uploaded");
      loadPhotos(active.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Worker dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Start your shift to begin live location sharing.
          </p>
        </div>
        <a
          href="/worker/invoices"
          className="text-sm font-medium underline-offset-2 hover:underline shrink-0"
        >
          My invoices →
        </a>
      </div>

      {!active && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Upcoming shifts
          </h2>
          {shifts.length === 0 ? (
            <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
              No shifts assigned. Contact your admin.
            </div>
          ) : (
            shifts.map((s) => (
              <div key={s.id} className="rounded-lg border bg-card p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">{s.sites?.name ?? "Site"}</div>
                  {s.sites?.address && (
                    <div className="text-sm text-muted-foreground">{s.sites.address}</div>
                  )}
                  <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(s.scheduled_start).toLocaleString()}
                  </div>
                </div>
                <Button onClick={() => startShift(s)} className="font-semibold">
                  <Play className="w-4 h-4 mr-1" /> Start
                </Button>
              </div>
            ))
          )}
        </section>
      )}

      {active && (
        <>
          <section className="rounded-lg border-2 border-primary bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-success live-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-success">
                    On shift
                  </span>
                </div>
                <h2 className="mt-1 text-xl font-bold">{active.sites?.name}</h2>
                {active.sites?.address && (
                  <p className="text-sm text-muted-foreground">{active.sites.address}</p>
                )}
              </div>
              <Button variant="destructive" onClick={endShift} size="sm">
                <Square className="w-4 h-4 mr-1" /> End
              </Button>
            </div>

            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              <div className="rounded-md bg-muted p-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Last GPS
                </div>
                {lastPing ? (
                  <div className="mt-1 text-sm">
                    {lastPing.lat.toFixed(5)}, {lastPing.lng.toFixed(5)}
                    <div className="text-xs text-muted-foreground">
                      {lastPing.at.toLocaleTimeString()}
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 text-sm text-muted-foreground">
                    {gpsError ?? "Acquiring location…"}
                  </div>
                )}
              </div>
              <div className="rounded-md bg-muted p-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Camera className="w-3 h-3" /> Last photo
                </div>
                <div className="mt-1 text-sm">
                  {lastPhotoAt
                    ? `${minutesSincePhoto} min ago`
                    : "No photo yet this shift"}
                </div>
              </div>
            </div>

            {gpsError && (
              <div className="mt-3 flex items-start gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                <span>{gpsError} — please allow location access.</span>
              </div>
            )}
          </section>

          <section className={`rounded-lg border p-5 ${photoDue ? "border-warning bg-warning/10" : "bg-card"}`}>
            <h3 className="font-semibold flex items-center gap-2">
              <Camera className="w-4 h-4" />
              {photoDue ? "Photo update due" : "Add a photo"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Take a photo every hour while on site.
            </p>
            <div className="mt-3 space-y-3">
              <div>
                <Label htmlFor="cap" className="text-xs">Caption (optional)</Label>
                <Input
                  id="cap"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="e.g. lane 2 closed, signage in place"
                />
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onPhoto}
                className="hidden"
              />
              <Button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full font-semibold"
                size="lg"
              >
                <Camera className="w-5 h-5 mr-2" />
                {uploading ? "Uploading…" : "Take photo"}
              </Button>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Recent photos
            </h3>
            {photos.length === 0 ? (
              <div className="text-sm text-muted-foreground">No photos yet.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.slice(0, 6).map((p) => (
                  <div key={p.id} className="rounded-md overflow-hidden border bg-card">
                    {photoUrls[p.id] ? (
                      <img src={photoUrls[p.id]} alt="" className="w-full h-32 object-cover" />
                    ) : (
                      <div className="w-full h-32 bg-muted animate-pulse" />
                    )}
                    <div className="p-2 text-xs">
                      <div className="font-medium">
                        {new Date(p.taken_at).toLocaleTimeString()}
                      </div>
                      {p.caption && <div className="text-muted-foreground truncate">{p.caption}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
