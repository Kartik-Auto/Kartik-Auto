// Visual regression — parent dashboard (masked dynamic child data)
// Update baselines: npx playwright test --project=visual --update-snapshots

import { test } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { ParentDashboardPage } from '../pages/ParentDashboardPage';
import {
  expectScreenshot,
  parentDashboardMasks,
  prepareForScreenshot,
  waitForToastsToClear,
} from '../helpers/visualRegression';
import config from '../config.json';

test.describe('Visual — Parent dashboard', { tag: '@visual' }, () => {
  test('Parent dashboard layout', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new ParentDashboardPage(page);

    await loginPage.goto(config.baseUrl);
    await loginPage.login(config.parentUsername, config.parentPassword);
    await dashboardPage.expectOnDashboard();
    await waitForToastsToClear(page);
    await prepareForScreenshot(page);

    await expectScreenshot(page.locator('main'), 'parent-dashboard', parentDashboardMasks(page));
  });
});
