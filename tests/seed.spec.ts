import { test } from '@playwright/test';

test('seed', async ({ page }) => {
  await page.goto('https://stage.futureonesports.com/signup', {
    waitUntil: 'domcontentloaded',
  });
});
