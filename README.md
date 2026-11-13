# ParcelConnect

ParcelConnect is a React Native portfolio app for coordinating a parcel handoff. It focuses on confirming recipient availability, sharing entrance guidance, authorizing a trusted receiver, and verifying delivery with a one-time code.

## Current status

The mock app, domain rules, Supabase integration, private entrance-photo flow, inbox, and push worker are implemented in a staged pull-request series. The PRs remain open for the repository owner to review and merge. Connected mode needs a configured Supabase project; remote push needs EAS credentials and a physical device. No real courier operations, payments, live tracking, or production service are claimed.

The home screen opens a fictional demo with sender, recipient, rider, and trusted-receiver perspectives. Mock events and notifications stay in local sample data. Connected mode is a separate, explicit account path and never turns a failed backend request into a mock success.

## Run the app

Requires Node.js 24 and npm.

```bash
npm ci
npm start
```

Open the web app or use an Android/iOS device with a compatible development environment. iOS simulator builds require macOS/Xcode. Android emulator builds require Android tooling.

```bash
npm run typecheck
npm run lint
npm test
npm run test:notifications
npx expo install --check
```

The app runs in mock mode without Supabase credentials. To try connected mode, copy `.env.example` to `.env`, set the Supabase project URL and publishable key, apply the backend migration, and configure the Edge Function secrets described in [Supabase backend setup](docs/SUPABASE_BACKEND.md). Never put a service-role key in a client environment variable.

## Portfolio screenshots

These are browser captures of the Expo web app, not native-device screenshots:

- [Mock deliveries](docs/screenshots/mock-deliveries-phone.png)
- [Recipient handoff](docs/screenshots/mock-recipient-handoff-phone.png)
- [Design tokens in light mode](docs/screenshots/tokens-light.png)
- [Design tokens in dark mode](docs/screenshots/tokens-dark.png)

## Project guide

- [Product requirements](docs/PRD.md)
- [Implementation plan and verification status](docs/IMPLEMENTATION_PLAN.md)
- [Design system](DESIGN.md) and [Mobbin-informed design proposal](docs/DESIGN_SYSTEM.md)
- [Supabase backend setup](docs/SUPABASE_BACKEND.md)
- [Push and private media setup](docs/NOTIFICATIONS_AND_MEDIA.md)
- [Expo skills](docs/EXPO_SKILLS.md)
- [Coding and security guidance](AGENTS.md)

App routes live in `src/app`; screen bodies in `src/screens`; domain, auth, media, and notification code in `src/features`; and shared styles in `src/constants/theme.ts`.

## Validation and limits

Domain tests cover booking, access rules, stale requests, handoff attempts, revocation, rescheduling, and reset races. Disposable PostgreSQL tests cover RLS, concurrent rider claims, code lockout/idempotency, photo policies, token transfer, and outbox leases. They use Auth and Storage shims; hosted Supabase services were not tested. Expo Android, iOS, and web exports verify bundling, not device behavior.

Remote push, photo permissions, native layout/accessibility, and real Auth/Realtime behavior still need checks on a configured Supabase project and physical Android/iOS devices. See [the portfolio review checklist](docs/PORTFOLIO_REVIEW.md) for remaining evidence.

## References

The project began from `expo-template-default@58.0.34` with Expo SDK 58. Selected skills are from [expo/skills](https://github.com/expo/skills); see `.agents/skills/EXPO-LICENSE` and `.agents/skills/sources.json`.
