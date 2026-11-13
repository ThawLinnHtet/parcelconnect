# ParcelConnect

A React Native portfolio project for smarter parcel handoffs: confirm recipient availability, provide entrance guidance, authorize a trusted receiver, and verify delivery with a one-time code.

## Current status

Foundation only: official Expo SDK 58 TypeScript/Router starter, project instructions, PRD, and five selected official Expo agent skills. The template's example screens remain. Delivery flows, Supabase integration, authentication, and notifications are planned, not implemented.

## Run locally

Requires Node.js 22 LTS or newer supported by Expo SDK 58 and npm. Commit and use the lockfile.

```bash
npm ci
npm start
```

Open on an Android/iOS device with a compatible Expo Go, or use `npm run android`, `npm run ios`, or `npm run web` with the relevant local tooling. iOS simulator requires macOS/Xcode; Android emulator requires Android tooling. Remote push will use a development build and a physical device once configured.

```bash
npm run typecheck
npm run lint
npx --yes @expo/agent-cli@latest install --check
```

The scaffold runs without backend credentials. Later, copy `.env.example` to `.env` and supply a Supabase project URL and publishable key. The template does not read these yet. Keep secret keys on the backend. Email/password authentication will intentionally skip email confirmation in the portfolio environment; handoff verification remains required.

## Project guide

- [Product requirements](docs/PRD.md): scope, roles, state machine, access rules, notifications, milestones, acceptance criteria.
- [Agent instructions](AGENTS.md): coding conventions, security constraints, validation.
- [Expo skills](docs/EXPO_SKILLS.md): installed skills and optional official catalog.
- `src/app/`: Expo Router screens/layouts; `src/components/`: shared UI; `src/constants/theme.ts`: existing theme.
- `.agents/skills/`: complete copies of the five chosen Expo skills and their references/scripts, with upstream revision recorded in `sources.json`.

## Planned milestones

1. Foundation (this repository).
2. Deterministic mock booking-to-handoff demo with role perspectives.
3. Supabase Auth, database/RLS, photos, Realtime, secure backend handoff.
4. In-app inbox, Expo push, deep links and failure handling.
5. Accessibility review, device walkthrough, screenshots/video and portfolio case study.

No real deliveries, live GPS service, payments, or measured reduction in failed deliveries are claimed.

## References and attribution

Scaffolded from the official `expo-template-default@58.0.34` using `@expo/agent-cli`; resolved Expo version at setup: 58.0.25. Selected skills come from [expo/skills](https://github.com/expo/skills), MIT licensed; see `.agents/skills/EXPO-LICENSE` and `sources.json`.
