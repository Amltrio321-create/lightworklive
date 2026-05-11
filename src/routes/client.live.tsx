import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { RequireRole } from "@/components/auth/RequireRole";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { LiveOperativesMap, LiveOperative } from "@/components/LiveOperativesMap";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/client/live")({
  component: () => (
    <RequireRole allow={["client"]}>
      <LivePage />
    </RequireRole>
  ),
});

type ActiveShift = {
  id: string;
  worker_id: string;
  site_id: string;
  sites?: { name: string | null } | null;
};

function LivePage() {
  const { user } = useAuth();
  const [operatives, setOperatives] = useState<Record<string, LiveOperative>>({});
  const [shifts, setShifts] = useState<ActiveShift[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: shiftRows } = await supabase
      .from("shifts")
      .select("id, worker_id, site_id, sites(name)")
      .eq("status", "active");

    const list = (shiftRows ?? []) as ActiveShift[];
    setShifts(list);

    if (list.length === 0) {
      setOperatives({});
      setLoading(false);
      return;
    }

    const workerIds = Array.from(new Set(list.map((s) => s.worker_id)));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", workerIds);
    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

    // Fetch latest ping per shift in parallel
    const entries = await Promise.all(
      list.map(async (s) => {
        const { data: pings } = await supabase
          .from("location_pings")
          .select("latitude, longitude, recorded_at")
          .eq("shift_id", s.id)
          .order("recorded_at", { ascending: false })
          .limit(1);
        const p = pings?.[0];
        if (!p) return null;
        const op: LiveOperative = {
          shiftId: s.id,
          workerName: nameById.get(s.worker_id) ?? "Worker",
          siteName: s.sites?.name ?? null,
          lat: p.latitude as number,
          lng: p.longitude as number,
          recordedAt: p.recorded_at as string,
        };
        return [s.id, op] as const;
      }),
    );

    const map: Record<string, LiveOperative> = {};
    for (const e of entries) if (e) map[e[0]] = e[1];
    setOperatives(map);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Realtime: stream new pings and reflect them on the map immediately
  useEffect(() => {
    if (shifts.length === 0) return;
    const shiftIds = new Set(shifts.map((s) => s.id));
    const nameLookup = new Map<string, { workerName: string; siteName: string | null }>();
    shifts.forEach((s) => {
      const existing = operatives[s.id];
      nameLookup.set(s.id, {
        workerName: existing?.workerName ?? "Worker",
        siteName: existing?.siteName ?? s.sites?.name ?? null,
      });
    });

    const channel = supabase
      .channel("client-live-map")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "location_pings" },
        (payload) => {
          const ping = payload.new as {
            shift_id: string;
            latitude: number;
            longitude: number;
            recorded_at: string;
          };
          if (!shiftIds.has(ping.shift_id)) return;
          const meta = nameLookup.get(ping.shift_id);
          setOperatives((prev) => ({
            ...prev,
            [ping.shift_id]: {
              shiftId: ping.shift_id,
              workerName: meta?.workerName ?? "Worker",
              siteName: meta?.siteName ?? null,
              lat: ping.latitude,
              lng: ping.longitude,
              recordedAt: ping.recorded_at,
            },
          }));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "shifts" },
        () => loadAll(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shifts, operatives, loadAll]);

  const list = Object.values(operatives);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link
            to="/client"
            className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"
          >
            <ArrowLeft className="w-3 h-3" /> Back to overview
          </Link>
          <h1 className="text-2xl font-bold mt-1">Live tracking</h1>
          <p className="text-sm text-muted-foreground">
            Real-time location of every operative currently on a shift at your sites.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success live-pulse" />
          <span>
            <strong>{list.length}</strong> operative{list.length === 1 ? "" : "s"} live
          </span>
        </div>
        <div className="text-muted-foreground">
          {shifts.length - list.length > 0 &&
            `${shifts.length - list.length} awaiting first GPS ping`}
        </div>
      </div>

      {shifts.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center text-muted-foreground">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
          No workers are currently on shift at your sites.
        </div>
      ) : (
        <>
          <LiveOperativesMap operatives={list} />

          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((o) => (
              <li key={o.shiftId} className="rounded-md border bg-card p-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success live-pulse" />
                  <div className="font-semibold">{o.workerName}</div>
                </div>
                {o.siteName && (
                  <div className="text-xs text-muted-foreground mt-0.5">{o.siteName}</div>
                )}
                <div className="text-xs font-mono mt-1">
                  {o.lat.toFixed(5)}, {o.lng.toFixed(5)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Updated {new Date(o.recordedAt).toLocaleTimeString()}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
