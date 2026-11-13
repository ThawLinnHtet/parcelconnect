# Portfolio validation checklist

This checklist records required review coverage. An unchecked item is not a passing test. Browser captures and JavaScript bundle exports do not establish native-device behavior.

## Reproducible setup

- [ ] Fresh Node 24 checkout: npm ci, lint, typecheck, and domain tests pass.
- [ ] Mock demo runs without Supabase credentials; demo labels remain visible.
- [ ] Reset restores known fictional participants and delivery state.
- [ ] Connected setup documents migrations, seed accounts, public client configuration, and backend secrets separately.
- [ ] Missing backend configuration produces an actionable screen, not mock success.

## Mock scenarios

- [ ] Sender books a parcel; recipient confirms the current window; assigned rider picks up, dispatches, and completes the simulated handoff.
- [ ] Recipient nominates a receiver; pending invitation blocks pickup; acceptance permits coordination; rider never sees the code in delivery records.
- [ ] Revoke receiver or change window; old confirmation/code becomes unusable.
- [ ] Invalid, expired, locked, and already-used code states remain distinguishable.
- [ ] Cancellation before pickup works. Unavailability after pickup blocks final handoff without auto-cancelling or auto-delivering.
- [ ] Notifications open the appropriate delivery; reset and account/perspective switching refresh the inbox.

## Connected correctness

- [ ] Database policy tests deny unrelated and signed-out callers.
- [ ] Privileged role and participant changes cannot be made through the UI role switcher or editable metadata.
- [ ] Concurrent riders cannot claim the same delivery.
- [ ] Concurrent/retried verification completes a delivery once.
- [ ] Failed code attempts persist and enforce the attempt limit.
- [ ] Private images and old receiver access cannot bypass authorization.
- [ ] Realtime reconnect refetches durable data; logout cancels subscriptions and clears prior-account cache.

## Notifications and hardware

- [ ] Push permission denied: inbox and required actions remain usable.
- [ ] Real development build receives push in foreground/background/cold start on configured physical hardware.
- [ ] Notification taps require the right session and current delivery access.
- [ ] Logout unlinks a device token; invalid push receipts remove stale registrations.
- [ ] Push failures do not roll back a committed delivery.

## Native accessibility and navigation

- [ ] Android and iOS screen layouts inspected on named hardware/emulators.
- [ ] Large system text and VoiceOver/TalkBack preserve reading order and action reachability.
- [ ] Keyboard, safe areas, Android system back, and iOS swipe-back work.
- [ ] Light/dark appearance and reduced motion have been exercised.
- [ ] Photo/location permission denial offers a text/manual fallback.

## Portfolio materials

- [ ] Screenshots label platform and scenario accurately.
- [ ] Short video demonstrates the recipient-unavailable scenario and recovery.
- [ ] Case study separates implemented features, simulations, and unverified integrations.
- [ ] No invented delivery-success improvements, customer feedback, or business metrics.

PR review and merge decisions belong to the repository owner. No automation should merge these implementation PRs.
