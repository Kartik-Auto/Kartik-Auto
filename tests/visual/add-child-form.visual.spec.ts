// Visual regression — add child profile form (empty, masked guardian block)
// Update baselines: npx playwright test --project=visual --update-snapshots

import { test } from '@playwright/test';
import { AddChildProfilePage } from '../pages/AddChildProfilePage';
import { LoginPage } from '../pages/LoginPage';
import { ParentDashboardPage } from '../pages/ParentDashboardPage';
import {
  addChildFormMasks,
  expectScreenshot,
  prepareForScreenshot,
  waitForToastsToClear,
} from '../helpers/visualRegression';
import config from '../config.json';

test.describe('Visual — Add child form', { tag: '@visual' }, () => {
  test('Add child profile form', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new ParentDashboardPage(page);
    const addChildPage = new AddChildProfilePage(page);

    await loginPage.goto(config.baseUrl);
    await loginPage.login(config.parentUsername, config.parentPassword);
    await dashboardPage.openAddChildProfile();
    await addChildPage.expectOnAddChildForm();
    await waitForToastsToClear(page);
    await prepareForScreenshot(page);

    await expectScreenshot(
      addChildPage.formDrawer(),
      'add-child-profile-form',
      addChildFormMasks(page),
    );
  });
});
