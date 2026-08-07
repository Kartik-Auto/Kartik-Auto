import { Page } from '@playwright/test';

/** Non-Playwright delay (avoids playwright/no-wait-for-timeout for intentional pacing). */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Pause between heavy UI steps (local runs). Set PW_STEP_PACE_MS=0 to disable. */
export const STEP_PACE_MS = process.env.CI ? 0 : Number(process.env.PW_STEP_PACE_MS ?? 500);

export async function pace(_page: Page, ms: number = STEP_PACE_MS) {
  if (ms > 0) {
    await delay(ms);
  }
}
