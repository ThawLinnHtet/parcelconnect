# Portfolio validation checklist

This checklist records required review coverage. An unchecked item is not a passing test. Browser captures and JavaScript bundle exports do not establish native-device behavior.

## Reproducible setup

- [x] Fresh Node 24 install (`npm ci`), lint, typecheck, and tests pass in the implementation branch.
- [x] Mock demo is the default without Supabase credentials and its fictional-data labels are visible.
- [x] Domain reset tests restore fictional participants and invalidate pending work.
- [x] Connected setup documents migrations, public client configuration, and server secrets separately.
- [x] Missing backend configuration has an actionable screen; connected requests never fall back to mock data.

## Mock scenarios

- [ ] Sender books a parcel; recipient confirms the current window; assigned rider picks up, dispatches, and completes the simulated handoff.
- [ ] Recipient nominates a receiver; pending invitation blocks pickup; acceptance permits coordination; rider never sees the code in delivery records. (Domain tests pass; UI walkthrough remains open.)
- [ ] Revoke receiver or change window; old confirmation/code becomes unusable.
- [ ] Invalid, expired, locked, and already-used code states remain distinguishable.
- [ ] Cancellation before pickup works. Unavailability after pickup blocks final handoff without auto-cancelling or auto-delivering.
- [ ] Notifications open the appropriate delivery; reset and account/perspective switching refresh the inbox.

## Connected correctness

- [x] Database policy tests deny unrelated and signed-out callers.
- [x] The UI sends no actor/role authority; rider capability comes from a protected profile field.
- [x] Concurrent riders cannot claim the same delivery in PostgreSQL assertions.
- [x] Concurrent/retried verification completes a delivery once in PostgreSQL assertions.
- [x] Failed code attempts persist and enforce the attempt limit.
- [x] Private photo policies and revoked receiver access are covered by database assertions.
- [x] Realtime reconnect invalidation and logout subscription cleanup are covered by client tests; hosted Realtime still needs verification.

## Notifications and hardware

- [x] Push permission denial leaves the inbox and required delivery actions usable in tested client logic.
- [ ] Real development build receives push in foreground/background/cold start on configured physical hardware.
- [x] Notification taps require the current session and delivery authorization in client tests.
- [x] Token cleanup and invalid-token handling are covered by lifecycle/worker tests; physical device unlink remains open.
- [x] Push failures are processed from a durable outbox and cannot roll back delivery state.

## Native accessibility and navigation

- [ ] Android and iOS screen layouts inspected on named hardware/emulators.
- [ ] Large system text and VoiceOver/TalkBack preserve reading order and action reachability.
- [ ] Keyboard, safe areas, Android system back, and iOS swipe-back work.
- [ ] Light/dark appearance and reduced motion have been exercised.
- [ ] Photo/location permission denial offers a text/manual fallback.

## Portfolio materials

- [x] Browser screenshots are labeled as browser captures with the mock scenario; they are not presented as native captures.
- [ ] Short video demonstrates the recipient-unavailable scenario and recovery.
- [ ] Case study separates implemented features, simulations, and unverified integrations.
- [ ] No invented delivery-success improvements, customer feedback, or business metrics.

PR review and merge decisions belong to the repository owner. No automation should merge these implementation PRs.
