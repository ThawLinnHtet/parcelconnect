# ParcelConnect implementation status

Date: 2026-11-13

The implementation is organized as six reviewable pull requests. The owner controls merge order; no PR has been merged by the implementation work.

## Milestones

| Milestone | Status | Evidence and limits |
| --- | --- | --- |
| Delivery domain and mock gateway | Implemented | Deterministic role/transition rules; 18 domain tests pass. |
| Mock booking and handoff app | Implemented | Booking, delivery details, availability, trusted receiver, rider flow, simulated code, inbox, account, reset, and design preview. Browser evidence includes delivery and recipient-handoff screenshots. |
| Supabase Auth and connected client | Implemented in code | Email/password flow, validated session, account-scoped gateway, Realtime invalidation/refetch, and no mock fallback. Needs a configured Supabase project for end-to-end Auth/Realtime verification. |
| Database and secure handoff | Implemented in code | RLS and transaction migration, server-validated Edge Function, HMAC code digests, lockout/idempotency. 39 PostgreSQL/RLS/transaction assertions and 7 Edge tests pass using Auth/Storage shims. Hosted services remain untested. |
| Private entrance media and coordinates | Implemented in code | Input validation, manual coordinate fields, private photo staging, authorized attachment, and signed URLs. Needs hosted Storage and device permission checks. No map SDK or live tracking is included. |
| Inbox and remote push | Implemented in code | Durable notification/outbox schema, Expo worker, receipt retries, token lifecycle, and access-checked deep links. The 14 pure notification/media tests pass. Needs EAS credentials and a physical device for delivery verification. |
| Native quality and portfolio handoff | In progress | Lint, typecheck, tests, SDK dependency check, and Android/iOS/web bundle export pass in the final implementation branch. Native accessibility and hardware walkthroughs remain open. |

The release remains a portfolio prototype. The mock flow works without credentials; the connected flow requires a local Supabase project and backend secrets; remote push requires platform credentials. No courier marketplace, payments, GPS tracking, or production operations are provided.

## Validation commands

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run test:notifications
npx expo install --check
npx expo export --platform all --output-dir /tmp/parcelconnect-export
python3 supabase/tests/run.py
node --experimental-strip-types --test supabase/tests/edge.test.mts
```

The PostgreSQL runner uses a disposable database plus Auth and Storage shims. Bundle exports show Metro can bundle each platform; they do not prove native runtime behavior. Follow [Supabase backend setup](SUPABASE_BACKEND.md) and [push and media setup](NOTIFICATIONS_AND_MEDIA.md) for local integration. Keep `.env` and server secrets out of commits.

## PR sequence

The delivery-domain and Supabase-backend PRs are independent foundations. Review and merge those before the stacked app PRs. Then merge mock app, connected client, notifications/media, and portfolio quality in that order. Each stacked PR targets its parent branch so its diff remains focused. See [PR merge order](PR_MERGE_ORDER.md) and retarget/rebase descendants after each owner-controlled merge.

## Acceptance still open

- Configure local or hosted Supabase and exercise Auth, Edge Functions, Storage, participant access, and Realtime across separate accounts.
- Run booking, receiver-unavailable recovery, and handoff walkthroughs on Android and iOS hardware/emulators.
- Verify large system text, VoiceOver/TalkBack order, keyboard behavior, safe areas, Android back, iOS swipe-back, and permission denial.
- Receive push in foreground/background/cold start on a configured physical device; verify logout unlink and invalid-token cleanup there.
- Record native screenshots or video and write a portfolio case study from observed results. Browser screenshots are not native-device evidence.

No delivery-success metric or user research finding is claimed until measured.
