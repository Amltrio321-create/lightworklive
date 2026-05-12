# Role-specific signup fields

Expand the existing signup form on `/login` so that, after the user picks Worker or Client, they see a tailored set of fields. All data is captured at signup time and persisted into `profiles` (and a first `sites` row for clients) via the existing `handle_new_user` trigger plus a follow-up insert.

## Fields by role

### Shared (both roles)
- Full name *
- Email *
- Password *
- Phone *

### Worker-only
- Worker ID / reference (optional — their own internal ID, e.g. CSCS card number)
- Trade / role (select: Traffic Marshal, Labourer, Banksman, Skilled Operative, Other)
- Right-to-work confirmed (checkbox, required)

### Client-only
- Company name *
- Company address (optional)
- First site name * (e.g. "M25 J7 works")
- First site address (optional)

The form already pre-selects the role from the homepage portal (`?role=worker|client`). The role radio stays visible so it can be changed before submitting.

## UI

- One signup form on `/login` (existing `Tabs` "Create account").
- After the role radio, conditionally render a `<WorkerFields>` or `<ClientFields>` block.
- Mobile-first single-column layout, using existing shadcn `Input`, `Label`, `Select`, `Checkbox`.
- Inline `zod` validation with a single error summary at the top on submit.

## Data flow

1. `supabase.auth.signUp()` is called with all fields packed into `options.data` (user metadata).
2. The existing `handle_new_user` trigger writes `full_name`, `phone`, `company_name` and the role into `profiles` / `user_roles` — so it just needs to also pick up the new metadata keys.
3. After signup succeeds, the client-side code does a follow-up insert into `sites` for clients (using the new session) so RLS allows it.

## Database changes (single migration)

Add nullable columns to `profiles`:
- `worker_ref text` — worker's own ID/reference
- `trade text` — worker trade
- `right_to_work boolean default false`
- `company_address text`

Update `handle_new_user` trigger to also read these from `new.raw_user_meta_data` and insert them into `profiles`.

No RLS changes needed — existing policies cover users updating their own profile and clients inserting their own sites.

## Files

**Edited**
- `src/routes/login.tsx` — expand signup state + form, conditional role-specific blocks, post-signup `sites` insert for clients, zod validation.

**New (optional split for tidiness)**
- `src/components/auth/WorkerSignupFields.tsx`
- `src/components/auth/ClientSignupFields.tsx`

**Migration**
- Add columns to `profiles`, update `handle_new_user` function.

## Out of scope

- A multi-step wizard / progress bar (keep it one form).
- Document upload (CSCS photo, insurance) — can be a later step.
- Admin approval workflow.
