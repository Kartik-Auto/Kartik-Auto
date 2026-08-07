// spec: specs/program-creation.md
// seed: tests/seed.spec.ts

import { expect, test } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { ProgramPage } from './pages/ProgramPage';
import config from './config.json';

test.describe('Program Creation — FutureOne Sports', () => {
  test('PC-01 | Program creation happy path', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const programPage = new ProgramPage(page);

    await loginPage.goto(config.baseUrl);
    await loginPage.login(config.username, config.password);
    await expect(page).not.toHaveURL(/\/login\/?$/i);

    const program = await programPage.createProgramEndToEnd();
    ProgramPage.assertDateRules(program);

    await programPage.completeTournamentDetails();
    await programPage.completeRegistrationSetup(program);
    await programPage.skipPaymentPlans();
    await programPage.completePlayerEligibility();

    const locationName = await programPage.attachExistingLocation();
    expect(locationName.length).toBeGreaterThan(0);

    const waiverName = await programPage.attachExistingWaiver();
    expect(waiverName.length).toBeGreaterThan(0);

    await programPage.expectPublishEnabled();
    await programPage.publishProgram();

    console.log(`[ProgramCreation] Published program: ${program.name}`);
  });
});
