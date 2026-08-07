# Automation Status Summary (Last ~1 Month)

**Project:** PlaywrightMCP — FutureOne Sports staging E2E  
**Period:** ~May 17 – Jun 17, 2026  
**Tooling:** Cursor + Playwright MCP (planner / generator / healer chatmodes)

---

## Key Automation Development

- Bootstrapped full Playwright TypeScript suite for `stage.futureonesports.com` (initial commit May 27).
- Built **16 page objects** in `tests/pages/` covering login, signup, onboarding, settings (staff, location, waiver), programs, divisions, parent dashboard, add-child, and membership payment.
- Added **spec-driven test plans** in `specs/` (parent signup, add-child, SP membership, program/division creation, visual regression).
- Introduced **Playwright MCP chatmodes** for test planning, generation, and healing (`.github/chatmodes/`).

---

## New Test Coverage (~40+ cases)

| Area | IDs | Count | File |
|------|-----|-------|------|
| Organiser signup & onboarding | TC-01–TC-12 | 12 | `tests/organiser-signup.spec.ts` |
| Parent signup | PS-01–PS-05 | 5 | `tests/parent-signup.spec.ts` |
| Add staff | AS-01–AS-03 | 3 | `tests/add-staff.spec.ts` |
| Locations | LC-01–LC-04 | 4 | `tests/location.spec.ts` |
| Waivers | WV-01–WV-05 | 5 | `tests/waiver.spec.ts` |
| Program creation (E2E publish) | PC-01 | 1 | `tests/program-creation.spec.ts` |
| Division creation (E2E publish) | DC-01 | 1 | `tests/division-creation.spec.ts` |
| Parent add child + SP membership | PAC-01–PAC-02 | 2 | `tests/existing-parent-add-child-profile.spec.ts` |
| Visual regression | 3 screens | 3 | `tests/visual/` |
| Login / email verification | — | 2 | `tests/login.spec.ts`, `tests/email-verification.spec.ts` |

**Flows covered end-to-end:** organiser signup → email verify → role select → personal/org details → dashboard; parent signup → dashboard; settings CRUD (staff, locations, waivers); program create → configure tabs → publish; division create → inherit program data → publish; parent add child → Stripe test-card membership purchase (Free → Premium).

---

## Framework Improvements

- **Dual Playwright projects:** `chromium` (functional E2E) + `visual` (screenshot regression) in `playwright.config.ts`.
- **Visual regression helpers:** animation disable, dynamic-content masks, shared screenshot tolerances in `tests/helpers/visualRegression.ts`.
- **Pacing helper** for local headed runs (`PW_SLOW_MO`, `PW_STEP_PACE_MS`) in `tests/helpers/pacing.ts`.
- **TypeScript strict mode** via `tsconfig.json`.
- **ESLint flat config** + `eslint-plugin-playwright` (`eslint.config.js`); migrated from `eslint.config.mts`.
- **Husky pre-commit** hook runs `npm test` (`.husky/pre-commit`).
- **CI pipeline** runs both E2E and visual projects; uploads HTML report + failure artifacts (`.github/workflows/playwright.yml`).
- **Debugging:** trace on all runs, screenshot/video on failure; README documents trace viewer workflow.
- **Serial execution** for Mailinator-dependent suites and shared-login settings suites (`test.describe.configure({ mode: 'serial' })`).
- **Test ID convention** standardized (`TC-`, `PS-`, `AS-`, `LC-`, `WV-`, `PC-`, `DC-`, `PAC-`).

---

## Script Maintenance & Bug Fixes

- Refactored `EmailVerificationPage` with Mailinator API v2 polling (inbox poll, message fetch, link extraction).
- Fixed role selection interactions — radio inputs are sr-only; tests click visible card headings (`RoleSelectionpage.ts`).
- Relaxed staff phone assertion to handle UI auto-formatting (digits-only compare) in add-staff flow.
- Waiver/location specs use shared `beforeAll` login + `beforeEach` list-page reset to reduce redundant navigation.
- Removed boilerplate `tests/example.spec.ts` and `tests/config.example.json`.
- Expanded README with per-suite run commands, visual test instructions, and debugging steps.

---

## Issues Identified Through Automation

- **Staff phone field:** UI applies extra formatting; strict `toHaveValue` fails — workaround uses digit-normalized `toContain` check.
- **Mailinator dependency:** Shared public inbox + API rate limits require `--workers=1` and serial suites; parallel signup tests race on inbox polling.
- **Payment status lag:** SP membership upgrade (Free → Premium) is async; tests poll dashboard up to 90s after Stripe test payment.
- **Visual regression OS drift:** Screenshot baselines generated on macOS may differ on Linux CI; baselines should be regenerated on Ubuntu for stable CI.
- **Optional phone OTP:** Parent/personal-details onboarding may show phone verification; automation skips via "Proceed without OTP" when offered.
- **Google Places autocomplete:** Org address fields may be pre-filled by Places API; tests conditionally skip typing when already populated.
- **Payment Plans tab:** Program/division flows skip payment-plan creation (not required for publish in current staging behavior).

---

## Ready-to-Paste Status Sheet Bullets

Copy these directly into a weekly/monthly tracker:

1. Established Playwright E2E framework for FutureOne Sports staging with page-object model and CI integration.
2. Delivered 12 organiser signup/onboarding tests (TC-01–TC-12) including Mailinator email verification.
3. Added 5 parent signup tests (PS-01–PS-05) covering validation, role selection, and dashboard landing.
4. Automated settings flows: 3 add-staff (AS), 4 location (LC), 5 waiver (WV) tests with serial shared-login pattern.
5. Built program creation E2E (PC-01): create → configure tabs → attach location/waiver → publish to Upcoming.
6. Built division creation E2E (DC-01): publish program → create division → inherit data → publish.
7. Automated parent add-child profile (PAC-01) and SP membership purchase with Stripe test card (PAC-02).
8. Added visual regression project for login, parent dashboard, and add-child form (3 baselines with dynamic masks).
9. Framework upgrades: visual project split, ESLint + Husky, TypeScript strict, trace/screenshot/video on failure, pacing helpers.
10. Integrated Cursor Playwright MCP chatmodes for AI-assisted planning, generation, and test healing.
11. Documented 6 feature test plans in `specs/` linked to automated tests via spec comments.
12. Issues logged: phone field formatting, Mailinator parallelism limits, async payment status updates, cross-OS visual baseline drift, optional OTP step handling.

---

## Caveat for Reporting

Git history shows **2 commits** on `main` (May 27). Substantial additional work (parent signup, program/division, visual tests, PAC flows, framework tooling) exists in the **current working tree** and may still need commit/push before it appears in repo history or CI runs on remote.
