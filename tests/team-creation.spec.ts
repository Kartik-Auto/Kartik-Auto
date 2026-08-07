// spec: specs/team-creation.md
// seed: tests/seed.spec.ts

import { expect, test, type BrowserContext } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { ProgramPage } from './pages/ProgramPage';
import { TeamPage } from './pages/TeamPage';
import config from './config.json';

test.describe.configure({ mode: 'serial' });

test.describe('Team Creation — FutureOne Sports', () => {
  let context: BrowserContext;
  let programPage: ProgramPage;
  let teamPage: TeamPage;
  let programName: string;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    const page = await context.newPage();

    const loginPage = new LoginPage(page);
    await loginPage.goto(config.baseUrl);
    await loginPage.login(config.username, config.password);
    await expect(page).not.toHaveURL(/\/login\/?$/i);

    programPage = new ProgramPage(page);
    teamPage = new TeamPage(page);
    programName = await programPage.openExistingProgramWithTeamsRoster();
    expect(programName.length).toBeGreaterThan(0);

    await teamPage.openTeamsAndRosterTab();
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test.beforeEach(async () => {
    await teamPage.openTeamsAndRosterTab();
  });

  // Happy path: unique faker name creates a team on an existing program
  test('TM-01 | Create new team on existing program', async () => {
    const team = TeamPage.buildTeamData();

    await teamPage.openCreateTeamDialog();
    await teamPage.fillTeamName(team.name);
    await teamPage.submitCreateTeam();
    await teamPage.expectTeamCreatedToast();
    await teamPage.expectTeamInList(team.name);

    console.log(`[TeamCreation] Created team "${team.name}" on program "${programName}"`);
  });

  // Empty required field should block create
  test('TM-02 | Empty team name should show validation and not create', async () => {
    await teamPage.openCreateTeamDialog();
    await teamPage.clickSave();

    await teamPage.expectDialogStillOpen();
    await teamPage.expectTeamNameRequiredError();
    await teamPage.expectNoTeamCreatedSuccess();

    await teamPage.cancelCreateTeam();
  });

  // Cancel discards the form without saving
  test('TM-03 | Cancel should close dialog without creating team', async () => {
    const team = TeamPage.buildTeamData();

    await teamPage.openCreateTeamDialog();
    await teamPage.fillTeamName(team.name);
    await teamPage.cancelCreateTeam();

    await teamPage.expectTeamNotInList(team.name);
    await teamPage.expectNoTeamCreatedSuccess();
  });

  // Whitespace-only name should not create a team
  test('TM-04 | Whitespace-only team name should not create team', async () => {
    await teamPage.openCreateTeamDialog();
    await teamPage.fillTeamName('   ');
    await teamPage.clickSave();

    await teamPage.expectDialogStillOpen();
    await teamPage.expectNoTeamCreatedSuccess();

    await teamPage.cancelCreateTeam();
  });

  // Duplicate name within organization should be rejected
  test('TM-05 | Duplicate team name should show error and not create', async () => {
    const existingName = await teamPage.getFirstListedTeamName();
    const rowsBefore = await teamPage.teamRow(existingName).count();

    await teamPage.openCreateTeamDialog();
    await teamPage.fillTeamName(existingName);
    await teamPage.clickSave();

    await teamPage.expectDialogStillOpen();
    await teamPage.expectDuplicateTeamError();
    await teamPage.expectNoTeamCreatedSuccess();

    await teamPage.cancelCreateTeam();
    await expect(teamPage.teamRow(existingName)).toHaveCount(rowsBefore);
  });

  // Invalid logo file type should be rejected on upload
  test('TM-06 | Invalid logo file type should show validation error', async () => {
    const invalidLogo = TeamPage.createInvalidLogoFile();

    try {
      await teamPage.openCreateTeamDialog();
      await teamPage.uploadLogo(invalidLogo);

      await teamPage.expectDialogStillOpen();
      await teamPage.expectInvalidLogoTypeError();
      await teamPage.expectNoTeamCreatedSuccess();

      await teamPage.cancelCreateTeam();
    } finally {
      TeamPage.cleanupTempFile(invalidLogo);
    }
  });

  // Oversized logo should be rejected on upload
  test('TM-07 | Oversized logo should show file size validation error', async () => {
    const oversizedLogo = TeamPage.createOversizedLogoFile();

    try {
      await teamPage.openCreateTeamDialog();
      await teamPage.uploadLogo(oversizedLogo);

      await teamPage.expectDialogStillOpen();
      await teamPage.expectLogoTooLargeError();
      await teamPage.expectNoTeamCreatedSuccess();

      await teamPage.cancelCreateTeam();
    } finally {
      TeamPage.cleanupTempFile(oversizedLogo);
    }
  });
});
