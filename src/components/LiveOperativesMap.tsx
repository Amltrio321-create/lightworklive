import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type LiveOperative = {
  shiftId: string;
  workerName: string;
  siteName: string | null;
  lat: number;
  lng: number;
  recordedAt: string;
};

// Custom hi-vis cone-style marker (avoids broken default marker icons in bundlers)
const coneIcon = L.divIcon({
  className: "",
  html: `
    <div style="position:relative;width:32px;height:40px;transform:translate(-50%,-100%);">
      <div style="position:absolute;left:50%;top:0;transform:translateX(-50%);width:0;height:0;
        border-left:14px solid transparent;border-right:14px solid transparent;
        border-bottom:30px solid hsl(24 95% 53%);
        filter:drop-shadow(0 2px 3px rgba(0,0,0,0.35));"></div>
      <div style="position:absolute;left:50%;top:12px;transform:translateX(-50%);width:18px;height:3px;background:white;border-radius:1px;"></div>
      <div style="position:absolute;left:50%;top:20px;transform:translateX(-50%);width:22px;height:3px;background:white;border-radius:1px;"></div>
      <div style="position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:28px;height:5px;background:#1a1a1a;border-radius:2px;"></div>
      <div style="position:absolute;left:50%;top:32px;transform:translate(-50%,-50%);width:10px;height:10px;border-radius:50%;
        background:hsl(142 71% 45%);box-shadow:0 0 0 4px hsl(142 71% 45% / 0.35);animation:pulse 1.6s ease-out infinite;"></div>
    </div>
    <style>@keyframes pulse{0%{box-shadow:0 0 0 0 hsl(142 71% 45% / 0.6);}70%{box-shadow:0 0 0 12px hsl(142 71% 45% / 0);}100%{box-shadow:0 0 0 0 hsl(142 71% 45% / 0);}}</style>
  `,
  iconSize: [32, 40],
  iconAnchor: [16, 40],
});

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const didInitial = useRef(false);
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], Math.max(map.getZoom(), 15));
      return;
    }
    const bounds = L.latLngBounds(points);
    if (!didInitial.current) {
      map.fitBounds(bounds, { padding: [40, 40] });
      didInitial.current = true;
    }
  }, [points, map]);
  return null;
}

export function LiveOperativesMap({
  operatives,
  className,
}: {
  operatives: LiveOperative[];
  className?: string;
}) {
  const points = useMemo<[number, number][]>(
    () => operatives.map((o) => [o.lat, o.lng]),
    [operatives],
  );
  const center: [number, number] = points[0] ?? [54.5, -2.5]; // UK fallback

  return (
    <div className={className ?? "w-full h-[480px] rounded-lg overflow-hidden border"}>
      <MapContainer
        center={center}
        zoom={6}
        scrollWheelZoom
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        {operatives.map((o) => (
          <Marker key={o.shiftId} position={[o.lat, o.lng]} icon={coneIcon}>
            <Popup>
              <div className="text-sm">
                <div className="font-bold">{o.workerName}</div>
                {o.siteName && <div className="text-muted-foreground">{o.siteName}</div>}
                <div className="mt-1 text-xs font-mono">
                  {o.lat.toFixed(5)}, {o.lng.toFixed(5)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Updated {new Date(o.recordedAt).toLocaleTimeString()}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
