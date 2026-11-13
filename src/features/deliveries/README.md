# Delivery domain

This feature defines the data contract used by mock and future connected screens. Import public types and helpers from this folder's index.

- `createMockGateway({ now?, latencyMs? })` creates an isolated demonstration data source. `now` returns epoch milliseconds and makes scenario tests reproducible.
- `DEMO_ACTORS`, `DEMO_PEOPLE`, and `DEMO_DELIVERY_ID` identify the fictional perspectives and the initial booked parcel. Actor roles are not authentication credentials.
- Gateway methods return promises and defensive copies. `subscribe` is a local invalidation signal; `setOnline(false)` demonstrates an explicit offline failure; `resetDemo()` restores the seed and reconnects.
- Lists and details require a valid perspective and participant relationship. Unassigned riders discover a limited job summary; pending receivers receive redacted location/entrance fields.
- Availability is independent of transport status. Window acknowledgements, authorization expiry, and receiver acceptance control whether pickup, dispatch, or final verification can proceed.
- The adapter's handoff code is deliberately simulated, deterministic, and private to its in-memory challenge map. It never appears in ordinary delivery records. This is not secure backend verification.
- A successful verification with the same assigned rider and idempotency key returns the existing completion without adding another event. Code attempts and regeneration are bounded.

Run `npm test` for the Node built-in domain suite. The test-only require hook transforms TypeScript using the existing development dependency; it is not imported by the application. Run `npm run typecheck` and `npm run lint` for the project checks.
