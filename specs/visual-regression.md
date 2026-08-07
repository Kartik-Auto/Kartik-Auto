# Visual Regression Tests

**Tag:** `@visual`  
**Project:** `visual` (separate from default `chromium` E2E)

## Covered screens

1. Login page
2. Parent dashboard (dynamic child/pending sections masked)
3. Add child profile form (guardian block masked)

## Run

```bash
# Visual tests only
npx playwright test --project=visual --workers=1

# Or by tag
npx playwright test --grep @visual --workers=1

# Create / refresh baselines (run on CI OS — Ubuntu — for stable CI diffs)
npx playwright test --project=visual --update-snapshots --workers=1
```

## Baselines

Stored next to specs:

```
tests/visual/login.visual.spec.ts-snapshots/
tests/visual/parent-dashboard.visual.spec.ts-snapshots/
tests/visual/add-child-form.visual.spec.ts-snapshots/
```

Commit `*-snapshots/*.png` to git.

## CI note

GitHub Actions uses **Linux**; baselines generated on macOS may differ slightly. Regenerate on Linux (or in CI) if visual tests fail only in CI.
