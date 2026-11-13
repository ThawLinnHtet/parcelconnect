# ParcelConnect design system proposal

Version 0.3 | 2026-11-13 | Deep teal approved; foundations and gallery implemented; remaining patterns proposed

This document records the original proposal. Implementation update: the tokens, appearance provider, shared text/status primitives, and interactive gallery at `/explore` now exist. The full component library and delivery workflows remain planned. The user approved keeping the proposed deep teal brand color on 2026-11-13: `#0B6256` for light-mode actions and `#83D6C1` for dark-mode actions. Supporting tokens and the gallery composition are now implemented choices derived from this proposal; this does not make them separately user-approved brand decisions. The full component contracts and delivery screen composition below remain proposals unless identified as implemented. Runtime dependencies are unchanged. [DESIGN.md](../DESIGN.md) records the current implementation; `src/constants/theme.ts` remains the runtime source of truth.

## 1. Direction

Deep teal is the approved action color. The proposed surrounding system uses neutral surfaces, system typography, and native controls. The main screen should make the next handoff action obvious. A recipient who has not replied sees the availability request before tracking details.

The app's distinctive feature is its handoff coordination. Express that through an availability panel and clear receiver states. Avoid making a decorative map the first screen's main content when the MVP only has a status timeline and entrance guidance.

Use an open page with grouped rows and separators. Reserve a bounded panel for the availability request or an important exception. Keep one visually dominant action per state. Teal denotes an action; explicit labels and icons explain operational status. No new logo is proposed.

## 2. Mobbin references

All references below are iOS screens returned by Mobbin and inspected on 2026-11-13. Android treatment must follow Android conventions. These references establish visible interface patterns, not proof of conversion or delivery outcomes.

| Inspected screen | Visible pattern | ParcelConnect adaptation |
| --- | --- | --- |
| [Shop delivery tracking](https://mobbin.com/screens/ac9223d8-b3bc-430b-b509-56b602c25de5) | Arrival range and transit label precede carrier and tracking details; a progress strip sits below them | Lead with the requested delivery window, current status, and next action; keep IDs and carrier-style metadata secondary |
| [Wolt Delivery instructions](https://mobbin.com/screens/7bab1305-1a6c-4891-ab83-d60bafdb28fd) | Address, editable courier instructions, delivery options, and a prominent Continue action share one screen | Keep entrance instructions close to the address; show a persistent primary action only where the task needs one |
| [Glovo courier summary](https://mobbin.com/screens/296d3f78-43fb-408b-8ad0-bc81744ae310) | A scheduled time with Edit appears above a pickup/drop-off path | Use a compact pickup/drop-off pair with instructions and an explicit request to change the window |

Shop's commerce artwork, Wolt's checkout/payment content, and Glovo's photography are outside our scope. The proposed teal palette, dark theme, availability panel, receiver authorization, and code flow are ParcelConnect design decisions; the inspected screens do not establish them. No competitor artwork or screenshots will ship in the app.

## 3. Foundation tokens

Continue `src/constants/theme.ts` as the sole theme entry point. Do not add a competing theme folder. The existing starter names can remain as compatibility aliases during implementation.

### Color roles

The current implementation uses explicit static light/dark palettes for surfaces, labels, separators, and brand actions. The table below matches implemented roles; `theme.ts` also defines element/selected backgrounds and disabled pairs. Native semantic colors remain a future consideration and are not currently implemented.

| Role | Light | Dark | Intended use |
| --- | --- | --- | --- |
| background | `#F6F8F7` | `#111A16` | Page background |
| surface | `#FFFFFF` | `#1B2721` | Grouped content, sheets |
| text | `#141B1A` | `#EDF4F0` | Titles and primary information |
| textSecondary | `#586460` | `#ADBCB4` | Supporting information |
| action | `#0B6256` | `#83D6C1` | Primary actions, actionable links, selection |
| onAction | `#FFFFFF` | `#072F29` | Text/icons on action fill |
| separator | `#DCE4DF` | `#35443B` | Decorative dividers only |
| inputOutline | `#76877F` | `#879C93` | Visible field boundary |
| focus | `#0B6256` | `#83D6C1` | Focus indication with an offset |

Use a visible focus outline with separation from filled controls. A subtle separator is not an input's sole boundary. Do not apply whole-control opacity to enabled controls or secondary text.

### Status pairs

Each state has a text/icon color and a subtle background. A status must always have a written label. Teal branding must not be the only evidence that a parcel was delivered.

| Meaning | Light foreground / background | Dark foreground / background | Example label |
| --- | --- | --- | --- |
| Attention | `#915B08` / `#FFF2D9` | `#F2C66D` / `#302710` | Your response needed |
| Transit/information | `#2457A6` / `#EAF1FF` | `#9ABEFF` / `#162840` | Out for delivery |
| Confirmation/success | `#16674A` / `#E6F5ED` | `#88DBB1` / `#153327` | Availability confirmed |
| Error/destructive | `#B42332` / `#FDECEF` | `#FFADB4` / `#3B1C24` | Code expired |
| Neutral | textSecondary on surface | textSecondary on surface | Booked, cancelled |

Availability and transport status remain separate data fields. "Availability confirmed" never implies "Delivered". A pending receiver invitation stays an attention state until accepted.

### Typography

The implementation uses the system face with no downloaded font. `AppText` applies the shared variants and preserves React Native's default font scaling. Values below are numeric baseline logical units, not fixed rendered heights or native CSS pixels. Navigation-owned screen-title behavior remains planned for feature screens.

| Variant | Baseline size / line height | Weight | Implementation use |
| --- | --- | --- | --- |
| display | 36 / 42 | 600 | Wide gallery heading |
| title | 28 / 36 | 600 | Compact gallery heading, delivery window |
| heading | 20 / 28 | 600 | Gallery sections, availability question |
| body | iOS 17; Android/web 16 / 24 | 400 | Instructions and explanations |
| action | iOS 17; Android/web 16 / 24 | 600 | Action labels |
| supporting | iOS 15; Android/web 14 / 20 | 400 | Timestamps and descriptions |
| label | 14 / 20 | 600 | Status and row labels |
| code | 28 / 36 | 500, platform monospace | Defined token; no code-entry component yet |

Important instructions can wrap. Native large-text behavior and authorized handoff-code formatting still require implementation and device verification.

### Spacing and shape

The implemented spacing scale is 2, 4, 8, 12, 16, 24, 32, 48, and 64 logical units. The gallery uses 16-unit compact gutters and 32-unit wide gutters, with a 960-unit two-column threshold. React Native values are numeric logical units; web projections use CSS pixels.

Implemented gallery radii: 8 for status labels, 12 for the availability panel and brand swatch, and 16 for the delivery container. The 999-unit pill token is defined but unused in the gallery. Native buttons, sheets, switches, and pickers keep their platform shapes. Radius is not a reason to put every row inside a card. Avoid decorative shadows; native sheets and navigation surfaces own their elevation.

All interactive hit regions should be at least 48 by 48 logical units. This exceeds the iOS 44 pt minimum and matches the Android 48 dp target. A button's height may grow with text. Badge text is not itself a touch target.

### Icons and motion

Use SF Symbols on iOS and Material Symbols on Android through the existing SDK tooling. Use an icon with a label for unfamiliar actions; do not rely on icon shape or color alone. Avoid emoji as interface icons.

Keep native push, back, sheet, and selection behavior. Any custom state feedback should be brief and interruptible, with Reduce Motion respected. The pending-to-confirmed availability change updates text and icon in place. No celebratory animation should block the next action.

## 4. Component and pattern contracts

These are intended behavior contracts, not a completed component inventory. `AppText` and `StatusLabel` are shared primitives. The gallery uses platform-native `@expo/ui` Button/Picker controls and local delivery compositions; labeled fields, code entry, full loading/disabled states, and the remaining patterns are planned. Build only the shared abstractions that repeated screens need. Native controls should not acquire wrappers merely to become part of the design system.

| Component/pattern | Content and states | Implementation direction |
| --- | --- | --- |
| Primary action | One main action; default, pressed, focused, disabled, pending | Check the SDK 58 @expo/ui Button first; pending preserves a readable label and prevents duplicate submission |
| Secondary action | Alternative receiver or other path; outlined/plain native treatment | Must remain discoverable beside the primary path; destructive actions use explicit copy |
| Labeled field | Persistent label, value, optional hint, error text | Check @expo/ui form/text-input primitives; errors link to their field and preserve its draft |
| Status label | Written transport or availability state, optional symbol | Compact, noninteractive; label + icon + color |
| Availability panel | Window, question, consequence, response actions | Custom composition; distinct awaiting, saving, confirmed, unavailable, stale-confirmation, and failure states |
| Delivery summary | Parcel description, window, route summary, status, identifier | Large clickable area only if the whole summary opens details; accessible label names the parcel |
| Journey timeline | Ordered events with text and timestamps | Custom content layout; completed/current/future are explicit, no fabricated progress percentage |
| Receiver row | Name, authorization scope, invitation state, manage action | Pending/accepted/revoked/expired; removing a receiver explains code invalidation |
| Entrance guidance | Address, entrance note, optional pin/photo, edit action | Grouped content; missing image is a text fallback rather than an empty photo box |
| Notice | Context, consequence, recovery action | Offline, failure, permission denied; never replace the entire screen when existing data is usable |
| Empty/error pattern | What happened and the useful next action | Separate first-load, genuine-empty, cached/offline, and retryable-error states |
| Notification row | Event summary, time, unread indication, delivery link | No handoff code or private address in push content; unread uses an accessible label as well as a dot |

### Interaction details

- A pending action retains its place and says "Confirming..." or "Saving..."; it does not dismiss before success.
- Disabled actions explain the prerequisite nearby, such as "Waiting for the receiver to accept."
- A field error states the correction: "Choose a delivery window that ends after it starts."
- Failed saves preserve the draft. A retry does not create a duplicate booking or invitation.
- Native confirmation alerts handle consequential actions such as revoking a receiver; focused forms use native sheets or stack screens.
- A six-digit code uses one accessible text entry with a numeric keyboard and paste support. It may be visually grouped without six separate focus stops.
- Code errors distinguish invalid, expired, locked, revoked, and already used. No client-only success screen can mark a real delivery complete.

## 5. First screen specification

Surface: recipient delivery details. Purpose: respond to an availability request and inspect the handoff. This is an operating screen used around a planned delivery window. The order is a proposed composition to review, not a native screenshot.

```text
Native navigation: Back                  Delivery

Parcel PC-1042
Today, 2:00 to 4:00 PM
Booked

[Availability panel]
Your response needed
Can you receive this parcel?
Confirm before the rider leaves.

[ I'll be there ]
[ Choose someone else ]
Request another time

Parcel
Small parcel · Demo delivery

Journey
Pickup     Sample shop
Drop-off   Sample home

Entrance guidance                         Edit
Use the side entrance beside the gate.

Delivery progress
Booked → Accepted → Picked up
       → Out for delivery → Delivered
```

The progress line above is a reading-order sketch. In the app it becomes a vertical timeline that can fit large text. Sample people, IDs, and places are fictional. The delivery window is scheduled information, not a live ETA guarantee.

### Screen changes by state

| Condition | Main content/action |
| --- | --- |
| Awaiting response | Availability question and "I'll be there" |
| Confirmed | "You're available for this window" with a check symbol; "Change availability" remains available |
| Recipient unavailable | Explain receiver/reschedule choices; do not present the delivery as cancelled |
| Receiver invited | "Waiting for [name] to accept"; manage/revoke action; no confirmation success yet |
| Receiver accepted | Name the authorized receiver; confirmation applies only to the active window |
| Window changed | Explain that the old confirmation no longer applies; ask for a new response |
| Out for delivery | Transport status is prominent; an authorized recipient/receiver can open the code screen when eligible |
| Offline | Show saved details and last updated time; explain that confirmation and final verification require reconnecting |
| Delivered | Completed timeline and handoff time; hide obsolete confirmation actions and code |

The rider's corresponding detail screen uses the same window, route, guidance, and status vocabulary. It exposes "Enter handoff code" only at the correct stage. The rider never sees a code-display component. Sender and receiver surfaces reuse the same content patterns while exposing only authorized data/actions.

## 6. Native behavior and accessibility

- iOS uses native navigation titles, swipe-back, system sheets and pickers. Android keeps system/predictive back, Material controls, and platform feedback.
- Preserve safe-area insets and keyboard reachability. A sticky action must never cover an instruction, error, tab bar, or keyboard input.
- At large text sizes, panels and buttons grow and horizontal action rows stack. Test at 200% text scaling and the OS accessibility sizes; required actions remain reachable by scrolling.
- Read status, consequence, and next action in that order with VoiceOver/TalkBack. Announce async completion politely without moving focus unexpectedly.
- Use visible labels; placeholders are examples, not labels. Icons and touch targets need meaningful accessible names.
- Photos are optional; equivalent text guidance is always possible. Location permission denial permits typed guidance and manual pin selection.
- Verify the palette in both appearances and increased-contrast settings. Color contrast alone does not establish overall accessibility.
- The current gallery shows awaiting, confirmed, receiver-pending, and offline-error demo states in light/dark appearances. Loading, disabled, and native large-text examples remain future work. Web captures are useful previews but are not evidence of native conformance.

## 7. Contrast calculations

The static pairs below were calculated using WCAG relative luminance. They pass 4.5:1 for normal text; input outlines pass 3:1 against the stated surface. This verifies only those static color pairs, not native semantic values or rendered screens.

| Pair | Light ratio | Dark ratio |
| --- | --- | --- |
| Primary button text/fill | 7.25:1 | 8.53:1 |
| Body text/page background | 16.39:1 | 15.89:1 |
| Secondary text/surface | 6.16:1 | 7.82:1 |
| Attention label/background | 5.12:1 | 9.19:1 |
| Transit label/background | 6.20:1 | 7.92:1 |
| Confirmation label/background | 6.07:1 | 8.35:1 |
| Error label/background | 5.71:1 | 8.63:1 |
| Input outline/surface | 3.79:1 | 5.30:1 |

Secondary text and input outlines were checked on `#FFFFFF` in light appearance and `#1B2721` in dark appearance. Disabled appearance, focus treatment, system controls, and native colors still need rendered verification.

## 8. Implementation sequence after discussion

1. Keep the approved deep teal action color and review the supporting palette and recipient screen ordering. Record the accepted system in DESIGN.md when implementing; color approval does not approve every component or layout.
2. Extend the existing theme and establish typography/spacing usage. Preserve compatibility while retiring starter-only examples deliberately.
3. Implement the recipient detail screen and component examples in light/dark appearances, using @expo/ui where suitable and thin Expo Router routes.
4. Add only the patterns required by the booking, receiver, and rider handoff flows. Keep sample actions labeled as demo behavior.
5. Verify native layouts, text scaling, screen-reader order, keyboard behavior, denial/error recovery, and status/code privacy before connecting the backend.

The theme tokens, text/status primitives, appearance provider, and `/explore` gallery have now been implemented. Appearance follows the system by default; light/dark overrides are held in memory. The gallery supports local availability confirmation/reset, receiver pending/reset, and offline error/reset. Home remains the Expo starter. Backend services, notifications, and the full delivery flow have not been implemented.

Actual Expo web browser previews are saved as `docs/screenshots/tokens-light.png`, `tokens-dark.png` (1440 × 1120), and `mobile-light.png`, `mobile-dark.png` (430 × 1100). These are desktop and narrow web viewport captures, not iOS or Android screenshots. Review found no material visual issues in those captures. Typecheck, lint, SDK compatibility, actual color-pair contrast calculations, browser actions/overflow checks, and JavaScript exports for Android/iOS/web passed. The bundle check used unminified JavaScript with bytecode disabled; it does not establish native runtime behavior.

Native rendering, system accessibility text sizes, VoiceOver/TalkBack, and device interaction remain untested. No native conformance or usability-test results are claimed.
