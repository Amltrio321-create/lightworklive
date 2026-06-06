# Multi-Tenant White-Label

Turn the app into a multi-tenant platform where each tenant (company) has isolated data, users, and branding (logo, name, colours). One "Light Work Live" tenant becomes the default; existing data is backfilled to it.

## 1. Database (single migration)

**New tables**
- `tenants` — `id`, `name`, `slug` (unique), `logo_url`, `primary_color`, `accent_color`, `contact_email`.
- `tenant_members` — `tenant_id`, `user_id`, unique pair. Decides which tenant a user belongs to (workers/clients/admins all use this).

**Role change**
- Add `super_admin` to `app_role` enum. `super_admin` sees/manages all tenants. `admin` is scoped to their own tenant via `tenant_members`.

**Tenant scoping**
- Add `tenant_id uuid not null` to: `profiles`, `sites`, `shifts`, `location_pings`, `photo_updates`, `worker_qualifications`, `invoices`, `invoice_items`.
- Seed a default tenant ("Light Work Live") and backfill every existing row to it. Then enforce NOT NULL.

**Security-definer helpers** (in `private` schema)
- `current_tenant_id()` — returns the caller's `tenant_id` from `tenant_members`.
- `is_super_admin()` — wraps `has_role(auth.uid(), 'super_admin')`.

**RLS rewrite**
- Every existing policy gets an extra `tenant_id = private.current_tenant_id()` clause (super_admin bypasses).
- `tenants`: super_admin manages all; members read their own row; admins update their own tenant's branding.
- `tenant_members`: super_admin manages; users read own row.

**Storage**
- New public bucket `tenant-branding` for logo uploads. RLS: tenant admins write to `{tenant_id}/...`; everyone reads.

## 2. App-level theming

- New `<TenantThemeProvider>` in `__root.tsx` — fetches current tenant on auth, injects `--primary` / `--accent` / logo URL / name into CSS variables and React context.
- `AppShell` reads tenant logo + name from context instead of the static `logo.png` import.
- `<head>` title updates to `{tenantName} — Workforce`.

## 3. New routes / pages

- `/admin/branding` (tenant admin) — upload logo, edit name + colour pickers, live preview.
- `/super-admin` (super_admin only) — list tenants, create tenant, assign users, switch impersonation.
- Existing admin pages get a small "Tenant: X" badge in the header.

## 4. Sign-up flow

- Sign-up gains a tenant slug field (e.g. `?tenant=acme` query param or dropdown of public tenants). New users are inserted into `tenant_members` for that tenant automatically by a trigger on `auth.users` → `profiles`.
- Super-admins can move users between tenants from `/super-admin`.

## 5. Risks & order

This is the biggest change to the DB so far — adding NOT NULL `tenant_id` to 8 tables and rewriting ~25 RLS policies. Backfill is irreversible.

Order:
1. Migration (tables + backfill + RLS rewrite).
2. Types regen + theme provider + AppShell.
3. Branding page.
4. Super-admin page + sign-up flow.

## Technical notes

- `current_tenant_id()` is `STABLE SECURITY DEFINER` to avoid RLS recursion on `tenant_members`.
- Bucket name `tenant-branding`, max 2MB, image/png|jpeg|svg+xml.
- CSS vars written as `oklch()` from a hex→oklch helper on save (keeps the design-token contract).
- Default tenant slug: `lightworklive`. All existing users mapped to it.

Approve and I'll start with the migration.
