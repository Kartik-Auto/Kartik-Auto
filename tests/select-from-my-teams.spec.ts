// spec: specs/select-from-my-teams.md
// seed: tests/seed.spec.ts

import { expect, test, type BrowserContext } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { ProgramPage } from './pages/ProgramPage';
import { TeamPage } from './pages/TeamPage';
import config from './config.json';

test.describe.configure({ mode: 'serial' });

test.describe('Select from My Teams — FutureOne Sports', () => {
  let context: BrowserContext;
  let programPage: ProgramPage;
  let teamPage: TeamPage;
  let programName: string;
  let addedTeamName: string;

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

  // Submit stays disabled until a team is chosen
  test('STM-03 | Submit should stay disabled when no team is selected', async () => {
    await teamPage.openSelectFromMyTeamsDialog();

    await teamPage.expectSelectSubmitDisabled();
    await teamPage.expectSelectFromMyTeamsDialogOpen();
    await teamPage.expectNoTeamCreatedSuccess();

    await teamPage.cancelSelectFromMyTeams();
  });

  // Cancel after choosing a team must not add it
  test('STM-04 | Cancel after selecting a team should not add it', async () => {
    const listedBefore = await teamPage.getListedTeamNames();

    await teamPage.openSelectFromMyTeamsDialog();
    const teamName = await teamPage.selectShortTeamFromDropdown(listedBefore);
    await teamPage.expectSelectSubmitEnabled();
    await teamPage.cancelSelectFromMyTeams();

    await teamPage.expectTeamNotInList(teamName);
    await teamPage.expectNoTeamCreatedSuccess();
  });

  // Add an existing short-named team from My Teams onto the program
  test('STM-01 | Add existing team via Select from My Teams', async () => {
    const listedBefore = await teamPage.getListedTeamNames();

    addedTeamName = await teamPage.addExistingTeamFromMyTeams(listedBefore);

    await expect(teamPage.teamRow(addedTeamName)).toHaveCount(1);
    console.log(
      `[SelectFromMyTeams] Added "${addedTeamName}" to program "${programName}"`,
    );
  });

  // Re-adding the same team must not create a duplicate list row
  test('STM-02 | Selecting an already-added team should not duplicate it', async () => {
    expect(addedTeamName, 'STM-01 must add a team first').toBeTruthy();
    const rowsBefore = await teamPage.teamRow(addedTeamName).count();
    expect(rowsBefore).toBe(1);

    await teamPage.openSelectFromMyTeamsDialog();
    const dialog = teamPage.selectFromMyTeamsDialog();
    await dialog.getByRole('combobox').first().click();

    const option = teamPage.page.getByRole('option', { name: addedTeamName, exact: true });
    if ((await option.count()) > 0) {
      await option.click();
      await dialog.getByRole('button', { name: 'Submit', exact: true }).click();

      const dialogStillOpen = await dialog.isVisible().catch(() => false);
      if (dialogStillOpen) {
        await teamPage.expectNoTeamCreatedSuccess();
        await teamPage.cancelSelectFromMyTeams();
      }

      await expect(teamPage.teamRow(addedTeamName)).toHaveCount(rowsBefore);
    } else {
      // Dropdown no longer offers the team — duplicate add is prevented at source
      await teamPage.page.keyboard.press('Escape');
      await teamPage.cancelSelectFromMyTeams();
      await expect(teamPage.teamRow(addedTeamName)).toHaveCount(rowsBefore);
    }
  });
});
