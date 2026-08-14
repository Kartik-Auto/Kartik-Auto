import { test } from '@playwright/test';
import { getEnvConfig } from './helpers/env';

test('seed', async ({ page }) => {
  await page.goto(getEnvConfig().signupUrl, {
    waitUntil: 'domcontentloaded',
  });
});
