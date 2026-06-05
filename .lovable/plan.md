This is a large batch. I'll deliver in the order you picked, but flag up front that **full multi-tenancy** is a major change — it touches every table, every RLS policy, and signup/onboarding. I'll do it last and keep it backwards compatible so existing data keeps working.

## 1. Shift details drawer

- Make each shift card on `/client` clickable (active + scheduled).
- New `<ShiftDetailsSheet>` (right-side sheet) showing:
  - Worker name, phone, qualifications
  - Site name + address, scheduled vs actual times, job number
  - Latest photo (large) + caption + timestamp
  - GPS history: small map with full polyline of pings + last-seen time + distance from site
  - Hours on site (computed from first/last ping)
- Reused on `/admin` and `/client/live` so the same drawer works everywhere.

## 2. Client invoices view + GPS verification

- New route `/client/invoices` — lists invoices for shifts at the client's sites (read-only).
- Per invoice line: claimed hours, **GPS-verified hours**, variance %, status pill (OK / Warning if >10% diff / Missing GPS).
- Server fn `getClientInvoices` (admin client, scoped by site ownership) returns aggregated data.
- Add nav link in `AppShell` for clients.

### GPS hours calc

A SQL helper `gps_hours_for_shift(shift_id)` → returns hours between first and last ping for that shift (gap-tolerant: splits on >20 min gaps). Used by both the invoice view and admin generation.

## 3. Job numbers + auto-invoice checks

- Add `job_number` column to `shifts` (text, unique). Format `JOB-YYYYMMDD-<6char>`.
- DB trigger: when `shifts.status` flips to `ended`, auto-assign `job_number` if null.
- `invoice_items` gets `job_number`, `gps_hours`, `variance_pct`, `check_status` ('ok' | 'warning' | 'missing_gps').
- Rework `generate_weekly_invoices` to populate the new fields and run checks (warn-only).
- Worker "End shift" UI shows the assigned job number on completion.

## 4. White-label multi-tenant (biggest piece)

New `tenants` table (id, name, slug, logo_url, primary_color, accent_color, contact_email, created_at). Every existing data table gets `tenant_id uuid not null`. Backfill existing rows into a default "Light Work Live" tenant.

- New role `super_admin` (you) — can see/manage all tenants.
- `admin` role is now scoped to a single tenant.
- All RLS policies rewritten to add `tenant_id = current_tenant()` check via a `current_tenant()` security-definer function reading from `user_roles.tenant_id`.
- Signup gets a tenant slug (or picks via subdomain-style query param `?t=acme`); users belong to one tenant.
- New `/admin/branding` page: logo upload (storage bucket `tenant-branding`), name, primary/accent colour pickers → writes CSS variables at runtime via a `<TenantThemeProvider>` in `__root.tsx`.
- New `/super-admin/tenants` page for you to create/edit tenants.

### Data migration risk

Backfilling `tenant_id` on `sites`, `shifts`, `invoices`, `profiles`, `user_roles`, `location_pings`, `photo_updates`, `invoice_items`, `worker_qualifications` is irreversible. I'll bundle it into a single migration with a default tenant so nothing breaks. All existing Amphibious TM data stays put under that tenant.

## Technical notes

- New tables: `tenants`, plus `tenant_id` on 9 existing tables.
- New migrations: ~3 (job numbers + trigger; tenants + backfill + RLS rewrite; invoice check columns).
- New routes: `/client/invoices`, `/admin/branding`, `/super-admin/tenants`.
- New components: `ShiftDetailsSheet`, `TenantThemeProvider`, `BrandingForm`.
- New server fns: `getClientInvoices`, `getShiftDetails`, `updateTenantBranding`, `createTenant`.
- Reuses existing `MapEmbed` (extended to accept a polyline of points).

## Suggested order of approval

I can ship 1–3 in one pass (~1 batch of edits + 2 migrations), then do **4 multi-tenant separately** because it rewrites RLS across the whole DB and is the most likely place to introduce regressions. Want me to proceed with 1–3 now and tackle 4 in the next turn?