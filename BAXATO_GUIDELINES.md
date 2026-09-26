# BAXATO Engineering & UI Guidelines

This document specifies non-negotiable guidelines, architectural constraints, and user interface standards for the BAXATO platform. Every engineer and AI agent contributing to this repository must strictly adhere to these rules.

---

## 1. Zero Upstream Provider Leaks (Strict White-Label Architecture)

- **NEVER mention upstream providers or vendor names in customer/merchant-facing UI, documentation, error envelopes, or ledger displays.**
  - **Forbidden names in UI**: `Interswitch`, `Monnify`, `ZeptoMail`, `VTPass`, `Shagalo`, `ClubKonnect`, `Paystack`, `Flutterwave`, or any upstream provider.
  - **BAXATO is the provider and gateway**: From the merchant's perspective, BAXATO is the sole infrastructure partner, switch, and aggregator.
  - Upstream vendor references are strictly confined to backend internal service drivers (`apps/api/src/services/providers/*`) and private administrative/super-admin logs.
  - Any UI labels like *"Routing Gateways: Interswitch & Monnify"* are **STRICTLY PROHIBITED**.

---

## 2. Zero Hardcoded / Fabricated Metrics & Status Badges

- **NEVER fabricate uptime, latency, success rates, or operational states.**
  - Fake badges like `"99.98% Gateway Uptime"` or fake `"Operational"` status chips without live health telemetry are strictly banned.
  - Do NOT clutter the UI with developmental vanity metrics like `"5 Verticals"`, `"4 Networks"`, `"11 DisCos"`, `"Instant Token"`, or `"Instant Reconnection"`.
  - Display only truthful, dynamic platform data (e.g. real transaction count, verified ledger balances).

---

## 3. Dynamic Environment Handling (No Hardcoded "Sandbox" Badges)

- **Do NOT hardcode "Sandbox" or "Live" environment tags.**
  - Environment badges must reflect dynamic user/business state, active API key environment (`TEST` vs `LIVE`), or explicit merchant workspace context—not an arbitrary or assumed static tag.
  - Do NOT display confusing or assumed "Sandbox" pills on virtual cards or workspace selectors.

---

## 4. UI Geometry, Hierarchy & Card Proportions

- **Sleek, Horizontal, Proportional Cards**:
  - Virtual ATM Debit Cards, wallet balance containers, and performance metric cards must be compact, proportional, and avoid excessive vertical stretching.
  - Do not use arbitrary bloated vertical heights (e.g., `min-h-[230px]` on simple metric cards).
- **No "Box-in-a-Box" Redundancy**:
  - Do NOT wrap every section in a heavy, bordered, nested card container.
  - Sections like **Recent Transactions** should be seamlessly integrated into the page flow with clean headers and direct data presentation.
  - Avoid nesting empty-state dashed boxes inside heavy wrapper cards.

---

## 5. KYC & Data Integrity

- **NIMC / Verification Fields**:
  - Name fields must be standard editable inputs prefilled with registered account details so users can easily edit or correct their names.
  - Never display artificial locked cards with literal `"Pre-filled"` badges.
  - When verified, the system overrides/updates user records with authenticated NIMC names and caches queries locally to prevent redundant third-party billing.

---

## 6. Deployment & Workflow

- All changes must pass TypeScript validation and unit tests (`pnpm vitest run`).
- Once verified, commit clean changes and push directly to GitHub (`origin/main`).
