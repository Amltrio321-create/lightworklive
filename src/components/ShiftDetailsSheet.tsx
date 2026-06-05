import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { getSignedPhotoUrl } from "@/lib/photos";
import { MapPin, Clock, Camera, Hash, User, Phone, ShieldCheck } from "lucide-react";

type Props = {
  shiftId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ShiftDetail = {
  id: string;
  job_number: string | null;
  status: string;
  scheduled_start: string;
  scheduled_end: string | null;
  started_at: string | null;
  ended_at: string | null;
  hourly_rate: number | null;
  worker_id: string;
  sites: { name: string; address: string | null; latitude: number | null; longitude: number | null } | null;
};

type Ping = { latitude: number; longitude: number; recorded_at: string };
type Photo = { id: string; photo_path: string; caption: string | null; taken_at: string };
type WorkerProfile = { full_name: string | null; phone: string | null; qualifications: string[] | null };

export function ShiftDetailsSheet({ shiftId, open, onOpenChange }: Props) {
  const [shift, setShift] = useState<ShiftDetail | null>(null);
  const [pings, setPings] = useState<Ping[]>([]);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [worker, setWorker] = useState<WorkerProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!shiftId || !open) return;
    setLoading(true);
    setShift(null);
    setPings([]);
    setPhoto(null);
    setPhotoUrl(null);
    setWorker(null);

    (async () => {
      const { data: s } = await supabase
        .from("shifts")
        .select("id, job_number, status, scheduled_start, scheduled_end, started_at, ended_at, hourly_rate, worker_id, sites(name, address, latitude, longitude)")
        .eq("id", shiftId)
        .single();
      if (s) {
        setShift(s as any);
        const [{ data: ps }, { data: ph }, { data: prof }] = await Promise.all([
          supabase.from("location_pings").select("latitude, longitude, recorded_at").eq("shift_id", shiftId).order("recorded_at", { ascending: true }),
          supabase.from("photo_updates").select("id, photo_path, caption, taken_at").eq("shift_id", shiftId).order("taken_at", { ascending: false }).limit(1).maybeSingle(),
          supabase.from("profiles").select("full_name, phone, qualifications").eq("id", (s as any).worker_id).single(),
        ]);
        setPings((ps ?? []) as Ping[]);
        if (ph) {
          setPhoto(ph as Photo);
          const url = await getSignedPhotoUrl((ph as Photo).photo_path);
          if (url) setPhotoUrl(url);
        }
        if (prof) setWorker(prof as WorkerProfile);
      }
      setLoading(false);
    })();
  }, [shiftId, open]);

  const hoursOnSite = computeHoursFromPings(pings);
  const claimedHours = shift?.started_at && shift?.ended_at
    ? (new Date(shift.ended_at).getTime() - new Date(shift.started_at).getTime()) / 3_600_000
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Shift details</SheetTitle>
          <SheetDescription>
            {shift?.sites?.name ?? "Loading…"}
          </SheetDescription>
        </SheetHeader>

        {loading && !shift && <div className="mt-6 text-sm text-muted-foreground">Loading…</div>}

        {shift && (
          <div className="mt-6 space-y-5">
            {shift.job_number && (
              <div className="flex items-center gap-2 text-sm">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <span className="font-mono font-semibold">{shift.job_number}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Job ref</span>
              </div>
            )}

            <section className="rounded-lg border p-3 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Worker</div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{worker?.full_name ?? "—"}</span>
              </div>
              {worker?.phone && (
                <a href={`tel:${worker.phone}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <Phone className="w-4 h-4" /> {worker.phone}
                </a>
              )}
              {worker?.qualifications && worker.qualifications.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <ShieldCheck className="w-3 h-3" />
                  {worker.qualifications.map((q) => (
                    <span key={q} className="px-2 py-0.5 rounded bg-muted">{q}</span>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-lg border p-3 space-y-1 text-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Site</div>
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground" />{shift.sites?.name}</div>
              {shift.sites?.address && <div className="text-xs text-muted-foreground ml-6">{shift.sites.address}</div>}
            </section>

            <section className="rounded-lg border p-3 space-y-1 text-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Times</div>
              <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-muted-foreground" /> Scheduled: {new Date(shift.scheduled_start).toLocaleString()}</div>
              {shift.started_at && <div className="ml-6 text-xs">Started: {new Date(shift.started_at).toLocaleString()}</div>}
              {shift.ended_at && <div className="ml-6 text-xs">Ended: {new Date(shift.ended_at).toLocaleString()}</div>}
              {claimedHours !== null && (
                <div className="ml-6 text-xs">
                  Claimed: <strong>{claimedHours.toFixed(2)}h</strong>
                  {hoursOnSite !== null && (
                    <> · GPS verified: <strong className={varianceClass(claimedHours, hoursOnSite)}>{hoursOnSite.toFixed(2)}h</strong></>
                  )}
                </div>
              )}
            </section>

            {photo && (
              <section className="rounded-lg border p-3 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Camera className="w-3 h-3" /> Latest photo
                </div>
                {photoUrl ? (
                  <a href={photoUrl} target="_blank" rel="noreferrer">
                    <img src={photoUrl} alt="Latest update" className="w-full rounded-md border" />
                  </a>
                ) : (
                  <div className="h-32 bg-muted animate-pulse rounded" />
                )}
                {photo.caption && <div className="text-sm">{photo.caption}</div>}
                <div className="text-xs text-muted-foreground">{new Date(photo.taken_at).toLocaleString()}</div>
              </section>
            )}

            <section className="rounded-lg border p-3 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">GPS history</div>
              {pings.length === 0 ? (
                <div className="text-sm text-muted-foreground">No GPS pings yet.</div>
              ) : (
                <>
                  <PingMap pings={pings} />
                  <div className="text-xs text-muted-foreground">
                    {pings.length} pings · first {new Date(pings[0].recorded_at).toLocaleTimeString()} · last {new Date(pings[pings.length - 1].recorded_at).toLocaleTimeString()}
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function computeHoursFromPings(pings: Ping[]): number | null {
  if (pings.length < 2) return null;
  let total = 0;
  for (let i = 1; i < pings.length; i++) {
    const gap = (new Date(pings[i].recorded_at).getTime() - new Date(pings[i - 1].recorded_at).getTime()) / 1000;
    if (gap <= 1200) total += gap;
  }
  return total / 3600;
}

function varianceClass(claimed: number, gps: number) {
  if (claimed === 0) return "";
  const variance = Math.abs((claimed - gps) / claimed) * 100;
  if (variance > 10) return "text-destructive";
  return "text-success";
}

function PingMap({ pings }: { pings: Ping[] }) {
  const lats = pings.map((p) => p.latitude);
  const lngs = pings.map((p) => p.longitude);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const pad = 0.002;
  const bbox = `${minLng - pad},${minLat - pad},${maxLng + pad},${maxLat + pad}`;
  const last = pings[pings.length - 1];
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${last.latitude},${last.longitude}`;
  return <iframe title="GPS history" src={src} className="w-full h-56 rounded-md border" loading="lazy" />;
}
