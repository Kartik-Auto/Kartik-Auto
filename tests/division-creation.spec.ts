// spec: specs/division-creation.md
// seed: tests/seed.spec.ts

import { expect, test } from '@playwright/test';
import { DivisionPage } from './pages/DivisionPage';
import { LoginPage } from './pages/LoginPage';
import { ProgramPage } from './pages/ProgramPage';
import config from './config.json';

test.describe('Division Creation — FutureOne Sports', () => {
  test('DC-01 | Division creation happy path', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const programPage = new ProgramPage(page);
    const divisionPage = new DivisionPage(page);

    await loginPage.goto(config.baseUrl);
    await loginPage.login(config.username, config.password);
    await expect(page).not.toHaveURL(/\/login\/?$/i);

    const program = await programPage.createAndPublishProgramEndToEnd();
    ProgramPage.assertDateRules(program);
    await programPage.expectProgramStatus('Upcoming');

    const division = await divisionPage.createAndPublishDivision(program);

    console.log(`[DivisionCreation] Published division: ${division.name} for program: ${program.name}`);
  });
});
