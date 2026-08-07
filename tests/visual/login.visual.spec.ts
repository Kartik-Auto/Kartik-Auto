// Visual regression — login page layout
// Update baselines: npx playwright test --project=visual --update-snapshots

import { test } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { expectScreenshot, prepareForScreenshot } from '../helpers/visualRegression';
import config from '../config.json';

test.describe('Visual — Login', { tag: '@visual' }, () => {
  test('Login page', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto(config.baseUrl);
    await page.getByRole('textbox', { name: 'Email' }).waitFor({ state: 'visible' });
    await prepareForScreenshot(page);

    await expectScreenshot(page.locator('main').or(page.locator('body')), 'login-page');
  });
});
