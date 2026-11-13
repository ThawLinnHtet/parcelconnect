---
name: ParcelConnect
description: System typography, deep teal actions, and explicit parcel handoff states.
colors:
  light-text: "#141B1A"
  light-textSecondary: "#586460"
  light-background: "#F6F8F7"
  light-surface: "#FFFFFF"
  light-backgroundElement: "#EEF3F0"
  light-backgroundSelected: "#DCEDE5"
  light-action: "#0B6256"
  light-onAction: "#FFFFFF"
  light-separator: "#DCE4DF"
  light-inputOutline: "#76877F"
  light-focus: "#0B6256"
  light-attention: "#915B08"
  light-attentionSurface: "#FFF2D9"
  light-information: "#2457A6"
  light-informationSurface: "#EAF1FF"
  light-success: "#16674A"
  light-successSurface: "#E6F5ED"
  light-danger: "#B42332"
  light-dangerSurface: "#FDECEF"
  light-disabled: "#E3E9E5"
  light-onDisabled: "#586460"
  dark-text: "#EDF4F0"
  dark-textSecondary: "#ADBCB4"
  dark-background: "#111A16"
  dark-surface: "#1B2721"
  dark-backgroundElement: "#24332B"
  dark-backgroundSelected: "#304D40"
  dark-action: "#83D6C1"
  dark-onAction: "#072F29"
  dark-separator: "#35443B"
  dark-inputOutline: "#879C93"
  dark-focus: "#83D6C1"
  dark-attention: "#F2C66D"
  dark-attentionSurface: "#302710"
  dark-information: "#9ABEFF"
  dark-informationSurface: "#162840"
  dark-success: "#88DBB1"
  dark-successSurface: "#153327"
  dark-danger: "#FFADB4"
  dark-dangerSurface: "#3B1C24"
  dark-disabled: "#2E3B33"
  dark-onDisabled: "#ADBCB4"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, system-ui, sans-serif"
    fontSize: "36px"
    fontWeight: 600
    lineHeight: "42px"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: "36px"
  heading:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: "28px"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
  action:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: "24px"
  supporting:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: "20px"
  code:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "28px"
    fontWeight: 500
    lineHeight: "36px"
rounded:
  small: "8px"
  medium: "12px"
  panel: "16px"
spacing:
  half: "2px"
  one: "4px"
  two: "8px"
  twelve: "12px"
  three: "16px"
  four: "24px"
  five: "32px"
  fortyEight: "48px"
  six: "64px"
components:
  status-attention-light:
    backgroundColor: "{colors.light-attentionSurface}"
    textColor: "{colors.light-attention}"
    typography: "{typography.label}"
    rounded: "{rounded.small}"
    padding: "8px 12px"
  status-information-light:
    backgroundColor: "{colors.light-informationSurface}"
    textColor: "{colors.light-information}"
    typography: "{typography.label}"
    rounded: "{rounded.small}"
    padding: "8px 12px"
  status-success-light:
    backgroundColor: "{colors.light-successSurface}"
    textColor: "{colors.light-success}"
    typography: "{typography.label}"
    rounded: "{rounded.small}"
    padding: "8px 12px"
  status-danger-light:
    backgroundColor: "{colors.light-dangerSurface}"
    textColor: "{colors.light-danger}"
    typography: "{typography.label}"
    rounded: "{rounded.small}"
    padding: "8px 12px"
  status-attention-dark:
    backgroundColor: "{colors.dark-attentionSurface}"
    textColor: "{colors.dark-attention}"
    typography: "{typography.label}"
    rounded: "{rounded.small}"
    padding: "8px 12px"
  status-information-dark:
    backgroundColor: "{colors.dark-informationSurface}"
    textColor: "{colors.dark-information}"
    typography: "{typography.label}"
    rounded: "{rounded.small}"
    padding: "8px 12px"
  status-success-dark:
    backgroundColor: "{colors.dark-successSurface}"
    textColor: "{colors.dark-success}"
    typography: "{typography.label}"
    rounded: "{rounded.small}"
    padding: "8px 12px"
  status-danger-dark:
    backgroundColor: "{colors.dark-dangerSurface}"
    textColor: "{colors.dark-danger}"
    typography: "{typography.label}"
    rounded: "{rounded.small}"
    padding: "8px 12px"
---

# Design System: ParcelConnect

## Overview

This captures the implemented foundations and `/explore` gallery as of 2026-11-13. Deep teal is the user-approved action color. Supporting tokens and the gallery composition are implementation choices derived from the proposal, not separate user-approved brand decisions. No named creative metaphor or logo has been approved.

The current interface uses system typography, neutral surfaces, and written status labels. Availability is separate from transport status. The gallery demonstrates fictional handoff states; Home is still the Expo starter and the full component library and delivery workflows remain planned.

**Key Characteristics:**

- Deep teal actions in both appearances.
- System typography and platform controls.
- Status conveyed by a written label, symbol, and color.

`src/constants/theme.ts` is the runtime source of truth. Frontmatter lengths are its **web projection in CSS pixels**; React Native consumes numeric logical units, not CSS pixels. Body/action baselines are 17 on iOS and 16 on Android/web; supporting text is 15 on iOS and 14 on Android/web. Native font scaling can change rendered sizes. Do not copy CSS units into native styles.

## Colors

The primary action uses deep teal; neutral canvas and surface roles separate content without decorative shadows. Frontmatter records both implemented static palettes under `light-` and `dark-` prefixes. Resolve roles through `useTheme()` rather than choosing a palette in screen code.

Attention, information, success, and danger each have a foreground/surface pair. `StatusLabel` always includes text and a symbol. Success uses a check symbol; the other tones use an information symbol. Separators are decorative; the stronger `inputOutline` is used for field boundaries.

`AppearanceProvider` follows system appearance by default and permits light/dark preview overrides. The override is held in memory and resets when the app restarts. Colors are explicit static values; native semantic color adaptation has not been implemented.

## Typography

`AppText` applies the system sans face, a semantic text color, and the selected `Typography` variant. `code` uses the platform monospace face. No downloaded font is included. Display, title, heading, body, action, supporting, label, and code variants exist; a production code-entry component does not.

Display is used for the wide gallery heading; the compact gallery uses title. Body and supporting variants carry instructions and secondary information. React Native text keeps its default font-scaling behavior; native large-text behavior still requires device validation.

## Layout

The gallery uses 16-unit compact gutters and 32-unit wide gutters. At a layout width of 960 units it becomes two columns, with the delivery example 420 units wide; below that it stacks the example before the foundations. The preview container is capped at 1184 units. These are gallery layout choices, not a completed app-wide responsive contract.

The shared spacing scale is recorded in frontmatter. Gallery sections use gaps and separators; the sample delivery and availability request use bounded tonal surfaces. The minimum control target token is 48 logical units. Safe-area and tab insets contribute to scroll padding.

## Elevation & Depth

Custom gallery surfaces use tonal separation and no decorative shadows. The scoped web button fallback removes its box shadow. Native controls retain their platform rendering; no shared shadow scale is implemented.

## Shapes

Small corners apply to status labels and the web controls, medium corners to the brand swatch and availability panel, and panel corners to the sample delivery container. The `pill` radius exists in the token file but is not used in this gallery. Native button and picker shape remains platform-owned; the web fallback uses the small radius.

## Components

`AppText` and `StatusLabel` are shared primitives under `src/components/ui`. Status labels are noninteractive, wrap content, and use the label type variant with a small symbol.

Buttons and appearance/state pickers use `@expo/ui` through a `Host` with the current appearance and action seed. They are not a custom button or form library. The scoped web fallback adds control borders, a two-pixel focus outline with a four-pixel offset, primary hover brightness, secondary hover fill, and pressed opacity. Under reduced-motion preference it removes button transitions.

The gallery's local delivery composition supports awaiting reply, confirmed availability, receiver invitation pending, and offline error. Its buttons confirm/reset availability, choose/cancel a fictional receiver invitation, or reset the demo error. These are local state changes; they do not save data, contact a rider, invite a receiver, or test connectivity. Loading, disabled, native form, real code-entry, and backend recovery contracts remain planned in `docs/DESIGN_SYSTEM.md`.

Motion durations and easing are defined in the token source but are not wired to a custom animation. The sidecar records them as defined tokens, not evidence of animated runtime behavior.

## Do's and Don'ts

- **Do** import shared values from `src/constants/theme.ts` and resolve appearance through `useTheme()`.
- **Do** pair status color with a written label and symbol.
- **Do** label fictional data and local actions as demo behavior.
- **Don't** treat availability confirmation as delivery completion.
- **Don't** describe web browser captures as native iOS or Android validation.
- **Don't** treat the gallery as a complete component library or connected delivery workflow.
