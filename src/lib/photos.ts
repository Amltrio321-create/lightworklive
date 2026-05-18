import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, { url: string; expires: number }>();

export async function getSignedPhotoUrl(
  path: string,
  bucket: "shift-photos" | "qualification-photos" = "shift-photos",
): Promise<string | null> {
  const now = Date.now();
  const key = `${bucket}:${path}`;
  const cached = cache.get(key);
  if (cached && cached.expires > now + 30_000) return cached.url;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600);
  if (error || !data) return null;
  cache.set(key, { url: data.signedUrl, expires: now + 3600 * 1000 });
  return data.signedUrl;
}
