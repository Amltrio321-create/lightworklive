import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const UTR_RE = /^\d{10}K?$/i;

export const sendInvoiceEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ invoiceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // Admin-only
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Only admins can send invoices");

    // Load invoice + worker profile
    const { data: invoice, error: invErr } = await supabaseAdmin
      .from("invoices")
      .select("*")
      .eq("id", data.invoiceId)
      .single();
    if (invErr || !invoice) throw new Error("Invoice not found");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, utr_number")
      .eq("id", invoice.worker_id)
      .single();

    const utr = (profile?.utr_number ?? "").replace(/\s+/g, "");
    if (!utr || !UTR_RE.test(utr)) {
      throw new Error(
        `Worker ${profile?.full_name ?? invoice.worker_id} has no valid UTR. ` +
          `Add a 10-digit UTR (optional trailing K) before sending.`,
      );
    }

    // Resolve worker email via auth admin
    const { data: userRes, error: userErr } =
      await supabaseAdmin.auth.admin.getUserById(invoice.worker_id);
    if (userErr || !userRes?.user?.email) {
      throw new Error("Worker has no email address on file");
    }
    const recipient = userRes.user.email;

    // Line items for the body
    const { data: items } = await supabaseAdmin
      .from("invoice_items")
      .select("hours, hourly_rate, amount, shift_id")
      .eq("invoice_id", invoice.id);

    // Try to send via Lovable Email API. If no domain is configured, the
    // call will fail — we surface that to the admin without crashing the flow.
    const apiKey = process.env.LOVABLE_API_KEY;
    let emailDelivered = false;
    let deliveryNote = "";

    const subject = `Invoice ${invoice.invoice_number} — ${invoice.period_start} to ${invoice.period_end}`;
    const html = renderInvoiceHtml({
      invoice,
      items: items ?? [],
      workerName: profile?.full_name ?? "Worker",
      utr,
      recipient,
    });

    if (apiKey) {
      try {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/email/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            to: recipient,
            subject,
            html,
          }),
        });
        if (res.ok) {
          emailDelivered = true;
        } else {
          deliveryNote = `Email API returned ${res.status}. Set up an email sender domain in Cloud → Emails to deliver invoices.`;
        }
      } catch (e) {
        deliveryNote =
          (e as Error).message +
          " — set up an email sender domain in Cloud → Emails.";
      }
    } else {
      deliveryNote = "LOVABLE_API_KEY not configured.";
    }

    // Always mark as sent so admin can track outbox state, even if delivery
    // requires email-domain setup. Status is reversible from the dropdown.
    await supabaseAdmin
      .from("invoices")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", invoice.id);

    return {
      success: true,
      recipient,
      emailDelivered,
      deliveryNote,
      invoiceNumber: invoice.invoice_number,
    };
  });

function renderInvoiceHtml(args: {
  invoice: any;
  items: { hours: number; hourly_rate: number; amount: number; shift_id: string }[];
  workerName: string;
  utr: string;
  recipient: string;
}) {
  const { invoice, items, workerName, utr } = args;
  const rows = items
    .map(
      (i) =>
        `<tr><td style="padding:6px;border-bottom:1px solid #eee">${Number(i.hours).toFixed(2)}h</td><td style="padding:6px;border-bottom:1px solid #eee">£${Number(i.hourly_rate).toFixed(2)}</td><td style="padding:6px;border-bottom:1px solid #eee;text-align:right">£${Number(i.amount).toFixed(2)}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#111;background:#fff;padding:24px">
<h2 style="margin:0 0 8px">Invoice ${invoice.invoice_number}</h2>
<p style="color:#555;margin:0 0 16px">Period: ${invoice.period_start} → ${invoice.period_end}</p>
<p><strong>${workerName}</strong><br/>UTR: ${utr}</p>
<table style="width:100%;border-collapse:collapse;margin-top:12px">
  <thead><tr><th style="text-align:left;padding:6px;border-bottom:2px solid #111">Hours</th><th style="text-align:left;padding:6px;border-bottom:2px solid #111">Rate</th><th style="text-align:right;padding:6px;border-bottom:2px solid #111">Amount</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<table style="width:100%;margin-top:16px">
  <tr><td>Total hours</td><td style="text-align:right">${Number(invoice.total_hours).toFixed(2)}</td></tr>
  <tr><td>Gross</td><td style="text-align:right">£${Number(invoice.gross_amount).toFixed(2)}</td></tr>
  <tr><td>CIS deduction (${Number(invoice.cis_rate).toFixed(0)}%)</td><td style="text-align:right">−£${Number(invoice.cis_deduction).toFixed(2)}</td></tr>
  <tr><td><strong>Net payable</strong></td><td style="text-align:right"><strong>£${Number(invoice.net_amount).toFixed(2)}</strong></td></tr>
</table>
</body></html>`;
}
