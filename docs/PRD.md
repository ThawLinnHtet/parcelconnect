# ParcelConnect — Product Requirements Document

Version: 0.1 · Date: 2026-11-13 · Status: planned portfolio MVP

## 1. Product and problem

ParcelConnect is a React Native mobile portfolio project that coordinates parcel handoffs before a rider leaves. Missed recipients and unclear entrances can waste delivery attempts. The app asks whether the recipient is available, captures entrance guidance, and permits an authorized alternative receiver.

This is a demonstration product, not an operating courier business. Reduced failed deliveries is a hypothesis, not a measured claim. No real customer addresses, personal documents, payments, or operational deliveries are needed for the demo.

## 2. Goals and evidence

- Demonstrate one coherent booking-to-handoff journey on Android and iOS.
- Make recipient availability and authorized alternatives understandable.
- Demonstrate TypeScript, Expo Router, Supabase Auth/Postgres/Storage/Realtime, access policies, and backend workflows.
- Include a demo that a recruiter can explore without supplying personal details.
- Produce a README, walkthrough video, screenshots, and honest case study.

Success criteria: a reviewer can complete the seeded happy path and unavailable-recipient scenario; a second device sees status changes; unrelated users cannot access a delivery; an invalid/reused code cannot complete it. Track scenario completion and usability feedback. Do not invent business impact figures.

## 3. Users and roles

| Role | Capabilities |
| --- | --- |
| Sender | Book a parcel, select an existing demo recipient, inspect status, cancel before pickup |
| Recipient | Confirm availability, request rescheduling, add entrance guidance, authorize/revoke a receiver |
| Rider | Accept eligible work, see necessary instructions, update permitted statuses, verify a handoff |
| Trusted receiver | View a limited invitation, accept it while authenticated, view their active handoff code |

A user may have multiple delivery relationships. Access follows each delivery's participant records, not a client-selected global role. The demo switcher changes local mock perspectives only. In connected mode, use separate seeded accounts and normal authentication; changing a UI role never grants permissions.

## 4. Signature scenario

1. Sender books a parcel with fictional pickup/drop-off details and a delivery window.
2. Recipient sees an availability request and an entrance-guidance prompt.
3. Recipient becomes unavailable and nominates an existing seeded user as receiver.
4. Receiver accepts; recipient can revoke authorization before completion.
5. Rider sees that the handoff is confirmed, accepts the job, and picks up the parcel.
6. Recipient/receiver receives an out-for-delivery update.
7. Authorized receiver reads a one-time code from their own view to the rider.
8. Backend verifies it, completes the delivery once, records the event, and notifies participants.

No SMS/email invitation system is required. Seeded receiver accounts demonstrate the workflow without email or SMS delivery costs.

## 5. MVP requirements

### Authentication and demo entry

- Supabase email/password authentication; Confirm Email disabled for the portfolio project.
- Successful sign-up can create an immediate session; never require a verification-email screen.
- Explain that email ownership is not verified. Do not use email strings as proof of authorization.
- Persist sessions using the SDK-supported React Native approach; refresh on app lifecycle changes and clear user state on sign-out.
- Provide deterministic mock mode with fictional data and reset. It runs without Supabase credentials.
- Connected mode uses configured Supabase and explicit login, not embedded privileged credentials.
- Password recovery is deferred until outbound email is configured; no nonfunctional reset link.

### Booking and delivery details

- Sender enters parcel description/size, pickup/drop-off address, recipient, and requested window.
- Validate required fields and chronological windows; display dates in device locale/timezone and store timestamps in UTC.
- Show a review step; prevent duplicate submissions and offer retry on network failure.
- Pricing, if displayed, is labeled an illustrative estimate; no payment collection.
- Delivery detail contains participant-appropriate actions, current status, and a chronological event timeline.

### Availability and entrance guidance

- Availability is separate from parcel status: pending, available, unavailable, alternative_confirmed.
- Only the recipient can confirm availability or nominate a receiver; a nominated receiver must accept.
- Dispatch/pickup is blocked until availability or an accepted alternative is confirmed for the active window.
- A new delivery window invalidates the old confirmation. Rescheduling requires sender/assigned-rider acknowledgement; the app must not silently promise a new time.
- Support an entrance pin, optional entrance photo, landmark, and text instructions. Precise GPS permission is optional; allow manual pin placement/text.
- The MVP uses typed guidance; voice directions are deferred.
- Denied photo/location permission yields an actionable fallback; uploads are size/type constrained.

### Trusted receiver and handoff

- Recipient selects a seeded existing user, records authorization, and can revoke/replace it before delivery.
- Receiver sees only delivery context needed to receive the parcel; authorization is scoped and expires.
- Generate the code in backend code using a cryptographically secure generator. Use a short-lived six-digit code; provisional TTL is 15 minutes once issued, at most five failures per issuance, with server-side throttling and regeneration limits.
- Store a server-secret keyed digest of the code in a private schema; never expose it through delivery SELECTs, push payloads, logs, or rider views. Deliver the code only to the active authorized recipient/receiver through an authenticated backend endpoint.
- Validate actor, assignment, delivery status, expiry, active authorization, and attempt limit server-side. Complete status + audit event + code consumption atomically.
- Code regeneration or receiver revocation invalidates earlier codes. Handle invalid, expired, locked, revoked, and already-used codes distinctly without leaking the code.
- Final handoff requires connectivity. A client-only success state must never count as delivered.

### Delivery state machine

Normal progression: booked → accepted → picked_up → out_for_delivery → delivered.

- Only an eligible rider can accept an unassigned job; assignment must be atomic under competing requests.
- Pickup and departure require the current confirmation. No response keeps the delivery awaiting confirmation; it does not silently cancel it.
- Only the assigned rider can advance transport statuses; delivered requires successful code verification.
- Sender may cancel booked/accepted deliveries before pickup. Cancellation invalidates codes and pending receiver invitations.
- After pickup, an unavailable recipient creates a visible handoff-blocked exception; coordinate a new window/receiver, never drop the parcel automatically or mark it delivered.
- Delivered and cancelled are terminal states. Backend rejects skipped transitions, unauthorized changes, and stale duplicate actions.
- Rescheduling/availability state changes are recorded as events, not invented transport statuses.

### Notifications

- Persistent in-app inbox with read/unread, timestamp, and delivery deep link.
- Supabase Realtime refreshes the foreground view; refetch on reconnect because Realtime is not a durable queue.
- Expo Push Notifications delivers remote alerts to opted-in devices via authenticated backend dispatch.
- Trigger events: assignment, availability request, receiver invitation/acceptance/revocation, out for delivery, completion, cancellation/reschedule.
- In-app persistence is the source of truth even if permission is denied or push delivery fails.
- Store device tokens per signed-in user/device; unlink on logout/account switch, process push receipts, remove invalid tokens, and deduplicate event sends.
- Persist event/outbox first, then dispatch with bounded retries. Notification delivery failure does not roll back a successful parcel action.
- Push body contains minimal information, no address or handoff code. On tap validate session and delivery access; handle revoked access gracefully.
- Test remote push on a physical device with a development build and configured platform credentials/EAS project. Clearly label simulated alerts in mock mode.

## 6. Screens and navigation

- Welcome/demo entry and email/password sign-in/sign-up.
- Role-specific delivery list, empty state, filters, and delivery details.
- Sender booking/review/success.
- Recipient availability response, entrance guidance, receiver authorization.
- Receiver invitation acceptance and code view.
- Rider job detail, status actions, code entry/result.
- Notification inbox and account/settings (permission state, sign-out, demo reset).

Use Expo Router under src/app for thin routes. Put screen bodies in src/screens, shared UI in src/components, domain logic in src/features, clients in src/lib, and continue the template's theme in src/constants/theme.ts. Build shared tokens and accessible controls before expanding screens. Support safe areas, keyboard navigation, screen-reader labels, scalable text, and system light/dark modes. Do not communicate status by color alone.

## 7. Architecture and data plan

- Client: latest stable Expo SDK verified at setup (58), React Native, TypeScript, Expo Router, @expo/ui.
- Backend: Supabase Auth, PostgreSQL, private Storage, Realtime, Edge Functions; Expo Push service for remote notifications.
- Planned entities: profiles, deliveries, delivery_participants, availability_confirmations, receiver_authorizations, delivery_events, notifications, device_push_tokens, private handoff_challenges, private notification_outbox.
- Supabase auth.users owns identity; profile IDs reference it. Foreign keys, constrained statuses, timestamps, and indexes support participant and timeline queries.
- Define migration SQL and access policies together before enabling connected mode. Store the database schema as reviewed migrations and generate TypeScript database types.
- Enable RLS on every exposed table. Limit sender/recipient/rider/receiver access by explicit relationship and operation. Protect sensitive transition columns from direct client updates.
- Pre-assignment riders get a limited job summary; full addresses/photos become available only on authorized assignment. Use an explicitly authorized endpoint for job discovery rather than broad SELECT access.
- Entrance photos stay in private buckets with scoped storage policies and short-lived signed URLs.
- Service/secret keys belong only in backend secrets. EXPO_PUBLIC variables are public; include only project URL and publishable key.
- Authorize every Edge Function request. Derive actor from a validated session, never a submitted user ID or mutable user_metadata role.
- Server-authorized transactions enforce assignment, receiver changes, code attempt counting, state transitions, and audit events.

## 8. Scope exclusions

No payments, courier marketplace launch, admin dashboard, live routing/ETA engine, continuous background location, real SMS invitations, public tracking links, parcel insurance, production dispatch optimization, or store release is required. Initial tracking is a status timeline; any moving map marker is explicitly simulated. Basic entrance pins can be added after the core flow.

## 9. Delivery milestones

1. Foundation (current request): Expo scaffold, Git repository, project instructions, PRD, selected agent skills, baseline checks.
2. Mock demo: shared theme and role switcher; booking, availability, receiver authorization, timeline, and simulated handoff.
3. Connected backend: migrations/RLS, auth without confirmation email, private image storage, durable events and secure handoff verification.
4. Notifications: inbox/Realtime, physical-device push, deep links, denied permissions and retries.
5. Portfolio finish: accessibility review, critical-flow tests, Android/iOS walkthrough, screenshots, README and case study.

These are ordered milestones, not calendar commitments. Foundation does not imply the delivery app or hosted backend has been implemented.

## 10. Acceptance and testing

- Fresh checkout: npm ci, npm run typecheck, npm run lint, Expo dependency check, and native bundling succeed.
- Mock scenario completes and resets without backend configuration, with demo labels visible.
- Connected accounts cannot query/update another delivery, receiver authorization, device token, or photo by guessing an ID.
- Concurrent rider acceptance assigns exactly one rider; repeated handoff submission creates exactly one completion event.
- Dispatch refuses missing/currently stale availability confirmation.
- Revoked receiver/expired or reused code fails; brute-force attempts are throttled; rider cannot read codes.
- Realtime disconnect/reconnect refreshes data. Offline screens show stale data and final verification requires reconnecting.
- Denied notification/location/photo permissions preserve the core flow. Inbox survives push failures.
- Notification taps navigate correctly from foreground, background, and cold start after authentication.
- Validate substantive domain logic and RLS with focused tests; manually check native layouts, large text, and loading/error/empty states.

## 11. Risks and setup dependencies

Email confirmation disabled permits unverified addresses; restrict this posture to the portfolio environment. Untrusted users must not self-grant rider privileges. Demo perspective switching must never become a backend authorization mechanism. Push delivery timing is not guaranteed. Map-provider keys, push platform credentials, an EAS project, and a Supabase project are separate setup tasks; no secrets should be committed. Hosting/build quotas depend on the user's plans and should be checked when those features are configured.

## 12. Sources

- https://docs.expo.dev/versions/v58.0.0/
- https://docs.expo.dev/push-notifications/overview/
- https://supabase.com/docs/guides/auth/quickstarts/react-native
- https://supabase.com/docs/guides/database/postgres/row-level-security
