import { Page } from '@playwright/test';

/** Pause between heavy UI steps (local runs). Set PW_STEP_PACE_MS=0 to disable. */
export const STEP_PACE_MS = process.env.CI ? 0 : Number(process.env.PW_STEP_PACE_MS ?? 500);

export async function pace(page: Page, ms: number = STEP_PACE_MS) {
  if (ms > 0) {
    await page.waitForTimeout(ms);
  }
}
