Plan to fix “Sites not saving”

1. Add safe database helper functions
   - Add `is_site_client(site_id, user_id)` to check whether a site belongs to a client.
   - Add `worker_assigned_to_site(site_id, user_id)` to check whether a worker has shifts at a site.
   - Both will be `SECURITY DEFINER` functions so they do not trigger RLS recursion.

2. Replace the recursive policies
   - Replace `client reads shifts at own sites`, which currently queries `sites` from a `shifts` policy.
   - Replace `workers read sites of their shifts`, which currently queries `shifts` from a `sites` policy.
   - Keep existing admin, client-owned-site, and worker-owned-shift access intact.

3. Validate the fix
   - Confirm existing saved sites load again.
   - Confirm creating a new site still inserts successfully and appears immediately after saving.
   - Confirm admin dashboard shift/site counts stop failing with the same recursion error.

Technical detail: the insert is already succeeding with status `201`; the issue is the follow-up `sites` and `shifts` reads fail with `infinite recursion detected in policy for relation "sites"`, so the site looks like it did not save even though it did.