# PlaywrightMCP — FutureOne Sports E2E Tests

Playwright end-to-end tests for [FutureOne Sports](https://stage.futureonesports.com) staging.

## Setup

```bash
npm install
npx playwright install chromium
cp tests/config.example.json tests/config.json
```

Edit `tests/config.json` with your staging login credentials.

## Run tests

```bash
# Full organiser signup suite (use one worker — shared Mailinator inbox)
npx playwright test organiser-signup.spec.ts --workers=1

# Parent signup (serial — Mailinator)
npx playwright test parent-signup.spec.ts --workers=1

# Headed / slower local run
npx playwright test organiser-signup.spec.ts --headed --workers=1

# All E2E tests (excludes visual project)
npx playwright test --project=chromium

# Visual regression (@visual)
npx playwright test --project=visual --workers=1

# Refresh screenshot baselines
npx playwright test --project=visual --update-snapshots --workers=1
```

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

On CI, download the **playwright-report** or **playwright-test-results** artifacts from the workflow run.

## Project structure

- `tests/organiser-signup.spec.ts` — Organizer signup, email verification, onboarding (TC-01–TC-12)
- `tests/parent-signup.spec.ts` — Parent signup → personal details → dashboard (PS-01–PS-03)
- `tests/pages/` — Page objects
- `tests/helpers/pacing.ts` — Optional step delays (`PW_SLOW_MO`, `PW_STEP_PACE_MS`)
- `tests/visual/*.visual.spec.ts` — Visual regression (`toHaveScreenshot`, `@visual`)
- `tests/helpers/visualRegression.ts` — Screenshot masks and animation disable helper
- `specs/visual-regression.md` — Visual test plan
- `docs/automation-status-summary.md` — Monthly automation status summary (coverage, framework, issues)
- `.github/workflows/playwright.yml` — CI workflow

## Notes

- `tests/config.json` is gitignored (contains credentials).
- Run signup/onboarding tests with `--workers=1` to avoid Mailinator race conditions.
