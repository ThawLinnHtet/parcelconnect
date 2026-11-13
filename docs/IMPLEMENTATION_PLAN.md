# ParcelConnect implementation plan

Date: 2026-11-13
Status: planned implementation; documentation only

## Goal and current baseline

Deliver a portfolio app in which a reviewer can book a parcel, respond as the recipient, authorize a trusted receiver, complete the handoff as a rider, and see the resulting notifications. Keep a clearly labeled mock demo available without backend credentials.

Already implemented:

- Expo SDK 58, TypeScript, Expo Router, and the five selected Expo skills.
- Approved teal light/dark tokens in `src/constants/theme.ts`.
- Shared `AppText` and `StatusLabel`, an appearance provider, and an interactive design gallery at `/explore`.
- PRD, design documentation, and browser screenshots.
- Successful lint/type checks, browser gallery interactions, and Android/iOS/web bundle exports. Native device behavior remains unverified.

Still missing: product navigation, domain model, persistent delivery records, authentication, backend authorization, secure handoff codes, photos/maps, notification inbox, and push notifications. The current gallery's local state is a specimen, not the delivery model.

Requirements: [PRD](PRD.md). Visual reference: [DESIGN.md](../DESIGN.md). Coding rules: [AGENTS.md](../AGENTS.md).

## Build sequence

| Milestone | Deliverable | Depends on | Completion evidence |
| --- | --- | --- | --- |
| 1 | Domain contracts and deterministic mock data | Existing foundation | State-transition and role-rule tests pass |
| 2 | Product shell, delivery list, booking and details | 1 | Sender can create and inspect a mock parcel |
| 3 | Complete mock coordination and handoff | 2 | Both portfolio scenarios run end to end and reset |
| 4 | Supabase foundation, Auth and access policies | Stable contracts from 1; integrate after 3 | Seeded accounts work and access-denial tests pass |
| 5 | Connected delivery commands and secure verification | 4 | Database-backed handoff and concurrency tests pass |
| 6 | Entrance media, pin selection and Realtime | 5 | Private media and two-session updates work |
| 7 | Durable inbox and remote notifications | Event contracts from 5; 6 for foreground updates | Inbox survives failures; push tested on hardware |
| 8 | Native quality pass and portfolio delivery | 3 and connected milestones | Recorded native scenarios, documented limitations, reproducible setup |

Finish each milestone with a usable demo and a focused commit. These are dependency milestones, not calendar estimates. Do not provision hosted services or install every planned package during the planning step.

## Milestone 1: domain contracts and mock data

Tasks:

- [ ] Create typed delivery, participant, time-window, availability, receiver-authorization, event, and notification contracts under `src/features/`.
- [ ] Model transport and availability independently. Transport is `booked → accepted → picked_up → out_for_delivery → delivered`, with pre-pickup cancellation. Availability has its own pending/available/unavailable/alternative-confirmed state.
- [ ] Define allowed actions by actor, assignment, current status, authorization, and active window. A window revision invalidates older availability confirmation.
- [ ] Build a small typed data gateway for the operations screens actually need. Start with a deterministic in-memory implementation; keep backend details out of screen bodies.
- [ ] Seed fictional sender, recipient, rider, receiver, and unrelated user identities, parcels, and timeline events. Add a reset that restores the same scenario.
- [ ] Represent offline, pending, and failure states explicitly. A mock operation must not silently become a real backend operation.
- [ ] Add focused tests for permitted/rejected transitions, stale confirmations, receiver acceptance/revocation, and terminal-state behavior. Use a small domain test setup; no snapshot suite for static styling.

Acceptance: pure domain rules are testable without rendering a screen; changing the mock perspective cannot mutate the connected authentication identity; no unavailable/no-response state automatically becomes cancelled or delivered.

Suggested commit: `Define delivery domain and deterministic demo gateway`.

## Milestone 2: product shell and sender journey

Tasks:

- [ ] Replace the starter Home content with welcome/demo entry and the product shell. Keep the token gallery accessible from a development/demo menu; move it deliberately to `/design-system` and preserve `/explore` as a redirect when navigation changes.
- [ ] Add top-level Deliveries, Notifications, and Account destinations. Notifications can initially have an honest empty state; do not present a working push service yet.
- [ ] Add a clearly labeled mock perspective switcher. Connected mode will use account sessions, not this switcher as authorization.
- [ ] Build a delivery list using a virtualized list, with current/completed filters and genuine loading/empty/error states.
- [ ] Implement booking: pickup, drop-off, existing demo recipient, parcel details, requested time window, review, and confirmation. Validate fields and prevent duplicate submissions.
- [ ] Implement delivery details with status, requested window, participant-appropriate actions, route summary, entrance instructions, and event timeline.
- [ ] Reuse existing tokens and text/status primitives. Consult `@expo/ui` before adding form or control libraries. Preserve native navigation, safe areas, keyboard access, and system text scaling.
- [ ] Perform the first Android/iOS runtime smoke checks as soon as the shell exists; record unavailable device coverage explicitly.

Acceptance: a sender can create a fictional booking, find it in the list, reopen it, and navigate back without losing the data during the current demo session. Long addresses and validation messages remain readable. Locale-aware display does not change UTC storage semantics.

Suggested commit: `Build delivery navigation and mock sender booking`.

## Milestone 3: complete mock handoff

Tasks:

- [ ] Recipient: confirm availability, mark unavailable, request another window, and edit entrance text.
- [ ] Receiver: nominate an existing seeded account, accept/reject the invitation, show pending acceptance, and revoke/replace authorization.
- [ ] Rescheduling: represent the request separately from the active window; require the appropriate sender/assigned-rider acknowledgement before applying a new window and requesting fresh confirmation.
- [ ] Rider: inspect eligible work, accept a job, view necessary guidance, record pickup/departure, and enter the demonstration code.
- [ ] Keep pickup/departure blocked until the current window has valid recipient confirmation or an accepted alternative. Acceptance can precede pickup; no response remains visible as a prerequisite.
- [ ] Add a clearly simulated code display/entry flow with invalid, expired, revoked, locked, and already-used examples. The mock code is never described as backend-secure verification.
- [ ] Keep recipient/receiver code display separate from rider code entry. The rider view must not reveal the answer.
- [ ] Add local event history and notification entries for the demonstration. Persist mock data locally only after the flow is stable, using an explicit reset and no cross-account data mixing.

Acceptance scenarios:

1. Sender books → recipient confirms → rider accepts and transports → recipient supplies demo code → delivered.
2. Sender books → recipient is unavailable → receiver is invited and accepts → rider completes handoff → participants see completion.

Also demonstrate cancellation before pickup and a recipient who becomes unavailable after pickup. The latter blocks handoff until coordination is resolved; it does not discard the parcel or create a false completion.

Suggested commit: `Complete mock availability receiver and rider workflows`.

## Milestone 4: Supabase foundation and Auth

Tasks:

- [ ] Check current Supabase guidance and installed CLI help before implementing version-specific setup. Use a development Supabase project or local stack, with documented environment requirements.
- [ ] Install the Supabase client and required React Native session dependencies through Expo-compatible installation. Add form/validation packages only where the implemented forms need them. Pin Supabase package versions and commit the lockfile.
- [ ] Implement email/password sign-in and sign-up with Confirm Email disabled for the portfolio environment. Keep email ownership separate from participant authorization. Do not add a verification-email screen or a nonfunctional password-reset link.
- [ ] Persist and refresh sessions using the supported React Native lifecycle integration. Clear cached user data and subscriptions on logout/account switch.
- [ ] Implement schema migrations, constraints, permissions, and RLS together for the entities specified in the PRD. Keep code challenges and notification dispatch internals in a non-exposed schema.
- [ ] Generate database TypeScript types. Index relationship and timeline lookups as needed for actual query patterns.
- [ ] Seed separate demo accounts through server-side tooling. Public signup must not grant rider privileges. Do not commit reusable privileged credentials.
- [ ] Test SELECT access and allowed commands for sender, recipient, assigned rider, active receiver, unrelated account, and signed-out caller. Cover private storage as it is introduced.

Acceptance: an account cannot gain access by switching the UI role or guessing a parcel ID. Only the project URL and publishable key enter the client bundle. A fresh local environment can reproduce the schema and seed data. Hosted configuration and credentials remain separate from source code.

Suggested commit: `Add Supabase authentication schema and participant access policies`.

## Milestone 5: connected commands and secure handoff

Tasks:

- [ ] Add the Supabase gateway behind the same screen contracts; select mock versus connected mode explicitly. Never silently fall back to mock success after a connected request fails.
- [ ] Connect booking, assignment, availability, reschedule acknowledgement, receiver responses, cancellation, and transport updates.
- [ ] Authenticate each backend request and derive the actor from the validated session. Do not authorize using submitted user IDs, a perspective switcher, or user-editable metadata.
- [ ] Enforce sensitive actions in backend-authorized database transactions. State changes, audit events, and notification/outbox records must commit together. An Edge Function making several independent writes is not an atomic transaction.
- [ ] Keep direct client updates to protected status/assignment/authorization columns unavailable. Limit pre-assignment rider discovery to authorized summaries; reveal full details after valid assignment.
- [ ] Generate a six-digit handoff challenge with a cryptographically secure generator. Use the PRD's provisional 15-minute expiry and five-failure limit, with server-side attempt and regeneration throttling.
- [ ] Return a newly issued code only to the currently authorized recipient/receiver. Store a server-secret keyed digest in private storage; do not design a "read the old plaintext code" endpoint. Reopening can explicitly issue a replacement that invalidates the old code.
- [ ] Verify code, assignment, current status, window, receiver authorization, expiry, and attempts on the backend. Consume the challenge, mark delivered, and append completion events atomically and idempotently.
- [ ] Revoke earlier codes when a receiver changes, a window changes, a code is regenerated, or the delivery is cancelled. Final verification requires connectivity.

Acceptance: two competing riders cannot both accept a job. Two verification requests cannot produce two completions. An unrelated/revoked receiver cannot issue a code; the rider cannot read it. Expired, invalid, rate-limited, and reused codes produce recoverable responses without leaking challenge data. No plaintext code appears in logs or notification payloads.

Suggested commit: `Connect delivery commands and server-side handoff verification`.

## Milestone 6: entrance guidance and foreground synchronization

Tasks:

- [ ] Add optional entrance photos through the Expo image picker. Check file type/size and show upload progress, retry, and a text fallback after permission denial.
- [ ] Use a private Storage bucket, scoped object access, and short-lived signed URLs. Check access to every referenced image, not just to the parent delivery screen.
- [ ] Add an entrance pin with manual placement and typed address/landmark fallback. Check SDK-compatible map support and provider key requirements before installing or configuring it.
- [ ] Subscribe only to authorized delivery/event/notification updates. Refetch after reconnect because Realtime is not a durable event queue.
- [ ] Clean up subscriptions on navigation and account changes; discard responses that belong to the previous session. Show cached/stale status and last updated time when disconnected.

Acceptance: two authorized sessions see the same committed update; an unrelated account cannot retrieve the photo. Denying photo/location permission leaves booking and handoff usable. No simulated marker is presented as live rider GPS.

Suggested commit: `Add private entrance guidance and realtime delivery updates`.

## Milestone 7: inbox and push notifications

Tasks:

- [ ] Build the persistent notification inbox, unread state, event timestamps, and delivery deep links. Persist inbox records independently of push success.
- [ ] Add Expo notification permission handling and device-token registration after authentication. Keep tokens scoped to the current user/device and unlink them during logout/account switching.
- [ ] Configure the development build, EAS project and platform push credentials when available. Request secret values through managed configuration, not chat or committed files.
- [ ] Dispatch Expo push notifications from an authenticated backend worker over the durable outbox created with delivery events. Deduplicate sends; add bounded retries and process delivery receipts/invalid tokens.
- [ ] Notify the right participants for availability requests, receiver invitations and responses, dispatch, completion, cancellation, and rescheduling. Respect revocation before disclosing event details.
- [ ] Keep push bodies minimal; omit precise addresses and handoff codes. Opening a notification validates the current session and delivery access before rendering.
- [ ] Exercise foreground, background, cold-start, signed-out, revoked-access, permission-denied, and delivery-failure cases on physical devices.

Acceptance: denied permission never hides a required availability action. A push failure cannot undo a completed delivery. A previous account's token cannot disclose the next account's data. Remote push is marked unverified until it has actually been received on configured hardware.

Suggested commit: `Add durable inbox and Expo push notification delivery`.

## Milestone 8: native validation and portfolio handoff

Tasks:

- [ ] Run both scenario walkthroughs on Android and iOS, including reconnect and account-switch cases. Record the actual device/emulator coverage.
- [ ] Check light/dark appearance, large system text, VoiceOver/TalkBack reading order, safe areas, keyboard behavior, Android back, iOS swipe-back, and permission-denial recovery.
- [ ] Recheck backend participant access, challenge consumption, concurrent acceptance, and event/send idempotency after integration changes.
- [ ] Keep CI focused on typecheck, lint, domain rules, and backend authorization/transaction tests. Run platform bundle/config checks when relevant changes justify them.
- [ ] Make seed/reset instructions reproducible, remove unused starter assets after their consumers are gone, and document every required environment variable without secret values.
- [ ] Add real native screenshots, a short booking-to-handoff video, a concise architecture explanation, and a case study describing design decisions and observed test results.
- [ ] Label mock tracking/alerts and any untested features. Describe fewer failed deliveries as an intended benefit until user testing supports a measured claim.

Acceptance: a reviewer can run the mock demo without creating accounts or supplying credentials. The connected setup is documented separately. Core scenarios, failure recovery, and current limitations are visible in the README. Store publication is optional and outside this plan's completion gate.

Suggested commit: `Validate native flows and prepare portfolio demo`.

## Proposed navigation and code boundaries

| Route | Purpose |
| --- | --- |
| `/` | Welcome, mock demo entry, or session-aware redirect |
| `/sign-in`, `/sign-up` | Connected authentication |
| `/deliveries` | Participant-specific delivery list |
| `/book`, `/book/review` | Sender booking and review |
| `/deliveries/[id]` | Shared details with authorized actions |
| `/deliveries/[id]/availability` | Recipient availability and reschedule request |
| `/deliveries/[id]/receiver` | Receiver invitation/management |
| `/deliveries/[id]/handoff` | Authorized code display or rider entry, determined by participant access |
| `/notifications`, `/account` | Inbox, appearance, session, and demo reset |
| `/design-system` | Development/demo gallery; existing `/explore` redirects here |

Keep layouts and thin route entry files in `src/app`. Avoid duplicate URL paths when using Expo Router groups. Put screen bodies in `src/screens`, domain/gateway code in `src/features`, Supabase/client setup in `src/lib`, shared UI in `src/components`, and backend migrations/functions under `supabase`. Continue the existing theme; do not create another token authority. A notification deep link carries a delivery identifier, never a handoff code.

Use feature-scoped state and a small demo store initially. Add a server-query cache when the connected gateway needs it; clear or partition it by account. Choose libraries based on the current milestone rather than installing speculative dependencies.

## Setup dependencies and exclusions

| Dependency | Needed by | Work that can proceed without it |
| --- | --- | --- |
| Supabase development project or functioning local stack | 4 and connected work onward | Complete mock application |
| Backend secret configuration | 5 challenge generation/verification and 7 push worker | Mock handoff and inbox layout |
| Map provider configuration, if required | 6 native map/pin UI | Typed entrance guidance and photos |
| EAS project, push platform credentials, physical device | 7 remote push verification | Persistent inbox, Realtime, backend outbox |
| Android and iOS device/simulator access | Early smoke checks and 8 native acceptance | Domain tests, mock UI, backend tests, bundle checks |

The portfolio MVP excludes payments, a public courier marketplace, automated dispatch/route optimization, continuous location tracking, real SMS/email receiver invitations, and a separate admin dashboard. This plan does not deploy a real delivery service.

## First implementation task

Start with milestone 1: domain contracts, allowed-action rules, deterministic fixtures, and a resettable mock gateway. Then replace the starter Home with the milestone 2 shell. Do not wire the gallery's independent local booleans into the product workflow or start with push notification infrastructure.

Every implementation commit remains authored under the user's configured GitHub identity. Existing instruction: ThawLinnHtet. Do not rewrite earlier history as part of these milestones.
