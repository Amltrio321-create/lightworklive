import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { RequireRole } from "@/components/auth/RequireRole";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Upload } from "lucide-react";

export const Route = createFileRoute("/admin/branding")({
  component: () => (
    <RequireRole allow={["admin"]}>
      <BrandingPage />
    </RequireRole>
  ),
});

function BrandingPage() {
  const { tenant, logoSrc, refresh } = useTenant();
  const [name, setName] = useState("");
  const [primary, setPrimary] = useState("#f97316");
  const [accent, setAccent] = useState("#facc15");
  const [contactEmail, setContactEmail] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    setName(tenant.name);
    setPrimary(tenant.primary_color);
    setAccent(tenant.accent_color);
    setContactEmail(tenant.contact_email ?? "");
  }, [tenant]);

  if (!tenant) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto p-6">Loading…</div>
      </AppShell>
    );
  }

  async function handleLogo(file: File) {
    if (!tenant) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${tenant.id}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("tenant-branding")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase
        .from("tenants")
        .update({ logo_url: path })
        .eq("id", tenant.id);
      if (dbErr) throw dbErr;
      await refresh();
      toast.success("Logo updated");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!tenant) return;
    setSaving(true);
    const { error } = await supabase
      .from("tenants")
      .update({
        name,
        primary_color: primary,
        accent_color: accent,
        contact_email: contactEmail || null,
      })
      .eq("id", tenant.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Branding saved");
      refresh();
    }
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin"><ArrowLeft className="w-4 h-4 mr-1" /> Admin</Link>
          </Button>
          <h1 className="text-2xl font-bold">Branding</h1>
        </div>

        <Card>
          <CardHeader><CardTitle>Logo</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-6">
            <div className="w-32 h-32 border rounded flex items-center justify-center bg-muted/30 overflow-hidden">
              {logoSrc ? (
                <img src={logoSrc} alt="Logo" className="max-w-full max-h-full object-contain" />
              ) : (
                <span className="text-xs text-muted-foreground">No logo</span>
              )}
            </div>
            <div>
              <Label htmlFor="logo-input" className="cursor-pointer">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90">
                  <Upload className="w-4 h-4" />
                  {uploading ? "Uploading…" : "Upload logo"}
                </div>
              </Label>
              <input
                id="logo-input"
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleLogo(f);
                }}
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground mt-2">PNG, JPG, SVG, WEBP. Max ~2MB.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Company details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Company name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="email">Contact email</Label>
              <Input id="email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Colours</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="w-14 h-10 rounded border" />
              <div className="flex-1">
                <Label>Primary</Label>
                <Input value={primary} onChange={(e) => setPrimary(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="w-14 h-10 rounded border" />
              <div className="flex-1">
                <Label>Accent</Label>
                <Input value={accent} onChange={(e) => setAccent(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <div className="flex-1 h-12 rounded" style={{ background: primary }} />
              <div className="flex-1 h-12 rounded" style={{ background: accent }} />
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </AppShell>
  );
}
