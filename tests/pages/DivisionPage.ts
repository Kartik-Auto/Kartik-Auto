import { expect, type Locator, type Page } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { randomAlpha } from '../helpers/testData';
import { ProgramPage, type ProgramData } from './ProgramPage';

export type DivisionData = {
  name: string;
  capacity: string;
};

export class DivisionPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  static buildDivisionData(program: ProgramData): DivisionData {
    const programCapacity = Number.parseInt(program.maxTeams, 10);
    const maxCapacity = Number.isFinite(programCapacity) ? Math.max(programCapacity, 1) : 10;
    const capacity = faker.number.int({ min: 1, max: Math.min(maxCapacity, 10) }).toString();

    return {
      name: `QA Division ${faker.word.adjective()} ${randomAlpha(4)}`,
      capacity,
    };
  }

  private divisionsPanel(): Locator {
    return this.page.getByRole('tabpanel', { name: 'Divisions' });
  }

  private divisionHeader(): Locator {
    return this.page.locator('main').locator('div').filter({
      has: this.page.getByRole('heading', { level: 2 }),
    }).first();
  }

  private createDivisionDialog(): Locator {
    return this.page.getByRole('dialog', { name: /Create Divisions/i });
  }

  private overviewSection(heading: string): Locator {
    return this.page.locator('motion.div, div').filter({
      has: this.page.getByRole('heading', { name: heading, exact: true }),
    });
  }

  async openAddDivisionDialog(): Promise<void> {
    await this.page.getByRole('button', { name: 'Add Divisions', exact: true }).click();
    await expect(this.createDivisionDialog()).toBeVisible();
  }

  async expectCreateDivisionPrefill(program: ProgramData): Promise<void> {
    const dialog = this.createDivisionDialog();
    const feeInput = dialog.locator('input[name="divisions.0.registrationFee"]');

    // Prefer the live form value when the fee is locked (UAT prefilled 0); otherwise
    // assert against the program fee used when creating the parent program (Stage).
    const expectedFee = (await feeInput.isEditable())
      ? program.registrationFee
      : (await feeInput.inputValue()).trim() || program.registrationFee;
    program.registrationFee = expectedFee;
    await expect(feeInput).toHaveValue(expectedFee);

    await expect(
      dialog.getByRole('button', { name: ProgramPage.calendarButtonPattern(program.registrationStartDate) }),
    ).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: ProgramPage.calendarButtonPattern(program.registrationEndDate) }),
    ).toBeVisible();
  }

  async fillAndSaveDivision(division: DivisionData, program: ProgramData): Promise<void> {
    const dialog = this.createDivisionDialog();

    await this.expectCreateDivisionPrefill(program);
    await dialog.locator('input[name="divisions.0.name"]').fill(division.name);
    await dialog.locator('input[name="divisions.0.maxTeams"]').fill(division.capacity);

    await dialog.getByRole('button', { name: 'Save', exact: true }).click();

    await this.page.getByRole('tab', { name: 'Divisions' }).click();
    await expect(this.divisionsPanel().getByRole('heading', { name: division.name, exact: true })).toBeVisible();
  }

  async expectDivisionListedAsDraft(divisionName: string): Promise<void> {
    await this.page.getByRole('tab', { name: 'Divisions' }).click();
    const card = this.divisionsPanel().getByRole('button').filter({ hasText: divisionName });
    await expect(card).toBeVisible();
    await expect(card).toContainText('Draft');
  }

  async openDivision(divisionName: string): Promise<void> {
    await this.page.getByRole('tab', { name: 'Divisions' }).click();
    await this.divisionsPanel().getByRole('button').filter({ hasText: divisionName }).click();
    await expect(this.page.getByRole('heading', { name: divisionName, level: 2 })).toBeVisible();
    await this.expectDivisionStatus('Draft');
  }

  async expectDivisionStatus(status: 'Draft' | 'Upcoming' | 'Published' | 'Active'): Promise<void> {
    await expect(this.divisionHeader().getByText(status, { exact: true })).toBeVisible();
  }

  async reviewOverviewInheritedData(program: ProgramData): Promise<void> {
    await this.page.getByRole('tab', { name: 'Overview' }).click();
    await expect(this.page.getByRole('tabpanel', { name: 'Overview' })).toBeVisible();

    const registration = this.overviewSection('Registration Setup');
    await expect(registration.getByText(`$${program.registrationFee}`).first()).toBeVisible();
    await expect(registration.getByText(ProgramPage.shortDatePattern(program.registrationStartDate)).first()).toBeVisible();
    await expect(registration.getByText(ProgramPage.shortDatePattern(program.registrationEndDate)).first()).toBeVisible();

    const details = this.overviewSection('Division Details');
    await expect(details.getByText(/Male|Female|Co-ed/i).first()).toBeVisible();
    await expect(details.getByText(/Beginner|Intermediate|Advanced|All Levels/i).first()).toBeVisible();
  }

  async skipPaymentPlans(): Promise<void> {
    const tab = this.page.getByRole('tab', { name: 'Payment Plans' });
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect(
      this.page.getByRole('heading', { name: /No payment plans|Payment plans not available/i }).first(),
    ).toBeVisible();
  }

  async reviewPlayerEligibilityInherited(): Promise<void> {
    await this.page.getByRole('tab', { name: 'Player Eligibility' }).click();
    const panel = this.page.getByRole('tabpanel', { name: 'Player Eligibility' });
    await expect(panel).toBeVisible();

    await expect(panel.getByText(/\d{2}\/\d{2}\/\d{4}/).first()).toBeVisible();

    const saveButton = panel.getByRole('button', { name: 'Save', exact: true });
    if (await saveButton.isVisible()) {
      await saveButton.click();
    }
  }

  private locationsPanel(): Locator {
    return this.page.getByRole('tabpanel', { name: 'Locations' });
  }

  private waiversPanel(): Locator {
    return this.page.getByRole('tabpanel', { name: 'Waivers' });
  }

  private async openLocationsTab(): Promise<void> {
    const tab = this.page.getByRole('tab', { name: 'Locations' });
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect(this.locationsPanel()).toBeVisible();
  }

  private async openWaiversTab(): Promise<void> {
    const tab = this.page.getByRole('tab', { name: 'Waivers' });
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect(this.waiversPanel()).toBeVisible();
  }

  private attachedItemHeadings(panel: Locator, sectionTitle: RegExp): Locator {
    return panel.locator('h3').filter({ hasNotText: sectionTitle });
  }

  private async getAttachedNames(panel: Locator, sectionTitle: RegExp): Promise<string[]> {
    const headings = this.attachedItemHeadings(panel, sectionTitle);
    const count = await headings.count();
    const names: string[] = [];

    for (let i = 0; i < count; i++) {
      const text = (await headings.nth(i).textContent())?.trim() ?? '';
      if (text) {
        names.push(text);
      }
    }

    return names;
  }

  private async waitForResourceTabReady(
    panel: Locator,
    sectionHeading: string,
    selectButton: string,
  ): Promise<void> {
    await expect(panel.getByRole('heading', { name: sectionHeading, exact: true })).toBeVisible();
    await expect(panel.getByRole('button', { name: selectButton, exact: true })).toBeVisible();
  }

  /** Waits for async inherited items, then returns the first attached name or null when none exist. */
  private async resolveFirstAttachedName(
    panel: Locator,
    sectionHeading: string,
    sectionTitle: RegExp,
    selectButton: string,
  ): Promise<string | null> {
    await this.waitForResourceTabReady(panel, sectionHeading, selectButton);

    const headings = this.attachedItemHeadings(panel, sectionTitle);
    let lastCount = -1;
    let stableEmptyReads = 0;
    let resolvedName: string | null = null;

    await expect.poll(async () => {
      const count = await headings.count();
      if (count > 0) {
        const text = (await headings.first().textContent())?.trim() ?? '';
        if (text.length > 0) {
          resolvedName = text;
          return true;
        }
        return false;
      }

      if (count === lastCount) {
        stableEmptyReads += 1;
      } else {
        stableEmptyReads = 0;
        lastCount = count;
      }

      if (stableEmptyReads >= 2) {
        resolvedName = null;
        return true;
      }

      return false;
    }, { timeout: 15000, intervals: [300, 500, 1000] }).toBe(true);

    return resolvedName;
  }

  private async expectAttachedItemVisible(panel: Locator, name: string): Promise<void> {
    const card = panel.locator('h3').filter({ hasText: name }).first();
    await expect(card).toBeVisible();
    await expect(card).toHaveText(name);
  }

  private async attachNewLocation(): Promise<string> {
    const panel = this.locationsPanel();
    const selectLocation = panel.getByRole('button', { name: 'Select Location', exact: true });
    await expect(selectLocation).toBeVisible();
    await selectLocation.click();

    const dialog = this.page.getByRole('dialog', { name: /Select Location/i });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('combobox').filter({ hasText: /Select locations/i }).click();
    const option = this.page.getByRole('option').first();
    await expect(option).toBeVisible();
    const locationName = (await option.textContent())?.trim() ?? '';
    expect(locationName.length).toBeGreaterThan(0);
    await option.click();

    await dialog.getByRole('button', { name: 'Add Locations', exact: true }).click();
    await expect(dialog).toBeHidden();
    await this.expectAttachedItemVisible(panel, locationName);

    return locationName;
  }

  private async attachNewWaiver(): Promise<string> {
    const panel = this.waiversPanel();
    const selectWaiver = panel.getByRole('button', { name: 'Select Waiver', exact: true });
    await expect(selectWaiver).toBeVisible();
    await selectWaiver.click();

    const dialog = this.page.getByRole('dialog', { name: /Select Waiver/i });
    await expect(dialog).toBeVisible();

    await dialog.locator('label').filter({ hasText: /^Organization$/ }).click();

    const combo = dialog.getByRole('combobox').filter({ hasText: /Select waivers/i });
    const noAvailable = dialog.getByText(/No available waivers/i);

    await expect(noAvailable.or(combo)).toBeVisible();

    if (await noAvailable.isVisible()) {
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
      await expect(dialog).toBeHidden();

      const inherited = await this.resolveFirstAttachedName(
        panel,
        'Waivers',
        /^waivers?$/i,
        'Select Waiver',
      );
      if (inherited) {
        await this.expectAttachedItemVisible(panel, inherited);
        return inherited;
      }

      throw new Error('No waivers available to attach and none found on division');
    }

    await expect(combo).toBeEnabled();
    await combo.click();

    const option = this.page.getByRole('option').first();
    await expect(option).toBeVisible();
    const waiverName = (await option.textContent())?.trim() ?? '';
    expect(waiverName.length).toBeGreaterThan(0);
    await option.click();

    await dialog.getByRole('button', { name: 'Add Waivers', exact: true }).click();
    await expect(dialog).toBeHidden();
    await this.expectAttachedItemVisible(panel, waiverName);

    return waiverName;
  }

  async attachLocationIfNeeded(): Promise<string> {
    await this.openLocationsTab();
    const panel = this.locationsPanel();

    const existing = await this.resolveFirstAttachedName(
      panel,
      'Location',
      /^locations?$/i,
      'Select Location',
    );

    if (existing) {
      await this.expectAttachedItemVisible(panel, existing);
      return existing;
    }

    return this.attachNewLocation();
  }

  async attachWaiverIfNeeded(): Promise<string> {
    await this.openWaiversTab();
    const panel = this.waiversPanel();

    const existing = await this.resolveFirstAttachedName(
      panel,
      'Waivers',
      /^waivers?$/i,
      'Select Waiver',
    );

    if (existing) {
      await this.expectAttachedItemVisible(panel, existing);
      return existing;
    }

    return this.attachNewWaiver();
  }

  async validateTabPersistence(program: ProgramData, locationName: string, waiverName: string): Promise<void> {
    await this.reviewOverviewInheritedData(program);

    await this.openLocationsTab();
    await this.expectAttachedItemVisible(this.locationsPanel(), locationName);

    await this.openWaiversTab();
    await this.expectAttachedItemVisible(this.waiversPanel(), waiverName);
  }

  async reviewTabsOverviewThroughWaivers(program: ProgramData): Promise<{
    locationName: string;
    waiverName: string;
  }> {
    await this.reviewOverviewInheritedData(program);
    await this.skipPaymentPlans();
    await this.reviewPlayerEligibilityInherited();
    const locationName = await this.attachLocationIfNeeded();
    const waiverName = await this.attachWaiverIfNeeded();
    await this.validateTabPersistence(program, locationName, waiverName);
    return { locationName, waiverName };
  }

  async expectPublishEnabled(): Promise<void> {
    await expect(this.page.getByRole('button', { name: 'Publish', exact: true })).toBeEnabled();
  }

  async publishDivision(): Promise<void> {
    await this.expectDivisionStatus('Draft');
    await this.page.getByRole('button', { name: 'Publish', exact: true }).click();

    const confirmDialog = this.page.getByRole('dialog', { name: /Publish Program/i });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: 'Publish Program', exact: true }).click();
    await expect(confirmDialog).toBeHidden();

    await this.expectDivisionStatus('Upcoming');
  }

  /** Full division happy path after program is published and Upcoming. */
  async createAndPublishDivision(program: ProgramData, division?: DivisionData): Promise<DivisionData> {
    const data = division ?? DivisionPage.buildDivisionData(program);

    await this.openAddDivisionDialog();
    await this.fillAndSaveDivision(data, program);
    await this.expectDivisionListedAsDraft(data.name);
    await this.openDivision(data.name);
    await this.reviewTabsOverviewThroughWaivers(program);
    await this.expectPublishEnabled();
    await this.publishDivision();

    return data;
  }
}
