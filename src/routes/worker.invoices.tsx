import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RequireRole } from "@/components/auth/RequireRole";
import { supabase } from "@/integrations/supabase/client";
import { Receipt } from "lucide-react";

export const Route = createFileRoute("/worker/invoices")({
  component: () => (
    <RequireRole allow={["worker", "admin"]}>
      <WorkerInvoicesPage />
    </RequireRole>
  ),
});

type Invoice = {
  id: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  total_hours: number;
  gross_amount: number;
  cis_rate: number;
  cis_deduction: number;
  net_amount: number;
  status: string;
  created_at: string;
};

type Item = {
  id: string;
  invoice_id: string;
  hours: number;
  hourly_rate: number;
  amount: number;
  shift_id: string;
};

function WorkerInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [items, setItems] = useState<Record<string, Item[]>>({});
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });
      setInvoices((data ?? []) as Invoice[]);
    })();
  }, []);

  const toggle = async (id: string) => {
    if (open === id) return setOpen(null);
    setOpen(id);
    if (!items[id]) {
      const { data } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", id);
      setItems((m) => ({ ...m, [id]: (data ?? []) as Item[] }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-2">
        <Receipt className="w-5 h-5" />
        <h1 className="text-2xl font-bold">My invoices</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Weekly self-billed CIS invoices generated from your ended shifts.
      </p>

      <div className="space-y-3">
        {invoices.map((i) => (
          <div key={i.id} className="rounded-lg border bg-card">
            <button
              onClick={() => toggle(i.id)}
              className="w-full text-left p-4 flex justify-between items-center gap-3"
            >
              <div>
                <div className="font-mono text-xs text-muted-foreground">{i.invoice_number}</div>
                <div className="font-medium">{i.period_start} → {i.period_end}</div>
                <div className="text-xs text-muted-foreground">
                  {Number(i.total_hours).toFixed(2)} hrs · CIS {Number(i.cis_rate).toFixed(0)}%
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">£{Number(i.net_amount).toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">
                  Gross £{Number(i.gross_amount).toFixed(2)} − £{Number(i.cis_deduction).toFixed(2)}
                </div>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs uppercase bg-muted">
                  {i.status}
                </span>
              </div>
            </button>
            {open === i.id && (
              <div className="border-t p-4 bg-muted/30 text-sm">
                <table className="w-full">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left pb-2">Shift</th>
                      <th className="text-right pb-2">Hours</th>
                      <th className="text-right pb-2">Rate</th>
                      <th className="text-right pb-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(items[i.id] ?? []).map((it) => (
                      <tr key={it.id} className="border-t">
                        <td className="py-2 font-mono text-xs">{it.shift_id.slice(0, 8)}</td>
                        <td className="py-2 text-right">{Number(it.hours).toFixed(2)}</td>
                        <td className="py-2 text-right">£{Number(it.hourly_rate).toFixed(2)}</td>
                        <td className="py-2 text-right">£{Number(it.amount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
        {invoices.length === 0 && (
          <div className="text-center text-muted-foreground py-12 border rounded-lg bg-card">
            No invoices yet. They'll appear here every Monday after you complete shifts.
          </div>
        )}
      </div>
    </div>
  );
}
