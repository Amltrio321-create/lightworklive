import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RequireRole } from "@/components/auth/RequireRole";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Receipt, AlertTriangle, CheckCircle2, HelpCircle, ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/client/invoices")({
  component: () => (
    <RequireRole allow={["client"]}>
      <ClientInvoicesPage />
    </RequireRole>
  ),
});

type InvoiceItem = {
  id: string;
  invoice_id: string;
  shift_id: string;
  hours: number;
  hourly_rate: number;
  amount: number;
  job_number: string | null;
  gps_hours: number | null;
  variance_pct: number | null;
  check_status: string | null;
  client_approval: string | null;
  shifts: {
    id: string;
    started_at: string | null;
    ended_at: string | null;
    site_id: string;
    sites: { name: string; client_id: string } | null;
    profiles: { full_name: string | null } | null;
  } | null;
  invoices: {
    invoice_number: string;
    period_start: string;
    period_end: string;
    status: string;
  } | null;
};

function ClientInvoicesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Get client's site ids first
      const { data: sites } = await supabase.from("sites").select("id").eq("client_id", user.id);
      const siteIds = (sites ?? []).map((s) => s.id);
      if (siteIds.length === 0) {
        setLoading(false);
        return;
      }
      // Get invoice items where shift's site belongs to this client
      const { data: shifts } = await supabase
        .from("shifts")
        .select("id, started_at, ended_at, site_id, worker_id, sites(name, client_id)")
        .in("site_id", siteIds);
      const shiftIds = (shifts ?? []).map((s) => s.id);
      if (shiftIds.length === 0) {
        setLoading(false);
        return;
      }
      const { data: rawItems } = await supabase
        .from("invoice_items")
        .select("*, invoices(invoice_number, period_start, period_end, status)")
        .in("shift_id", shiftIds)
        .order("created_at", { ascending: false });

      // Hydrate worker names
      const workerIds = Array.from(new Set((shifts ?? []).map((s: any) => s.worker_id)));
      const { data: profs } = workerIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", workerIds)
        : { data: [] as any };
      const nameById = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
      const shiftById = new Map((shifts ?? []).map((s: any) => [s.id, s]));

      const hydrated = (rawItems ?? []).map((it: any) => {
        const sh = shiftById.get(it.shift_id);
        return {
          ...it,
          shifts: sh
            ? {
                id: sh.id,
                started_at: sh.started_at,
                ended_at: sh.ended_at,
                site_id: sh.site_id,
                sites: sh.sites,
                profiles: { full_name: nameById.get(sh.worker_id) ?? null },
              }
            : null,
        };
      });
      setItems(hydrated as InvoiceItem[]);
      setLoading(false);
    })();
  }, [user]);

  const setApproval = async (itemId: string, approval: "approved" | "rejected" | "pending") => {
    const { error } = await supabase
      .from("invoice_items")
      .update({ client_approval: approval })
      .eq("id", itemId);
    if (error) return toast.error(error.message);
    setItems((arr) => arr.map((it) => (it.id === itemId ? { ...it, client_approval: approval } : it)));
    toast.success(approval === "pending" ? "Approval reset" : `Marked ${approval}`);
  };

  const byInvoice = items.reduce<Record<string, InvoiceItem[]>>((acc, it) => {
    (acc[it.invoice_id] = acc[it.invoice_id] || []).push(it);
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/client">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Receipt className="w-6 h-6" /> Invoices
        </h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Hours claimed by workers on your sites, cross-checked against GPS-verified on-site time.
        Discrepancies over 10% are flagged as warnings.
      </p>

      {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {!loading && items.length === 0 && (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          No invoiced shifts yet.
        </div>
      )}

      <div className="space-y-6">
        {Object.entries(byInvoice).map(([invId, group]) => {
          const inv = group[0].invoices;
          const totalClaimed = group.reduce((s, i) => s + Number(i.hours), 0);
          const totalGps = group.reduce((s, i) => s + Number(i.gps_hours ?? 0), 0);
          const totalAmt = group.reduce((s, i) => s + Number(i.amount), 0);
          return (
            <article key={invId} className="rounded-lg border bg-card overflow-hidden">
              <header className="p-4 border-b bg-muted/30 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-bold">{inv?.invoice_number}</div>
                  <div className="text-xs text-muted-foreground">
                    {inv?.period_start} → {inv?.period_end} · status {inv?.status}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div>Claimed: <strong>{totalClaimed.toFixed(2)}h</strong></div>
                  <div className="text-muted-foreground text-xs">GPS verified: {totalGps.toFixed(2)}h · Total £{totalAmt.toFixed(2)}</div>
                </div>
              </header>
              <div className="divide-y">
                {group.map((it) => (
                  <div key={it.id} className="p-4 grid grid-cols-12 gap-3 text-sm items-center">
                    <div className="col-span-12 sm:col-span-4">
                      <div className="font-mono text-xs text-muted-foreground">{it.job_number ?? "—"}</div>
                      <div className="font-medium">{it.shifts?.profiles?.full_name ?? "Worker"}</div>
                      <div className="text-xs text-muted-foreground">{it.shifts?.sites?.name}</div>
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <div className="text-xs text-muted-foreground">Claimed</div>
                      <div className="font-semibold">{Number(it.hours).toFixed(2)}h</div>
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <div className="text-xs text-muted-foreground">GPS</div>
                      <div className="font-semibold">
                        {it.gps_hours !== null ? `${Number(it.gps_hours).toFixed(2)}h` : "—"}
                      </div>
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <div className="text-xs text-muted-foreground">Variance</div>
                      <div className="font-semibold">
                        {it.variance_pct !== null ? `${Number(it.variance_pct).toFixed(1)}%` : "—"}
                      </div>
                    </div>
                    <div className="col-span-12 sm:col-span-2 flex flex-col items-end gap-1.5">
                      <StatusPill status={it.check_status} />
                      <ApprovalControls
                        approval={it.client_approval}
                        onChange={(a) => setApproval(it.id, a)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string | null }) {
  if (status === "warning") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-destructive/10 text-destructive">
        <AlertTriangle className="w-3 h-3" /> Hours mismatch
      </span>
    );
  }
  if (status === "missing_gps") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-muted text-muted-foreground">
        <HelpCircle className="w-3 h-3" /> No GPS
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-success/10 text-success">
      <CheckCircle2 className="w-3 h-3" /> Verified
    </span>
  );
}

function ApprovalControls({
  approval,
  onChange,
}: {
  approval: string | null;
  onChange: (a: "approved" | "rejected" | "pending") => void;
}) {
  if (approval === "approved") {
    return (
      <button
        onClick={() => onChange("pending")}
        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-success text-success-foreground hover:opacity-80"
        title="Click to reset"
      >
        <ThumbsUp className="w-3 h-3" /> Approved
      </button>
    );
  }
  if (approval === "rejected") {
    return (
      <button
        onClick={() => onChange("pending")}
        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-destructive text-destructive-foreground hover:opacity-80"
        title="Click to reset"
      >
        <ThumbsDown className="w-3 h-3" /> Rejected
      </button>
    );
  }
  return (
    <div className="flex gap-1">
      <button
        onClick={() => onChange("approved")}
        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border border-success text-success hover:bg-success/10"
      >
        <ThumbsUp className="w-3 h-3" /> Approve
      </button>
      <button
        onClick={() => onChange("rejected")}
        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border border-destructive text-destructive hover:bg-destructive/10"
      >
        <ThumbsDown className="w-3 h-3" /> Reject
      </button>
    </div>
  );
}
