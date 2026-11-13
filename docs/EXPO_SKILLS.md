# Official Expo agent skills

Source: https://github.com/expo/skills

Verified upstream revision: `acc0b21ce09be356b5cf0323482bdfe7db0b7a1e` on 2026-11-13.

## Installed selection

Only the five user-selected skills are installed under `.agents/skills/`, including all bundled references and scripts:

| Skill | Purpose |
| --- | --- |
| expo-ui | Native @expo/ui components, SwiftUI and Jetpack Compose |
| expo-native-ui | Native screen layout, controls, colors, media and effects |
| expo-design-system | Tokens, shared component conventions, visual consistency |
| expo-router | Routes, links, stacks, tabs and modal navigation |
| expo-project-structure | Folder layout for a new Expo app |

These are agent instructions, not npm runtime packages. @expo/ui itself is already included by the SDK 58 starter. Project-local skills are discoverable by compatible agents; reload the project/session if its skill catalog is cached. AGENTS.md also points agents to the files explicitly.

## Complete stable catalog

Framework skills: expo-overview (task routing), expo-project-structure, expo-router, expo-animation (motion/gestures), expo-native-ui, expo-design-system, expo-ui, expo-data-fetching (requests/cache/offline), expo-dom (web code inside native), expo-web-to-native (migration), expo-module (native modules), expo-brownfield (existing native apps), expo-dev-client (development builds), expo-examples (integration examples), expo-app-clip (iOS App Clips), expo-upgrade (SDK upgrades).

EAS service skills: eas-app-stores (build/submit), eas-hosting (web/API hosting), eas-workflows (CI/CD), eas-observe (performance), eas-update (OTA updates), eas-update-insights (update health), eas-simulator (remote simulators). Service use can require account configuration or paid plans; installing a skill does not provision services.

| Official skill/source | Project status |
| --- | --- |
| [eas-app-stores](https://github.com/expo/skills/tree/acc0b21ce09be356b5cf0323482bdfe7db0b7a1e/plugins/expo/skills/eas-app-stores) | Optional |
| [eas-hosting](https://github.com/expo/skills/tree/acc0b21ce09be356b5cf0323482bdfe7db0b7a1e/plugins/expo/skills/eas-hosting) | Optional |
| [eas-observe](https://github.com/expo/skills/tree/acc0b21ce09be356b5cf0323482bdfe7db0b7a1e/plugins/expo/skills/eas-observe) | Optional |
| [eas-simulator](https://github.com/expo/skills/tree/acc0b21ce09be356b5cf0323482bdfe7db0b7a1e/plugins/expo/skills/eas-simulator) | Optional |
| [eas-update](https://github.com/expo/skills/tree/acc0b21ce09be356b5cf0323482bdfe7db0b7a1e/plugins/expo/skills/eas-update) | Optional |
| [eas-update-insights](https://github.com/expo/skills/tree/acc0b21ce09be356b5cf0323482bdfe7db0b7a1e/plugins/expo/skills/eas-update-insights) | Optional |
| [eas-workflows](https://github.com/expo/skills/tree/acc0b21ce09be356b5cf0323482bdfe7db0b7a1e/plugins/expo/skills/eas-workflows) | Optional |
| [expo-animation](https://github.com/expo/skills/tree/acc0b21ce09be356b5cf0323482bdfe7db0b7a1e/plugins/expo/skills/expo-animation) | Optional |
| [expo-app-clip](https://github.com/expo/skills/tree/acc0b21ce09be356b5cf0323482bdfe7db0b7a1e/plugins/expo/skills/expo-app-clip) | Optional |
| [expo-brownfield](https://github.com/expo/skills/tree/acc0b21ce09be356b5cf0323482bdfe7db0b7a1e/plugins/expo/skills/expo-brownfield) | Optional |
| [expo-data-fetching](https://github.com/expo/skills/tree/acc0b21ce09be356b5cf0323482bdfe7db0b7a1e/plugins/expo/skills/expo-data-fetching) | Optional |
| [expo-design-system](https://github.com/expo/skills/tree/acc0b21ce09be356b5cf0323482bdfe7db0b7a1e/plugins/expo/skills/expo-design-system) | Installed |
| [expo-dev-client](https://github.com/expo/skills/tree/acc0b21ce09be356b5cf0323482bdfe7db0b7a1e/plugins/expo/skills/expo-dev-client) | Optional |
| [expo-dom](https://github.com/expo/skills/tree/acc0b21ce09be356b5cf0323482bdfe7db0b7a1e/plugins/expo/skills/expo-dom) | Optional |
| [expo-examples](https://github.com/expo/skills/tree/acc0b21ce09be356b5cf0323482bdfe7db0b7a1e/plugins/expo/skills/expo-examples) | Optional |
| [expo-module](https://github.com/expo/skills/tree/acc0b21ce09be356b5cf0323482bdfe7db0b7a1e/plugins/expo/skills/expo-module) | Optional |
| [expo-native-ui](https://github.com/expo/skills/tree/acc0b21ce09be356b5cf0323482bdfe7db0b7a1e/plugins/expo/skills/expo-native-ui) | Installed |
| [expo-overview](https://github.com/expo/skills/tree/acc0b21ce09be356b5cf0323482bdfe7db0b7a1e/plugins/expo/skills/expo-overview) | Optional |
| [expo-project-structure](https://github.com/expo/skills/tree/acc0b21ce09be356b5cf0323482bdfe7db0b7a1e/plugins/expo/skills/expo-project-structure) | Installed |
| [expo-router](https://github.com/expo/skills/tree/acc0b21ce09be356b5cf0323482bdfe7db0b7a1e/plugins/expo/skills/expo-router) | Installed |
| [expo-ui](https://github.com/expo/skills/tree/acc0b21ce09be356b5cf0323482bdfe7db0b7a1e/plugins/expo/skills/expo-ui) | Installed |
| [expo-upgrade](https://github.com/expo/skills/tree/acc0b21ce09be356b5cf0323482bdfe7db0b7a1e/plugins/expo/skills/expo-upgrade) | Optional |
| [expo-web-to-native](https://github.com/expo/skills/tree/acc0b21ce09be356b5cf0323482bdfe7db0b7a1e/plugins/expo/skills/expo-web-to-native) | Optional |

The upstream expo-experiments plugin is excluded from this stable catalog. Do not install optional skills without a user selection. Keep upstream license and revision information when updating installed copies.
