interface MapEmbedProps {
  lat: number;
  lng: number;
  zoom?: number;
  className?: string;
}

export function MapEmbed({ lat, lng, zoom = 16, className }: MapEmbedProps) {
  const delta = 0.005;
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
  return (
    <iframe
      title="Worker location map"
      src={src}
      className={className ?? "w-full h-64 rounded-md border"}
      loading="lazy"
    />
  );
}
