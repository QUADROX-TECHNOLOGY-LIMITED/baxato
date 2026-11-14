# BAXATO Agent Instructions

All AI agents and engineers contributing to BAXATO must follow `BAXATO_GUIDELINES.md` and `.agents/rules/baxato_ui_guidelines.md`.

## Core Product & UI Rules

1. **Product Identity (VTU, Bill Payments & Developer API — NOT a Payment Gateway)**
   - BAXATO is a VTU, utility bill payments, and developer API platform (local and international airtime, mobile data bundles, electricity meter tokens, cable TV subscriptions, exam PINs, and REST API / webhook integrations).
   - Never use inaccurate generic payment-gateway copy such as `"Empowering High-Growth Digital Commerce & Payments Across Nigeria"`, `"Bank-Grade Ledger"`, `"Instant Wallet Settlement"`, or `"Join thousands of businesses..."`.
   - Always include clean merchant Support info where appropriate, alongside real platform services and API access.

2. **No AI-Cliché Copy or Verbose Helper Text**
   - Keep UI copy concise, direct, and natural.
   - Never use robotic/AI words such as `"Dispatched"`, `"Authenticating..."`, `"Verifying security credentials..."`, or `"Vending Services"`. Use natural language like `"sent"`.
   - Keep button labels short and industry-standard (`Login`, `Create Account`, `Verify`, `Send code`, `Confirm`) — never bloated phrases like `"Sign In to Merchant Console"` or `"Verify & Sign In"`.
   - Never write verbose paragraph explanations beneath obvious form inputs (e.g., no helper essays explaining WhatsApp alerts or reminding users to verify fields to unlock the submit button). Trim unnecessary text to keep page height compact.

3. **Standardized Form Controls, Centering & Base-Surface Discipline**
   - Keep Login, 2FA, and Create Account vertically and horizontally centered across mobile and desktop (`min-h-[100dvh]`, `my-auto`), and keep OTP feedback transient and minimal (e.g. a short auto-dismissing `"Code sent"` hint, not a permanent `"A 6-digit code has been sent to..."` alert block).
   - Use the unified base theme background (`#FFFFFF` light / `#070D18` dark) without inventing extra white-on-white or shaded card/panel backgrounds.
   - Standardize inputs, select triggers (`SearchableSelect`), and primary CTA buttons to consistent industry-standard proportions across mobile and desktop (`h-11`, `1px` border, `rounded-lg`, clean focus ring).
   - Do not place trailing arrow icons (`ArrowRight`) inside standard CTA buttons (`Login`, `Verify`, `Create Account`).
   - Do not include color/theme mode toggle icons (`ThemeToggle`) or decorative icon cards on Login or Create Account pages.

4. **Clean Minimal Loading States**
   - Keep loading states on form submissions and transitions, rendered with a clean visual brand loader — never display `"Authenticating..."` or filler status words during loading.

5. **Zero Upstream Leaks & Security First**
   - Never expose upstream provider names (`Interswitch`, `Monnify`, `ZeptoMail`, `VTPass`, `ClubKonnect`, `Paystack`, `Flutterwave`, etc.) in user-facing UI, copy, or public errors.
   - Never fabricate metrics, counts (`"4 Networks"`, `"11 DisCos"`, `"99.98% Uptime"`), or hardcoded `"Sandbox"` tags.
   - Security and validation checks must never be weakened for UI simplification.

