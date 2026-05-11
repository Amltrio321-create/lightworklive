import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, { url: string; expires: number }>();

export async function getSignedPhotoUrl(path: string): Promise<string | null> {
  const now = Date.now();
  const cached = cache.get(path);
  if (cached && cached.expires > now + 30_000) return cached.url;

  const { data, error } = await supabase.storage
    .from("shift-photos")
    .createSignedUrl(path, 3600);
  if (error || !data) return null;
  cache.set(path, { url: data.signedUrl, expires: now + 3600 * 1000 });
  return data.signedUrl;
}
