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

## 6. Iconography & Visual Assets (No AI Glassy Renders)

- **NEVER use AI-generated 3D glassy orbs, plastic spheres, or synthetic renderings for product categories.**
  - Product and service categories must use crisp, authentic, native UI vector iconography (e.g. Lucide SVGs in high-end tailored accent containers) combined with authentic, genuine operator brand logos (MTN, Airtel, Glo, 9mobile, IKEDC, EKEDC, DStv, GOtv, WAEC, JAMB, etc.).
  - Never display artificial tags like *"Instant Vending"* or robotic headings like *"Vending Services"*. Use standard professional titles like *"Quick Services"* or *"Bill Payments & Top-up"*.

---

## 7. Mandatory KYC Gating on Wallet Funding

- **Unverified accounts (`kycStatus !== 'VERIFIED'`) MUST NOT be allowed to fund wallets or initiate transactions.**
  - Clicking **"Fund Wallet"** (or attempting to access settlement funding routes) must immediately intercept and open the KYC Identity Verification modal.
  - Identity verification with NIMC must precede all wallet deposits and live payouts.

---

## 8. Anti-AI Copy, Form Standardization & Auth UI Discipline

- **Accurate VTU & Developer API Positioning**:
  - Present BAXATO truthfully as a VTU, utility bill payments (local & international airtime, data bundles, electricity, cable TV, exam PINs), and developer API platform with merchant support — never generic payment-processor hype (`"Empowering High-Growth Digital Commerce & Payments"`, `"Bank-Grade Ledger"`, etc.).
- **Concise Human Copy & Short Action Labels**:
  - Keep copy direct and trim unnecessary helper essays under inputs to reduce page length.
  - Use natural wording (`"sent"` instead of `"dispatched"`) and concise button labels (`Login`, `Verify`, `Send code`, `Create Account`) instead of verbose phrases like `"Sign In to Merchant Console"` or `"Verify & Sign In"`.
  - Keep clean brand loading animations during async transitions without `"Authenticating..."` / filler loading words.
- **Standardized Controls & Minimal Chrome**:
  - Use unified `h-11`, `1px`-bordered, `rounded-lg` fields/selects and matching `h-11` CTA buttons across mobile and desktop.
  - Avoid trailing arrow icons (`ArrowRight`) on primary CTA buttons and omit theme/mode toggle icons (`ThemeToggle`) and decorative card clutter on Login and Create Account pages.

---

## 9. Deployment & Workflow

- All changes must pass TypeScript validation and unit tests (`pnpm vitest run`).
- Once verified, commit clean changes and push directly to GitHub (`origin/main`).
