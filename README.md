# ParcelConnect

A React Native portfolio project for smarter parcel handoffs: confirm recipient availability, provide entrance guidance, authorize a trusted receiver, and verify delivery with a one-time code.

## Current status

Foundation plus design tokens: Expo SDK 58, a shared teal light/dark theme, typography/spacing/radius/motion tokens, and an interactive token gallery. Open the Tokens/Design tab (route `/explore`) to preview the system and fictional recipient states. The Home screen remains a starter example. Real delivery flows, Supabase integration, authentication, and notifications are planned, not implemented.

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

## Design preview

Open `/explore` on web, or the Design tab on a device. Choose System, Light, or Dark theme. The availability button and receiver selection change local demo state only; they do not save a delivery. The state picker also demonstrates an offline error.

Tokens live in `src/constants/theme.ts`. `AppText` and `StatusLabel` are reusable primitives; `@expo/ui` provides native controls. Appearance overrides are in memory; a fresh session follows the system. Browser screenshots are previews, not native-device test evidence.

Screenshot previews: [light](docs/screenshots/tokens-light.png), [dark](docs/screenshots/tokens-dark.png), [phone light](docs/screenshots/mobile-light.png), [phone dark](docs/screenshots/mobile-dark.png). These are actual browser captures of the Expo web app.

Token-gallery verification: TypeScript, ESLint, SDK compatibility, contrast calculations, and Android/iOS/web JavaScript exports passed. Browser checks exercised the local demo actions and theme selection at desktop and phone widths with no reported errors or horizontal overflow. Native-device behavior, system text scaling, and screen-reader testing remain unverified.

## Project guide

- [Product requirements](docs/PRD.md): scope, roles, state machine, access rules, notifications, milestones, acceptance criteria.
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md): ordered milestones, dependencies, acceptance criteria, and the first coding task.
- [Agent instructions](AGENTS.md): coding conventions, security constraints, validation.
- [Implemented design system](DESIGN.md): token reference and component usage.
- [Design system proposal](docs/DESIGN_SYSTEM.md): inspected Mobbin references, proposed tokens, component states, and recipient screen layout. Original proposal with implementation status; the token gallery now implements the approved direction.
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

## Foundation validation

Verified on 2026-11-13: TypeScript, ESLint, Expo dependency compatibility, and production bundle exports for Android, iOS, and web passed. Bundling is not a device runtime test; no physical-device or emulator run is claimed. Small starter fixes add Expo CSS type declarations, correct the web tab-button ref type, and use a hydration-safe external-store snapshot for the web color scheme.
