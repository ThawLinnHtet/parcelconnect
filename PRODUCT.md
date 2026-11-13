# ParcelConnect

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Senders, recipients, riders, and authorized trusted receivers. The immediate audience is a portfolio reviewer exploring a fictional delivery scenario.

## Product purpose

Coordinate a parcel handoff before dispatch: confirm the recipient's availability, provide entrance guidance, authorize an alternative receiver, and verify receipt with a one-time code. The full product remains planned; the repository contains an Expo starter, implemented design tokens, an interactive design preview, and documentation.

## Stack

React Native, Expo SDK 58, TypeScript, Expo Router, and @expo/ui. Supabase is the chosen future backend. Supabase email/password signup will skip email confirmation in the portfolio environment. In-app notifications and Expo Push Notifications are planned.

## Operating context

One app demonstrates sender, recipient, and rider perspectives. Mock role switching must stay separate from backend authorization. All sample deliveries use fictional people and locations. See docs/PRD.md for behavior and acceptance criteria.

## Capabilities and constraints

The portfolio scope excludes payments, real courier operations, route optimization, and a production live-location service. Final handoff verification must be authorized and atomic on the backend. Reduced failed deliveries is an intended benefit without measured evidence. Native behavior, large text, system light/dark appearance, and permission-denial recovery are required.

## Brand commitments

The working app name is ParcelConnect; the GitHub repository is ThawLinnHtet/parcelconnect (renamed from pickora). The user requested Mobbin as a design reference and chose to discuss a design specification before implementing components or a preview screen. On 2026-11-13, the user approved keeping the proposed deep teal brand color. The specification records its light/dark action values. The requested token implementation and gallery now make the supporting palette and component treatment reviewable in code. Full delivery screens remain planned; no logo has been approved.

## Evidence on hand

The PRD and AGENTS.md capture scope and engineering constraints. docs/DESIGN_SYSTEM.md records a proposed design system and the iOS Mobbin screens inspected. Browser previews of the token gallery are available under docs/screenshots. There are no native device captures or usability-test results.

## Product principles

- Put the next required handoff action before secondary tracking information.
- Separate availability confirmation from parcel transport status.
- Make alternative receivers explicit and revocable.
- Keep the demo honest about simulation, permissions, and unimplemented services.
