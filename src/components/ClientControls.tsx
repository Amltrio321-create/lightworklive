import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload, Copy, Plus, Hash, ImageIcon } from "lucide-react";

type Operative = { id: string; full_name: string | null; trade: string | null };
type Site = { id: string; name: string };

/** Card shown to clients with their unique 4-digit code and logo uploader. */
export function ClientBrandingCard() {
  const { user } = useAuth();
  const { clientCode, logoSrc, refresh } = useTenant();
  const [uploading, setUploading] = useState(false);

  const copyCode = async () => {
    if (!clientCode) return;
    await navigator.clipboard.writeText(clientCode);
    toast.success("Client ID copied");
  };

  const onFile = async (file: File) => {
    if (!user) return;
    if (file.size > 2 * 1024 * 1024) {
      return toast.error("Logo must be under 2 MB");
    }
    if (!["image/png", "image/jpeg", "image/svg+xml"].includes(file.type)) {
      return toast.error("Use PNG, JPEG or SVG");
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
    const path = `clients/${user.id}/logo-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("tenant-branding")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setUploading(false);
      return toast.error(upErr.message);
    }
    const { error: updErr } = await supabase
      .from("profiles")
      .update({ client_logo_url: path })
      .eq("id", user.id);
    setUploading(false);
    if (updErr) return toast.error(updErr.message);
    toast.success("Logo updated");
    refresh();
  };

  return (
    <section className="rounded-lg border bg-card p-4 grid gap-4 sm:grid-cols-[1fr_auto] items-center">
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <Hash className="w-3 h-3" /> Your Client ID
        </div>
        <div className="flex items-center gap-3">
          <code className="font-mono text-3xl font-bold tracking-widest bg-muted px-3 py-1 rounded">
            {clientCode ?? "—"}
          </code>
          <Button variant="outline" size="sm" onClick={copyCode}>
            <Copy className="w-3 h-3 mr-1" /> Copy
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Share this 4-digit code with your operatives — they must enter it when signing up so they link to you.
        </p>
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Your logo
        </div>
        <div className="h-20 w-32 rounded border bg-background flex items-center justify-center overflow-hidden">
          {logoSrc ? (
            <img src={logoSrc} alt="Your logo" className="max-h-full max-w-full object-contain" />
          ) : (
            <ImageIcon className="w-6 h-6 text-muted-foreground" />
          )}
        </div>
        <label className="cursor-pointer">
          <input
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
          />
          <span className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded border bg-background hover:bg-muted">
            <Upload className="w-3 h-3" /> {uploading ? "Uploading…" : "Upload logo"}
          </span>
        </label>
      </div>
    </section>
  );
}

/** Dialog letting clients schedule a shift for one of their operatives. */
export function ClientCreateShiftDialog({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [operatives, setOperatives] = useState<Operative[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [workerId, setWorkerId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [start, setStart] = useState("");
  const [rate, setRate] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: ops }, { data: ss }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, trade")
        .eq("client_id", user.id)
        .order("full_name"),
      supabase.from("sites").select("id, name").eq("client_id", user.id).order("name"),
    ]);
    setOperatives((ops ?? []) as Operative[]);
    setSites((ss ?? []) as Site[]);
  }, [user]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerId || !siteId || !start) return toast.error("Fill all required fields");
    setBusy(true);
    const { error } = await supabase.from("shifts").insert({
      worker_id: workerId,
      site_id: siteId,
      scheduled_start: new Date(start).toISOString(),
      hourly_rate: rate ? Number(rate) : null,
      status: "scheduled",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Shift scheduled");
    setWorkerId("");
    setSiteId("");
    setStart("");
    setRate("");
    setOpen(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-1" /> Schedule shift
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule a shift</DialogTitle>
        </DialogHeader>
        {operatives.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No operatives linked yet. Share your 4-digit Client ID so they can sign up and link to you.
          </p>
        ) : sites.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add a site first.
          </p>
        ) : (
          <form onSubmit={create} className="space-y-3">
            <div className="space-y-1">
              <Label>Operative</Label>
              <Select value={workerId} onValueChange={setWorkerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select operative" />
                </SelectTrigger>
                <SelectContent>
                  {operatives.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.full_name ?? o.id.slice(0, 8)}
                      {o.trade ? ` — ${o.trade}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Site</Label>
              <Select value={siteId} onValueChange={setSiteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Scheduled start</Label>
              <Input
                type="datetime-local"
                required
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Hourly rate (£, optional)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 18.50"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={busy}>
                {busy ? "Scheduling…" : "Schedule shift"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** List of operatives linked to this client. */
export function ClientOperativesList() {
  const { user } = useAuth();
  const [ops, setOps] = useState<Operative[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, trade")
        .eq("client_id", user.id)
        .order("full_name");
      setOps((data ?? []) as Operative[]);
    })();
  }, [user]);

  if (ops.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No operatives linked yet. Share your Client ID so they can sign up and link to you.
      </div>
    );
  }
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {ops.map((o) => (
        <li key={o.id} className="rounded-md border bg-card p-3">
          <div className="font-medium">{o.full_name ?? "Unnamed"}</div>
          {o.trade && <div className="text-xs text-muted-foreground">{o.trade}</div>}
        </li>
      ))}
    </ul>
  );
}
