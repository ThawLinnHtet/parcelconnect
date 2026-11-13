# ParcelConnect — Agent Instructions

## Product intent and scope

Read docs/PRD.md before changing behavior and DESIGN.md before adding UI. This is a mobile portfolio project for coordinating parcel handoffs. Core roles are sender, recipient, rider, and a scoped trusted receiver. Prioritize availability confirmation, entrance guidance, and secure one-time handoff verification. No real courier operations or payments are in scope. Clearly label simulated tracking, notifications, and mock data.

The current foundation is an Expo starter, not the completed MVP. Implement milestones incrementally and report what is real versus planned. Avoid unnecessary approval pauses for authorized reversible work; do not provision paid services or publish releases without authorization.

## Stack and dependency rules

- Expo SDK 58, React Native, strict TypeScript, Expo Router, npm and committed package-lock.json.
- Before touching an Expo API, inspect package.json and consult matching SDK docs at https://docs.expo.dev/versions/v58.0.0/ (update the version when the project changes).
- Install packages using `npx --yes @expo/agent-cli@latest install <package>` for SDK compatibility. Do not upgrade the SDK or mix package managers incidentally.
- @expo/ui is included by the starter. Agent skills are guidance files, not additional runtime dependencies.
- Supabase is the planned backend. Do not claim it is configured until migrations, policies, credentials, and integration are verified.

## Selected skills

Project-local skills live in .agents/skills. Read the matching SKILL.md before relevant work:

- expo-project-structure: folder conventions for this new project.
- expo-router: navigation, routes, deep links, stacks and tabs.
- expo-ui: check native component availability before adding another UI library.
- expo-native-ui: platform layout, styling and native behavior.
- expo-design-system: shared tokens, component states and consistency.

Use referenced files as needed. Preserve upstream references/scripts and attribution. Only these five skills were selected. See docs/EXPO_SKILLS.md for the optional catalog and .agents/skills/sources.json for the pinned upstream revision. Do not auto-install extra skills or execute optional feedback/reporting commands unless the user asks to send feedback.

## Organization and UI

- src/app contains routes/layouts only; keep feature logic outside route files.
- src/screens: screen bodies; src/components: reusable UI; src/features: domain logic; src/lib: service clients; src/hooks: shared hooks.
- Extend src/constants/theme.ts rather than creating parallel theme files. It exports Colors, Spacing, Typography, Radius, Border, Motion, Interaction, Layout, and IconSize. Use AppText and StatusLabel for their shared roles, useTheme for current colors, and useAppearance for the system/light/dark override. DESIGN.md documents the implemented system; runtime token values stay in the theme source. Use explicit loading/disabled/error states.
- Use kebab-case filenames, typed props, and the @/ alias. Avoid any and avoid broad abstractions before repeated use.
- Support Android and iOS, safe areas, keyboard behavior, large text, accessible labels, and reduced motion. Large delivery feeds use virtualized lists.
- For native config, edit app.json/config plugins. Do not hand-edit generated ios/android directories.

## Supabase, auth, and access

- Email/password signup with Confirm Email disabled is intentional for the portfolio environment. Email verification and parcel handoff verification are different features.
- Backend credentials go in local ignored environment files or managed secrets. Client EXPO_PUBLIC variables contain only project URL and publishable key. Never commit service-role keys, tokens, or real customer information.
- Enable RLS for every exposed table and define participant-specific policies. Authentication alone is not authorization. Do not authorize using user-editable user_metadata or a role switcher.
- Mock role switching is local only; connected mode uses real seeded account sessions. Never ship a secret key to make the demo switch roles.
- Store schema changes and policies in migrations and generate client types. Test access denial across unrelated accounts and private Storage objects.
- Enforce state transitions and assignment atomically on the backend. Clients cannot set delivered directly.
- Handoff codes: generate/verify server-side, secret-keyed digest in private storage, short expiry, bounded attempts, atomic consumption, authorized retrieval only; never expose to riders, logs, push payloads or ordinary delivery rows.
- Receiver revocation/regeneration invalidates earlier codes. Final verification requires connectivity.

## Notifications

- Supabase persists inbox/events; Realtime updates active screens. Refetch after reconnect.
- Expo Push handles remote notifications through authorized backend dispatch. Keep tokens scoped to the correct user/device and unlink on logout.
- Persist an idempotent outbox before sending, handle receipts/retries, and omit private addresses/codes from push bodies.
- Push denial/failure must leave all required actions available in-app. Validate access after following a notification deep link.
- Test push on a physical device/development build with platform credentials; do not claim it works based on a web preview.

## Commands and validation

```bash
npm ci
npm start
npm run android
npm run ios
npm run web
npm run typecheck
npm run lint
npx --yes @expo/agent-cli@latest install --check
npx --yes @expo/agent-cli@latest doctor
```

Before reporting completion, run typecheck and lint. For app/config/dependency changes check SDK compatibility and bundle affected native platforms. Add focused tests for meaningful domain logic, authorization, race conditions and one-time verification; do not add tests that merely duplicate static implementation. Native runtime checks require a device/emulator; clearly state when only static checks or bundling were possible. Keep README setup/status accurate and report limitations.
