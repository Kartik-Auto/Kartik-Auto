import { expect, type Locator, type Page } from '@playwright/test';
import { faker } from '@faker-js/faker';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { randomAlpha } from '../helpers/testData';

export type TeamData = {
  name: string;
};

export class TeamPage {
  readonly page: Page;
  readonly teamsTab: Locator;
  readonly createTeamButton: Locator;
  readonly addMenuButton: Locator;
  readonly createTeamMenu: Locator;
  readonly teamsHeading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.teamsTab = page.getByRole('tab', { name: /Team & Roster/i });
    // Scope CTAs to the Team & Roster panel so we never match unrelated page controls.
    const panel = this.teamsPanel();
    this.createTeamButton = panel.getByRole('button', { name: 'Create New Team', exact: true });
    // Use getByRole('button') — locator('button') also matches <button role="combobox">.
    this.addMenuButton = panel.getByRole('button', { name: 'Add', exact: true });
    this.createTeamMenu = panel
      .locator('[role="combobox"]:not([disabled]):not([data-disabled])')
      .filter({ hasText: /Create New Team|^Add$|Select from My Teams/i });
    this.teamsHeading = page.getByRole('heading', { name: /Teams & Roster/i });
  }

  /** Team & Roster tab content — empty-state buttons and Add menu live here. */
  private teamsPanel(): Locator {
    return this.page.getByRole('tabpanel', { name: /Team & Roster/i });
  }

  static buildTeamData(overrides: Partial<TeamData> = {}): TeamData {
    return {
      name: `QA Team ${faker.word.adjective()} ${randomAlpha(5)}`,
      ...overrides,
    };
  }

  /** Tiny invalid text file for logo type validation. */
  static createInvalidLogoFile(): string {
    const filePath = path.join(os.tmpdir(), `invalid-team-logo-${Date.now()}.txt`);
    fs.writeFileSync(filePath, 'not-an-image');
    return filePath;
  }

  /** Oversized non-image file (>5MB) for logo size validation. */
  static createOversizedLogoFile(sizeBytes = 6 * 1024 * 1024): string {
    const filePath = path.join(os.tmpdir(), `oversized-team-logo-${Date.now()}.png`);
    fs.writeFileSync(filePath, Buffer.alloc(sizeBytes, 1));
    return filePath;
  }

  static cleanupTempFile(filePath: string): void {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // ignore missing temp file
    }
  }

  createTeamDialog(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: /Create new Team/i });
  }

  selectFromMyTeamsDialog(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: /Select from My Teams/i });
  }

  selectFromMyTeamsButton(): Locator {
    return this.teamsPanel().getByRole('button', { name: /Select from My Teams/i });
  }

  teamNameInput(): Locator {
    return this.createTeamDialog().getByRole('textbox', { name: /Team name/i });
  }

  teamNameRequiredError(): Locator {
    return this.createTeamDialog().getByText('Team name is required', { exact: true });
  }

  logoFileInput(): Locator {
    return this.createTeamDialog().locator('input[type="file"]');
  }

  teamRow(teamName: string): Locator {
    return this.page.getByRole('row').filter({ hasText: teamName });
  }

  async openTeamsAndRosterTab(): Promise<void> {
    await this.teamsTab.click();
    await expect(this.teamsTab).toHaveAttribute('aria-selected', 'true');
    await expect(this.teamsHeading).toBeVisible();
  }

  /**
   * Empty state exposes Create New Team as a button; otherwise open the
   * Create New Team / Add combobox and choose Create New Team.
   */
  async openCreateTeamDialog(): Promise<void> {
    await expect(this.teamsHeading).toBeVisible();
    await this.waitForTeamEntryControls();

    const noTeamsYet = this.teamsPanel().getByRole('heading', { name: /No teams yet/i });
    if (
      (await noTeamsYet.isVisible().catch(() => false))
      || (await this.createTeamButton.isVisible().catch(() => false))
    ) {
      await expect(this.createTeamButton).toBeVisible();
      await this.createTeamButton.click();
    } else {
      await this.chooseTeamMenuOption('Create New Team');
    }

    await expect(this.createTeamDialog()).toBeVisible();
  }

  /**
   * Wait for empty-state CTAs (No teams yet) or the populated-state Add/Create menu.
   */
  private async waitForTeamEntryControls(): Promise<void> {
    await expect(this.teamsHeading).toBeVisible();
    await this.createTeamButton
      .or(this.selectFromMyTeamsButton())
      .or(this.addMenuButton)
      .or(this.createTeamMenu)
      .first()
      .waitFor({ state: 'visible' });
  }

  /**
   * Open Add / Create New Team menu and choose an option.
   * If the combobox already shows the same option, Radix will not re-fire —
   * toggle via the other option first so Create New Team opens again.
   */
  private async chooseTeamMenuOption(
    optionName: 'Create New Team' | 'Select from My Teams',
  ): Promise<void> {
    const resolveMenu = async () => {
      if (await this.addMenuButton.isVisible().catch(() => false)) {
        return this.addMenuButton;
      }
      if (await this.createTeamMenu.isVisible().catch(() => false)) {
        return this.createTeamMenu;
      }
      throw new Error('Team entry menu (Add / Create New Team) is not available');
    };

    let menu = await resolveMenu();
    await expect(menu).toBeVisible();
    await expect(menu).toBeEnabled();

    const currentLabel = ((await menu.innerText()) || '').replace(/\s+/g, ' ').trim();
    await menu.click();
    await expect(this.page.getByRole('option').first()).toBeVisible();

    // Radix does not re-fire when the already-selected option is clicked again —
    // toggle via the other option first so the target dialog opens.
    const alreadySelected =
      (optionName === 'Create New Team' && /Create New Team/i.test(currentLabel))
      || (optionName === 'Select from My Teams' && /Select from My Teams/i.test(currentLabel));

    if (alreadySelected) {
      const otherOption =
        optionName === 'Create New Team' ? 'Select from My Teams' : 'Create New Team';
      await this.page.getByRole('option', { name: otherOption, exact: true }).click();

      if (otherOption === 'Select from My Teams') {
        if (await this.selectFromMyTeamsDialog().isVisible().catch(() => false)) {
          await this.cancelSelectFromMyTeams();
        }
      } else if (await this.createTeamDialog().isVisible().catch(() => false)) {
        await this.cancelCreateTeam();
      }

      menu = await resolveMenu();
      await expect(menu).toBeVisible();
      await expect(menu).toBeEnabled();
      await menu.click();
      await expect(this.page.getByRole('option').first()).toBeVisible();
    }

    await this.page.getByRole('option', { name: optionName, exact: true }).click();
  }

  async fillTeamName(teamName: string): Promise<void> {
    const nameInput = this.teamNameInput();
    await nameInput.fill(teamName);
    await expect(nameInput).toHaveValue(teamName);
  }

  async clickSave(): Promise<void> {
    await this.createTeamDialog().getByRole('button', { name: 'Save', exact: true }).click();
  }

  async submitCreateTeam(): Promise<void> {
    await this.clickSave();
    await expect(this.createTeamDialog()).toBeHidden();
  }

  async cancelCreateTeam(): Promise<void> {
    await this.createTeamDialog().getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(this.createTeamDialog()).toBeHidden();
  }

  async uploadLogo(filePath: string): Promise<void> {
    await this.logoFileInput().setInputFiles(filePath);
  }

  async getFirstListedTeamName(): Promise<string> {
    const dataRow = this.page.getByRole('row').nth(1);
    await expect(dataRow).toBeVisible();
    const text = (await dataRow.getByRole('cell').first().innerText()).trim();
    const name = text.split('\n')[0]?.trim() ?? '';
    expect(name.length).toBeGreaterThan(0);
    return name;
  }

  async expectTeamCreatedToast(): Promise<void> {
    await expect(this.page.getByText('Team has been created', { exact: true })).toBeVisible();
  }

  async expectNoTeamCreatedSuccess(): Promise<void> {
    await expect(this.page.getByText('Team has been created', { exact: true })).toHaveCount(0);
  }

  async expectDuplicateTeamError(): Promise<void> {
    await expect(
      this.page.getByText('Team with this name already exists in this organization', { exact: true }),
    ).toBeVisible();
  }

  async expectInvalidLogoTypeError(): Promise<void> {
    await expect(this.page.getByText(/Please select a valid file\. Allowed types:/i)).toBeVisible();
  }

  async expectLogoTooLargeError(): Promise<void> {
    await expect(this.page.getByText('File size must be less than 5MB', { exact: true })).toBeVisible();
  }

  async expectTeamInList(teamName: string): Promise<void> {
    await expect(this.teamsHeading).toBeVisible();
    await expect(this.teamRow(teamName)).toBeVisible();
    await expect(this.teamRow(teamName)).toContainText(teamName);
  }

  async expectTeamNotInList(teamName: string): Promise<void> {
    await expect(this.teamRow(teamName)).toHaveCount(0);
  }

  async expectDialogStillOpen(): Promise<void> {
    await expect(this.createTeamDialog()).toBeVisible();
  }

  async expectSelectFromMyTeamsDialogOpen(): Promise<void> {
    await expect(this.selectFromMyTeamsDialog()).toBeVisible();
  }

  async expectTeamNameRequiredError(): Promise<void> {
    await expect(this.teamNameRequiredError()).toBeVisible();
  }

  /** Create a team from the Team & Roster tab and assert it appears in the list. */
  async createTeam(team: TeamData = TeamPage.buildTeamData()): Promise<TeamData> {
    await this.openTeamsAndRosterTab();
    await this.openCreateTeamDialog();
    await this.fillTeamName(team.name);
    await this.submitCreateTeam();
    await this.expectTeamCreatedToast();
    await this.expectTeamInList(team.name);
    return team;
  }

  /**
   * Empty state exposes Select from My Teams directly; otherwise open the
   * Create New Team / Add menu and choose Select from My Teams.
   */
  async openSelectFromMyTeamsDialog(): Promise<void> {
    await expect(this.teamsHeading).toBeVisible();
    await this.waitForTeamEntryControls();

    const noTeamsYet = this.teamsPanel().getByRole('heading', { name: /No teams yet/i });
    if (
      (await noTeamsYet.isVisible().catch(() => false))
      || (await this.selectFromMyTeamsButton().isVisible().catch(() => false))
    ) {
      await expect(this.selectFromMyTeamsButton()).toBeVisible();
      await this.selectFromMyTeamsButton().click();
    } else {
      await this.chooseTeamMenuOption('Select from My Teams');
    }

    await expect(this.selectFromMyTeamsDialog()).toBeVisible();
  }

  async getListedTeamNames(): Promise<string[]> {
    const names: string[] = [];
    const rows = this.page.getByRole('row');
    const count = await rows.count();

    for (let i = 1; i < count; i++) {
      const cells = rows.nth(i).getByRole('cell');
      if ((await cells.count()) === 0) continue;
      const name = (await cells.first().innerText()).trim().split('\n')[0]?.trim() ?? '';
      if (name && !/^Team name$/i.test(name)) {
        names.push(name);
      }
    }

    return names;
  }

  /**
   * Opens the Select Team dropdown and picks a short, clear team name not already listed.
   */
  async selectShortTeamFromDropdown(
    excludeNames: string[] = [],
    maxNameLength = 40,
  ): Promise<string> {
    const dialog = this.selectFromMyTeamsDialog();
    await dialog.getByRole('combobox').first().click();

    const options = this.page.getByRole('option');
    await expect(options.first()).toBeVisible();

    const optionTexts = (await options.allTextContents())
      .map((text) => text.trim().split('\n')[0]?.trim() ?? '')
      .filter(Boolean);

    const excluded = new Set(excludeNames.map((name) => name.trim()));
    const candidate =
      optionTexts.find((name) => name.length <= maxNameLength && !excluded.has(name)) ??
      optionTexts.find((name) => name.length <= maxNameLength);

    expect(candidate, 'Expected at least one reasonably short team in My Teams').toBeTruthy();

    await this.page.getByRole('option', { name: candidate!, exact: true }).click();
    await expect(dialog.getByRole('combobox').first()).toContainText(candidate!);
    return candidate!;
  }

  async submitSelectFromMyTeams(): Promise<void> {
    const dialog = this.selectFromMyTeamsDialog();
    const submit = dialog.getByRole('button', { name: 'Submit', exact: true });
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(dialog).toBeHidden();
  }

  selectSubmitButton(): Locator {
    return this.selectFromMyTeamsDialog().getByRole('button', { name: 'Submit', exact: true });
  }

  async expectSelectSubmitDisabled(): Promise<void> {
    await expect(this.selectSubmitButton()).toBeDisabled();
  }

  async expectSelectSubmitEnabled(): Promise<void> {
    await expect(this.selectSubmitButton()).toBeEnabled();
  }

  async cancelSelectFromMyTeams(): Promise<void> {
    const dialog = this.selectFromMyTeamsDialog();
    // Close open listbox/combobox overlay if present so Cancel is clickable
    if (await this.page.getByRole('option').first().isVisible().catch(() => false)) {
      await this.page.keyboard.press('Escape');
    }
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(dialog).toBeHidden();
  }

  /**
   * Add an existing org team to the program via Select from My Teams.
   * Prefers a short name and skips teams already on the program list.
   */
  async addExistingTeamFromMyTeams(
    excludeNames: string[] = [],
    maxNameLength = 40,
  ): Promise<string> {
    await this.openTeamsAndRosterTab();
    const alreadyListed = excludeNames.length ? excludeNames : await this.getListedTeamNames();

    await this.openSelectFromMyTeamsDialog();
    const teamName = await this.selectShortTeamFromDropdown(alreadyListed, maxNameLength);
    await this.submitSelectFromMyTeams();
    await this.expectTeamCreatedToast();
    await this.expectTeamInList(teamName);
    return teamName;
  }
}
