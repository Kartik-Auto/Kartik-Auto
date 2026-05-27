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

# Headed / slower local run
npx playwright test organiser-signup.spec.ts --headed --workers=1

# All tests
npx playwright test
```

## Project structure

- `tests/organiser-signup.spec.ts` — Signup, email verification, onboarding (TC-01–TC-12)
- `tests/pages/` — Page objects
- `tests/helpers/pacing.ts` — Optional step delays (`PW_SLOW_MO`, `PW_STEP_PACE_MS`)
- `.github/workflows/playwright.yml` — CI workflow

## Notes

- `tests/config.json` is gitignored (contains credentials).
- Run signup/onboarding tests with `--workers=1` to avoid Mailinator race conditions.
