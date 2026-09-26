---
description: Critical UI and Architecture rules for BAXATO
globs: apps/dashboard/**/*, apps/api/**/*
---

# BAXATO Critical Architectural Rules

1. **NEVER Mention Upstream Providers to Users**:
   - Never expose vendor names (Interswitch, Monnify, ZeptoMail, VTPass, Paystack, Flutterwave, etc.) anywhere in customer UI, documentation, or public error envelopes. BAXATO is the sole platform and gateway.
2. **NO Fake Badges or Fabricated Metrics**:
   - Never invent fake operational stats, uptime percentages ("99.98% Gateway Uptime"), or "Operational" badges. Display only real dynamic data.
   - Do NOT clutter the UI with developmental vanity badges like "5 Verticals", "4 Networks", "11 DisCos", etc.
3. **NO Hardcoded Sandbox / Live Indicators**:
   - Do not hardcode or assume "Sandbox" on user cards or workspace selectors.
4. **Sleek Proportions & No Box-in-a-Box Clutter**:
   - Wallet card and metrics must be horizontally balanced and shrunken vertically.
   - Avoid heavy redundant card wrappers around sections (e.g. Recent Transactions should be clean and native to the page flow).
5. **Git Workflow**:
   - Push completed, verified commits directly to GitHub.
