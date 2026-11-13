# Supabase backend setup

The backend PR adds migrations and two trust boundaries: `delivery-api` validates Supabase Auth sessions before calling the service-role-only delivery transaction, and the database enforces participant access and state changes. The repository does not contain a hosted Supabase project or credentials.

## Local setup

1. Install the Supabase CLI and Docker, then run `supabase start` from the repository root.
2. Apply the migrations with `supabase db reset`. The Auth trigger creates a profile for each new account. For portfolio signup, Confirm Email is disabled in `supabase/config.toml`.
3. Set mobile `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in an ignored `.env` file. These values are public client configuration; never use a service-role key here.
4. Set Edge Function secrets `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `HANDOFF_HMAC_SECRET` (at least 32 random characters). Then serve or deploy `delivery-api` with gateway JWT verification disabled: the function validates each bearer token against Auth itself.
5. Open the app's Account tab, choose Connect a Supabase account, and sign in. Rider permission comes from `profiles.is_rider`, provisioned by a trusted administrator; it cannot be selected by the client.

The client remains in local demo mode until the user explicitly connects. A failed connected request never falls back to mock data.

## Security and handoff

All exposed tables have RLS. Authenticated clients have read-only table grants; mutations go through `delivery_api`, which is executable only by `service_role`. The Edge Function derives the actor from validated Auth, strips caller-supplied identity fields, and does not log request bodies. Handoff codes are generated on the server, reduced to HMAC-SHA256 digests before database storage, expire no later than the delivery window, and lock after five failed attempts. The rider never receives the plaintext code. The database transaction checks one-time consumption and idempotency under row locks.

Entrance photos use the private `entrance-photos` bucket and participant Storage policies. Accepted receivers receive a sanitized delivery projection that omits the sender's pickup address and coordinates. `notification_claim_batch` leases outbox work with `SKIP LOCKED`; the separate push worker is added by the notifications PR.

## Tests and limits

Run the database assertions with `python3 supabase/tests/run.py` (Docker required) and the pure Edge Function tests with `node --experimental-strip-types --test supabase/tests/edge.test.mts`. The database test uses disposable PostgreSQL with small Auth and Storage shims, so it checks SQL, RLS, and transaction behavior without claiming hosted GoTrue or Storage validation. A configured Supabase project is still needed to test Auth, Edge deployment, Storage, and Realtime end to end.
