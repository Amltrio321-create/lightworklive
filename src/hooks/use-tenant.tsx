import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  contact_email: string | null;
};

type TenantCtx = {
  tenant: Tenant | null;
  logoSrc: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const Ctx = createContext<TenantCtx | undefined>(undefined);

// Convert hex (#rrggbb) → oklch string for CSS variables.
// Simple sRGB → OKLab → OKLCH conversion.
function hexToOklch(hex: string): string {
  const m = hex.replace("#", "");
  if (m.length !== 6) return "oklch(0.7 0.2 60)";
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const lr = lin(r), lg = lin(g), lb = lin(b);
  const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;
  const C = Math.sqrt(A * A + B * B);
  let H = (Math.atan2(B, A) * 180) / Math.PI;
  if (H < 0) H += 360;
  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${H.toFixed(1)})`;
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setTenant(null);
      setLogoSrc(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: mem } = await supabase
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!mem) {
      setTenant(null);
      setLogoSrc(null);
      setLoading(false);
      return;
    }
    const { data: t } = await supabase
      .from("tenants")
      .select("id,name,slug,logo_url,primary_color,accent_color,contact_email")
      .eq("id", mem.tenant_id)
      .maybeSingle();
    setTenant(t ?? null);
    if (t?.logo_url) {
      const { data: signed } = await supabase.storage
        .from("tenant-branding")
        .createSignedUrl(t.logo_url, 3600);
      setLogoSrc(signed?.signedUrl ?? null);
    } else {
      setLogoSrc(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Inject CSS vars
  useEffect(() => {
    if (!tenant) return;
    const root = document.documentElement;
    root.style.setProperty("--primary", hexToOklch(tenant.primary_color));
    root.style.setProperty("--accent", hexToOklch(tenant.accent_color));
    root.style.setProperty("--ring", hexToOklch(tenant.accent_color));
  }, [tenant]);

  return (
    <Ctx.Provider value={{ tenant, logoSrc, loading, refresh: load }}>{children}</Ctx.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTenant must be used within TenantProvider");
  return ctx;
}
