# PlaywrightMCP — FutureOne Sports E2E Tests

Playwright end-to-end tests for FutureOne Sports (**Stage** by default, optional **UAT**).

## Setup

```bash
npm install
npx playwright install chromium
```

### Stage (default — existing setup still works)

Keep using your current local credentials file:

```bash
# If you don't have it yet:
cp tests/config/stage.example.json tests/config.json
# or:
cp tests/config/stage.example.json tests/config/stage.json
```

Edit credentials in `tests/config.json` (legacy) or `tests/config/stage.json`.

### UAT

```bash
cp tests/config/uat.example.json tests/config/uat.json
```

Edit `tests/config/uat.json` with UAT origin + credentials (update the host if your UAT URL differs).

## Run tests

```bash
# Stage (default) — same as before
npx playwright test --project=chromium
# or
npm run test:stage

# UAT
TEST_ENV=uat npx playwright test --project=chromium
# or
npm run test:uat

# Full organiser signup suite (use one worker — shared Mailinator inbox)
npx playwright test organiser-signup.spec.ts --workers=1

# Parent signup (serial — Mailinator)
npx playwright test parent-signup.spec.ts --workers=1

# Headed / slower local run
npx playwright test organiser-signup.spec.ts --headed --workers=1

# Visual regression (@visual)
npx playwright test --project=visual --workers=1
TEST_ENV=uat npm run test:visual:uat

# Refresh screenshot baselines
npx playwright test --project=visual --update-snapshots --workers=1
```

## Environments

| `TEST_ENV` | Config loaded |
|---|---|
| `stage` (default) | `tests/config/stage.json`, else legacy `tests/config.json` |
| `uat` | `tests/config/uat.json` |

Specs and page objects are shared. Only URLs/credentials change per env. Locators stay shared; if UAT differs, prefer resilient role/label/`data-testid` locators rather than forking specs.

Two per-env feature flags handle onboarding differences (both default to `true` on Stage and `false` on UAT, and can be overridden in the config JSON):

| Flag | Effect when `false` |
|---|---|
| `requireMobileOtp` | Mobile number is filled without the verify + OTP step |
| `organiserPersonalDetailsStep` | Organiser onboarding goes straight from role selection to Organization Details Step-1; TC-10 is skipped |
| `programFeePolicyDialog` | Create Program skips the "Confirm Transaction Fee Policy" dialog and goes straight to the form |

## Debugging (Trace Viewer)

Failed tests automatically capture **trace**, **screenshot**, and **video** (`retain-on-failure` / `only-on-failure`).

```bash
# Open HTML report — click "Trace" on a failed test
npx playwright show-report

# Force trace on a single run (e.g. while debugging)
npx playwright test tests/login.spec.ts --trace on

# Open a trace zip directly
npx playwright show-trace test-results/<folder>/trace.zip
```

## CI (GitHub Actions)

`.github/workflows/playwright.yml` runs the suite against Stage and/or UAT:

| Trigger | Environments |
|---|---|
| Pull request → `main`/`master` | Stage only (fast feedback) |
| Push → `main`/`master` | Stage + UAT |
| Nightly schedule (02:00 UTC) | Stage + UAT |
| Manual **Run workflow** | Pick `stage`, `uat`, or `both` |

Credentials are never committed. In CI, `scripts/write-ci-config.mjs` generates
`tests/config/<env>.json` from repository secrets. Add these under
**Settings → Secrets and variables → Actions**:

| Stage | UAT |
|---|---|
| `STAGE_ORIGIN` | `UAT_ORIGIN` |
| `STAGE_USERNAME` / `STAGE_PASSWORD` | `UAT_USERNAME` / `UAT_PASSWORD` |
| `STAGE_PARENT_USERNAME` / `STAGE_PARENT_PASSWORD` | `UAT_PARENT_USERNAME` / `UAT_PARENT_PASSWORD` |

The feature flags (`requireMobileOtp`, `organiserPersonalDetailsStep`,
`programFeePolicyDialog`) are set automatically by the generator: `true` for Stage,
`false` for UAT. Each environment uploads its own report artifact
(`playwright-report-<env>`); failures also upload `playwright-test-results-<env>`.

> Visual tests are intentionally left out of CI for now: `snapshotPathTemplate` in
> `playwright.config.ts` is keyed by project only, so UAT would be compared against
> Stage baselines. Add the env to the template before enabling visual in CI.

On CI, download the **playwright-report-\<env\>** or **playwright-test-results-\<env\>** artifacts from the workflow run.

## Project structure

- `tests/helpers/env.ts` — `TEST_ENV` loader (`getEnvConfig` / `config`)
- `tests/config/*.example.json` — Stage/UAT templates
- `tests/organiser-signup.spec.ts` — Organizer signup, email verification, onboarding (TC-01–TC-12)
- `tests/parent-signup.spec.ts` — Parent signup → personal details → Add Child popup
- `tests/pages/` — Page objects
- `tests/helpers/pacing.ts` — Optional step delays (`PW_SLOW_MO`, `PW_STEP_PACE_MS`)
- `tests/visual/*.visual.spec.ts` — Visual regression (`toHaveScreenshot`, `@visual`)
- `tests/helpers/visualRegression.ts` — Screenshot masks and animation disable helper
- `specs/visual-regression.md` — Visual test plan
- `docs/automation-status-summary.md` — Monthly automation status summary (coverage, framework, issues)
- `.github/workflows/playwright.yml` — CI workflow

## Notes

- Credential files (`tests/config.json`, `tests/config/stage.json`, `tests/config/uat.json`) are gitignored.
- Default `TEST_ENV` is **stage** — existing Stage runs are unchanged.
- Run signup/onboarding tests with `--workers=1` to avoid Mailinator race conditions.
