import { expect, type Locator, type Page } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { randomAlpha } from '../helpers/testData';

export type ProgramData = {
  name: string;
  description: string;
  registrationFee: string;
  maxTeams: string;
  startDate: Date;
  endDate: Date;
  registrationStartDate: Date;
  registrationEndDate: Date;
};

export class ProgramPage {
  readonly page: Page;
  readonly programsNavLink: Locator;
  readonly programListHeading: Locator;
  readonly createProgramButton: Locator;
  readonly continueToProgramButton: Locator;
  readonly createProgramHeading: Locator;
  readonly programNameInput: Locator;
  readonly descriptionInput: Locator;
  readonly registrationFeeInput: Locator;
  readonly maxTeamsInput: Locator;
  readonly startDateButton: Locator;
  readonly endDateButton: Locator;
  readonly saveAndContinueButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.programsNavLink = page.locator('a[href="/programs"]').first();
    this.programListHeading = page.getByRole('heading', { name: /Program List/i });
    this.createProgramButton = page.getByRole('button', { name: /Create New Program/i });
    this.continueToProgramButton = page.getByRole('button', { name: 'Continue to Program', exact: true });
    this.createProgramHeading = page.getByRole('heading', { name: /Create New Program/i });
    this.programNameInput = page.getByRole('textbox', { name: /Program Name/i });
    this.descriptionInput = page.getByRole('textbox', { name: /Enter program description/i });
    this.registrationFeeInput = page.getByRole('textbox', { name: /Registration Fee/i });
    this.maxTeamsInput = page.getByRole('textbox', { name: /Maximum Number of Teams/i });

    const schedule = this.scheduleSection();
    this.startDateButton = schedule
      .getByRole('button', { name: 'Select start date', exact: true })
      .first();
    this.endDateButton = schedule
      .getByRole('button', { name: 'Select end date', exact: true })
      .first();
    this.saveAndContinueButton = page.getByRole('button', { name: /Save & Continue/i });
  }

  private scheduleSection(): Locator {
    return this.page.locator('motion.div, div').filter({
      has: this.page.getByRole('heading', { name: 'Schedule Information' }),
    });
  }

  static startOfDay(date: Date): Date {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }

  static addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return ProgramPage.startOfDay(next);
  }

  static daysBetween(from: Date, to: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.round((ProgramPage.startOfDay(to).getTime() - ProgramPage.startOfDay(from).getTime()) / msPerDay);
  }

  /** Program start: 2–3 days after today. */
  static buildStartDate(): Date {
    const offset = faker.number.int({ min: 2, max: 3 });
    return ProgramPage.addDays(new Date(), offset);
  }

  /** Program end: 10–30 days after program start. */
  static buildEndDate(startDate: Date): Date {
    const offset = faker.number.int({ min: 10, max: 30 });
    return ProgramPage.addDays(startDate, offset);
  }

  /** Registration start: on or before program start. */
  static buildRegistrationStartDate(programStartDate: Date): Date {
    const daysBeforeStart = faker.number.int({ min: 0, max: 2 });
    return ProgramPage.addDays(programStartDate, -daysBeforeStart);
  }

  /** Registration end: on or before program end (may equal program end). */
  static buildRegistrationEndDate(
    programEndDate: Date,
    registrationStartDate: Date,
  ): Date {
    const span = ProgramPage.daysBetween(registrationStartDate, programEndDate);
    const offset = faker.number.int({ min: 0, max: span });
    const registrationEndDate = ProgramPage.addDays(registrationStartDate, offset);

    if (registrationEndDate.getTime() > programEndDate.getTime()) {
      return ProgramPage.startOfDay(programEndDate);
    }

    if (registrationEndDate.getTime() < registrationStartDate.getTime()) {
      return ProgramPage.startOfDay(registrationStartDate);
    }

    return registrationEndDate;
  }

  static calendarButtonPattern(date: Date): RegExp {
    const month = date.toLocaleString('en-US', { month: 'long' });
    const day = date.getDate();
    return new RegExp(`${month} ${day}(?:st|nd|rd|th)?`, 'i');
  }

  static shortDateLabel(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  static shortDatePattern(date: Date): RegExp {
    const formatted = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const [month, day, year] = formatted.replace(',', '').split(/\s+/);
    return new RegExp(`${month}\\s+${day},?\\s+${year}`);
  }

  static assertDateRules(data: ProgramData): void {
    const today = ProgramPage.startOfDay(new Date());
    const startOffset = ProgramPage.daysBetween(today, data.startDate);
    const programSpan = ProgramPage.daysBetween(data.startDate, data.endDate);

    if (startOffset < 2 || startOffset > 3) {
      throw new Error(`Program start must be 2–3 days after today (got ${startOffset})`);
    }

    if (programSpan < 10 || programSpan > 30) {
      throw new Error(`Program end must be 10–30 days after start (got ${programSpan})`);
    }

    if (data.registrationStartDate.getTime() > data.startDate.getTime()) {
      throw new Error('Registration start must be on or before program start');
    }

    if (data.registrationEndDate.getTime() > data.endDate.getTime()) {
      throw new Error('Registration end must be on or before program end');
    }

    if (data.registrationEndDate.getTime() < data.registrationStartDate.getTime()) {
      throw new Error('Registration end must be on or after registration start');
    }
  }

  static buildProgramData(overrides: Partial<ProgramData> = {}): ProgramData {
    const suffix = randomAlpha(5);
    const startDate = overrides.startDate ?? ProgramPage.buildStartDate();
    const endDate = overrides.endDate ?? ProgramPage.buildEndDate(startDate);
    const registrationStartDate =
      overrides.registrationStartDate ?? ProgramPage.buildRegistrationStartDate(startDate);
    const registrationEndDate =
      overrides.registrationEndDate ??
      ProgramPage.buildRegistrationEndDate(endDate, registrationStartDate);

    const data: ProgramData = {
      name: overrides.name ?? `QA Program ${faker.word.adjective()} ${suffix}`,
      description:
        overrides.description ?? faker.lorem.paragraph({ min: 1, max: 2 }).slice(0, 240),
      registrationFee:
        overrides.registrationFee ?? faker.number.int({ min: 50, max: 500 }).toString(),
      maxTeams: overrides.maxTeams ?? faker.number.int({ min: 4, max: 32 }).toString(),
      startDate,
      endDate,
      registrationStartDate,
      registrationEndDate,
      ...overrides,
    };

    ProgramPage.assertDateRules(data);
    return data;
  }

  buildRandomProgram(): ProgramData {
    return ProgramPage.buildProgramData();
  }

  async openProgramsList(): Promise<void> {
    await this.programsNavLink.click();
    await expect(this.page).toHaveURL(/\/programs/);
    await expect(this.programListHeading).toBeVisible();
    await expect(this.page.locator('main a[href*="/programs/"]').first()).toBeVisible();
  }

  async openCreateProgramForm(): Promise<void> {
    await this.createProgramButton.click();
    await this.confirmTransactionFeePolicy();
    await expect(this.page).toHaveURL(/\/programs\/create/);
    await expect(this.createProgramHeading).toBeVisible();
  }

  /** Confirm transaction fee policy popup that appears after Create New Program. */
  async confirmTransactionFeePolicy(): Promise<void> {
    const dialog = this.page.getByRole('dialog', { name: /Confirm Transaction Fee Policy/i });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Continue to Program', exact: true }).click();
    await expect(dialog).toBeHidden();
  }

  async fillProgramForm(data: ProgramData): Promise<void> {
    await this.disablePageAnimations();
    await this.programNameInput.fill(data.name);
    await this.descriptionInput.fill(data.description);
    await this.registrationFeeInput.fill(data.registrationFee);
    await this.maxTeamsInput.clear();
    await this.maxTeamsInput.fill(data.maxTeams);

    await this.waitForSportPrefilled();
    await this.selectTournamentDates(data);
    await this.selectSeason();
    await this.programNameInput.click();
  }

  private async waitForSportPrefilled(): Promise<void> {
    await expect(this.page.getByRole('textbox', { name: /Sport/i })).toHaveValue(/.+/);
  }

  private async disablePageAnimations(): Promise<void> {
    await this.page.addStyleTag({
      content:
        '*, *::before, *::after { animation: none !important; transition: none !important; }',
    });
  }

  async saveAndContinue(): Promise<void> {
    await expect(this.page.getByText('Sport is required')).not.toBeVisible();
    await expect(this.page.getByText('Program start date is required')).not.toBeVisible();
    await expect(this.page.getByText('Program end date is required')).not.toBeVisible();
    await expect(this.saveAndContinueButton).toBeEnabled();

    await Promise.all([
      this.page.waitForURL((url) => !/\/programs\/create/.test(url.pathname)),
      this.saveAndContinueButton.click(),
    ]);
  }

  async expectProgramOnList(programName: string): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/programs\/create/);

    const onProgramList = await this.programListHeading.isVisible().catch(() => false);
    if (!onProgramList) {
      await this.programsNavLink.click();
      await expect(this.page).toHaveURL(/\/programs\/?$/);
    }

    await expect(this.programListHeading).toBeVisible();
    await expect(this.page.getByRole('link', { name: programName }).first()).toBeVisible();
  }

  async openProgramOverview(programName: string): Promise<void> {
    await this.page.getByRole('link', { name: programName }).first().click();
    await expect(this.page.getByRole('tab', { name: 'Overview' })).toBeVisible();
  }

  async expectOverviewShowsProgram(programName: string): Promise<void> {
    await expect(this.page.getByRole('heading', { name: programName })).toBeVisible();
  }

  /** Full happy-path orchestration from an authenticated session. */
  async createProgramEndToEnd(data?: Partial<ProgramData>): Promise<ProgramData> {
    const program = ProgramPage.buildProgramData(data);

    await this.openProgramsList();
    await this.openCreateProgramForm();
    await this.fillProgramForm(program);
    await this.saveAndContinue();
    await this.expectProgramOnList(program.name);
    await this.openProgramOverview(program.name);
    await this.expectOverviewShowsProgram(program.name);

    return program;
  }

  async openLatestDraftProgram(): Promise<string> {
    await this.openProgramsList();
    const link = this.page.getByRole('row').filter({ hasText: 'Draft' }).first().getByRole('link').first();
    const name = (await link.textContent())?.trim() ?? '';
    await link.click();
    await expect(this.page).toHaveURL(/\/programs\/\d+/);
    await expect(this.page.getByRole('tab', { name: 'Overview' })).toBeVisible();
    return name;
  }

  /**
   * Open an existing program from the list (Upcoming/Active preferred).
   * Falls back to the first program row when no preferred status is present.
   */
  async openExistingProgram(): Promise<string> {
    await this.openProgramsList();

    const preferredRowLink = this.page
      .getByRole('row')
      .filter({ hasText: /Upcoming|Active/i })
      .first()
      .getByRole('link')
      .first();
    const anyProgramLink = this.page.locator('main a[href*="/programs/"]').first();
    const link =
      (await preferredRowLink.count()) > 0 && (await preferredRowLink.isVisible().catch(() => false))
        ? preferredRowLink
        : anyProgramLink;

    await expect(link).toBeVisible();
    const name = (await link.textContent())?.trim() ?? '';
    await link.click();
    await expect(this.page).toHaveURL(/\/programs\/\d+/);
    await expect(this.page.getByRole('tab').first()).toBeVisible();
    return name;
  }

  /**
   * Open an existing program/division that exposes the Team & Roster tab.
   * Newer programs keep Team & Roster under Divisions → division detail.
   */
  async openExistingProgramWithTeamsRoster(): Promise<string> {
    const programName = await this.openExistingProgram();

    const programTeamsTab = this.page.getByRole('tab', { name: /Team & Roster/i });
    if (await programTeamsTab.isVisible().catch(() => false)) {
      return programName;
    }

    const divisionsTab = this.page.getByRole('tab', { name: /Divisions/i });
    await expect(divisionsTab).toBeVisible();
    await divisionsTab.click();
    await expect(divisionsTab).toHaveAttribute('aria-selected', 'true');

    // Division cards are role=button wrappers containing an h3 title
    const divisionCards = this.page.locator('[role="button"]').filter({
      has: this.page.locator('h3'),
    });
    await expect(divisionCards.first()).toBeVisible();
    await divisionCards.first().click();

    await expect(this.page.getByRole('tab', { name: /Team & Roster/i })).toBeVisible();
    return programName;
  }

  async completeTournamentDetails(): Promise<{ gender: string; level: string }> {
    await this.page.getByRole('tab', { name: 'Overview' }).click();
    await this.sectionEditButton('Tournament Details').click();

    const dialog = this.page.getByRole('dialog', { name: /Edit Tournament Details/i });
    await expect(dialog).toBeVisible();

    const gender = await this.selectComboboxOption(dialog, /Select gender/i);
    const level = await this.selectComboboxOption(dialog, /Select level/i);
    await this.selectDaysOfWeek(dialog);

    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toBeHidden();

    const section = this.overviewSection('Tournament Details');
    await expect(section.getByText(gender, { exact: false }).first()).toBeVisible();
    await expect(section.getByText(level, { exact: false }).first()).toBeVisible();

    return { gender, level };
  }

  async completeRegistrationSetup(program: ProgramData): Promise<void> {
    ProgramPage.assertDateRules(program);

    await this.sectionEditButton('Registration Setup').click();

    const dialog = this.page.getByRole('dialog', { name: /Edit Registration Details/i });
    await expect(dialog).toBeVisible();

    await this.selectDialogDate(dialog, 'start', program.registrationStartDate);
    await this.selectDialogTimeField(dialog, 'start', '9:00 AM');
    await this.selectDialogDate(dialog, 'end', program.registrationEndDate);
    await this.selectDialogTimeField(dialog, 'end', '11:59 PM');

    const saveButton = dialog.getByRole('button', { name: 'Save', exact: true });
    await saveButton.scrollIntoViewIfNeeded();
    await saveButton.click();

    const section = this.overviewSection('Registration Setup');
    await expect(section.getByText(/9:00\s*AM/i).first()).toBeVisible();
    await expect(section.getByText(/11:59\s*PM/i).first()).toBeVisible();
    await expect(dialog).toBeHidden();
  }

  async skipPaymentPlans(): Promise<void> {
    const tab = this.page.getByRole('tab', { name: 'Payment Plans' });
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect(
      this.page.getByRole('heading', { name: /No payment plans|Payment plans not available/i }).first(),
    ).toBeVisible();
  }

  async completePlayerEligibility(): Promise<void> {
    await this.page.getByRole('tab', { name: 'Player Eligibility' }).click();
    await expect(this.page.getByRole('heading', { name: 'Player Eligibility' })).toBeVisible();

    const panel = this.playerEligibilityPanel();
    const dateSelectButton = () =>
      panel.getByRole('button', { name: 'Select', exact: true, disabled: false }).first();

    await this.pickDateFromSelectButton(panel, dateSelectButton(), 1);
    await this.pickDateFromSelectButton(panel, dateSelectButton(), 5);

    await panel.getByRole('button', { name: 'Select grade' }).click();
    const gradeMenu = this.page
      .locator('[data-radix-popper-content-wrapper], [role="listbox"], [role="menu"]')
      .filter({ has: this.page.getByRole('checkbox') })
      .last();
    await expect(gradeMenu).toBeVisible();
    await gradeMenu.getByRole('checkbox').first().check();
    await gradeMenu.getByRole('checkbox').nth(1).check();
    await panel.getByRole('heading', { name: 'Player Eligibility' }).click();
    await expect(gradeMenu).toBeHidden();

    await expect(dateSelectButton()).toBeEnabled();
    await this.pickDateFromSelectButton(panel, dateSelectButton(), 1);

    await panel.getByRole('checkbox', { name: 'Require age verification to join' }).check();
    await panel.getByRole('checkbox', { name: 'Require grade verification to join' }).check();
    await panel.getByRole('button', { name: 'Save', exact: true }).click();
  }

  async attachExistingLocation(): Promise<string> {
    await this.page.getByRole('tab', { name: 'Locations' }).click();
    await expect(this.page.getByRole('heading', { name: 'Location', exact: true })).toBeVisible();

    await this.page.getByRole('button', { name: 'Select Location', exact: true }).click();
    const dialog = this.page.getByRole('dialog', { name: /Select Location/i });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('combobox').filter({ hasText: /Select locations/i }).click();
    const option = this.page.getByRole('option').first();
    const locationName = (await option.textContent())?.trim() ?? '';
    await option.click();

    await dialog.getByRole('button', { name: 'Add Locations', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(this.page.getByText(locationName, { exact: false }).first()).toBeVisible();

    return locationName;
  }

  async attachExistingWaiver(): Promise<string> {
    await this.page.getByRole('tab', { name: 'Waivers' }).click();
    await expect(this.page.getByRole('heading', { name: 'Waivers', exact: true })).toBeVisible();

    await this.page.getByRole('button', { name: 'Select Waiver', exact: true }).click();
    const dialog = this.page.getByRole('dialog', { name: /Select Waiver/i });
    await expect(dialog).toBeVisible();

    await dialog.locator('label').filter({ hasText: /^Organization$/ }).click();
    await dialog.getByRole('combobox').filter({ hasText: /Select waivers/i }).click();

    const option = this.page.getByRole('option').first();
    const waiverName = (await option.textContent())?.trim() ?? '';
    await option.click();

    await dialog.getByRole('button', { name: 'Add Waivers', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(this.page.getByText(waiverName, { exact: false }).first()).toBeVisible();

    return waiverName;
  }

  async expectPublishEnabled(): Promise<void> {
    await expect(this.page.getByRole('button', { name: 'Publish', exact: true })).toBeEnabled();
  }

  async expectProgramStatus(status: 'Draft' | 'Upcoming'): Promise<void> {
    await expect(this.page.locator('main').getByText(status, { exact: true }).first()).toBeVisible();
  }

  async publishProgram(): Promise<void> {
    await this.expectProgramStatus('Draft');
    await this.page.getByRole('button', { name: 'Publish', exact: true }).click();

    const confirmDialog = this.page.getByRole('dialog', { name: /Publish Program/i });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: 'Publish Program', exact: true }).click();
    await expect(confirmDialog).toBeHidden();
    await this.expectProgramStatus('Upcoming');
  }

  async completeSetupAndPublish(program: ProgramData): Promise<void> {
    await this.completeTournamentDetails();
    await this.completeRegistrationSetup(program);
    await this.skipPaymentPlans();
    await this.completePlayerEligibility();
    await this.attachExistingLocation();
    await this.attachExistingWaiver();
    await this.expectPublishEnabled();
    await this.publishProgram();
  }

  /** Create program, complete remaining setup tabs, and publish. */
  async createAndPublishProgramEndToEnd(data?: Partial<ProgramData>): Promise<ProgramData> {
    const program = await this.createProgramEndToEnd(data);
    await this.completeSetupAndPublish(program);
    return program;
  }

  private overviewSection(heading: string): Locator {
    return this.page.locator('motion.div, div').filter({
      has: this.page.getByRole('heading', { name: heading, exact: true }),
    });
  }

  private playerEligibilityPanel(): Locator {
    return this.page.getByRole('tabpanel', { name: 'Player Eligibility' });
  }

  private sectionEditButton(heading: string): Locator {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.page
      .locator('motion.div, div')
      .filter({ hasText: new RegExp(`^${escaped}Edit$`) })
      .getByRole('button', { name: 'Edit', exact: true });
  }

  private async selectComboboxOption(scope: Locator, placeholder: RegExp): Promise<string> {
    const combo = scope.getByRole('combobox').filter({ hasText: placeholder }).first();
    await combo.click();
    const option = scope.page().getByRole('option').first();
    const label = (await option.textContent())?.trim() ?? '';
    await option.click();
    return label;
  }

  private async selectDaysOfWeek(dialog: Locator): Promise<void> {
    for (const day of ['M', 'W', 'F'] as const) {
      await dialog.getByRole('button', { name: day, exact: true }).click();
    }

    await expect(dialog.getByText('Please select at least one day')).not.toBeVisible();
  }

  private registrationDateTrigger(dialog: Locator, kind: 'start' | 'end'): Locator {
    return dialog.getByRole('button', {
      name: kind === 'start' ? 'Select start date' : 'Select end date',
      exact: true,
    });
  }

  private registrationTimeTrigger(dialog: Locator, kind: 'start' | 'end'): Locator {
    return dialog.getByRole('button', {
      name: kind === 'start' ? 'Select start time' : 'Select end time',
      exact: true,
    });
  }

  private formatDataDay(date: Date): string {
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  }

  private async selectDateInCalendar(calendar: Locator, targetDate: Date): Promise<void> {
    const dataDay = this.formatDataDay(targetDate);
    const ariaPattern = ProgramPage.calendarButtonPattern(targetDate);

    for (let month = 0; month < 24; month++) {
      const byDataDay = calendar.locator(`button[data-day="${dataDay}"]:not([disabled])`);
      if (await byDataDay.count()) {
        const dayButton = byDataDay.first();
        await dayButton.dispatchEvent('pointerdown');
        await dayButton.dispatchEvent('pointerup');
        await dayButton.dispatchEvent('click');
        return;
      }

      const byAria = calendar.getByRole('button', { name: ariaPattern });
      if (await byAria.count()) {
        const dayButton = byAria.first();
        await dayButton.dispatchEvent('pointerdown');
        await dayButton.dispatchEvent('pointerup');
        await dayButton.dispatchEvent('click');
        return;
      }

      await this.advanceCalendarMonth(calendar);
    }

    throw new Error(`Could not select calendar date ${dataDay}`);
  }

  private async selectDialogDate(
    dialog: Locator,
    kind: 'start' | 'end',
    targetDate: Date,
  ): Promise<void> {
    await this.registrationDateTrigger(dialog, kind).click();

    const calendar = this.page.getByRole('dialog').filter({ has: this.page.getByRole('grid') }).last();
    await expect(calendar).toBeVisible();
    await this.selectDateInCalendar(calendar, targetDate);

    await dialog.getByRole('heading').first().click();
    await expect(calendar).toBeHidden();
  }

  private async selectDialogTimeField(
    dialog: Locator,
    kind: 'start' | 'end',
    timeValue: string,
  ): Promise<void> {
    const trigger = this.registrationTimeTrigger(dialog, kind);
    await trigger.click();

    const popoverId = await trigger.getAttribute('aria-controls');
    const popover = popoverId
      ? this.page.locator(`[id="${popoverId}"]`)
      : this.page.locator('[data-slot="popover-content"]').last();
    await expect(popover).toBeVisible();
    await popover.getByRole('textbox').fill(timeValue);
    await popover.getByRole('button', { name: 'OK', exact: true }).click();
  }

  private async resolveCalendarForButton(trigger: Locator): Promise<Locator> {
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();

    const popoverId = await trigger.getAttribute('aria-controls');
    if (popoverId) {
      const linkedPopover = this.page.locator(`[id="${popoverId}"]`);
      if (await linkedPopover.isVisible().catch(() => false)) {
        return linkedPopover;
      }
    }

    const dialogCalendar = this.page
      .getByRole('dialog')
      .filter({ has: this.page.getByRole('grid') })
      .last();
    if (await dialogCalendar.isVisible().catch(() => false)) {
      return dialogCalendar;
    }

    const popover = this.page.locator('[data-slot="popover-content"]').last();
    await expect(popover).toBeVisible();
    return popover;
  }

  private async pickDateFromSelectButton(
    scope: Locator,
    selectButton: Locator,
    dayIndex: number,
  ): Promise<void> {
    const calendar = await this.resolveCalendarForButton(selectButton);

    const dataDays = calendar.locator('button[data-day]:not([disabled])');
    const day =
      (await dataDays.count()) > dayIndex
        ? dataDays.nth(dayIndex)
        : calendar.getByRole('gridcell').getByRole('button', { disabled: false }).nth(dayIndex);

    await day.dispatchEvent('pointerdown');
    await day.dispatchEvent('pointerup');
    await day.dispatchEvent('click');

    await scope.getByRole('heading').first().click();
    await expect(calendar).toBeHidden();
  }

  private async calendarForTrigger(trigger: Locator): Promise<Locator> {
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();

    const popoverId = await trigger.getAttribute('aria-controls');
    if (popoverId) {
      const linkedPopover = this.page.locator(`[id="${popoverId}"]`);
      await expect(linkedPopover).toBeVisible();
      return linkedPopover;
    }

    const dialogCalendar = this.page
      .getByRole('dialog')
      .filter({ has: this.page.getByRole('grid') })
      .last();
    await expect(dialogCalendar).toBeVisible();
    return dialogCalendar;
  }

  private async advanceCalendarMonth(calendar: Locator): Promise<void> {
    const nextMonth = calendar.getByRole('button', { name: 'Go to the Next Month' }).last();
    if (await nextMonth.isEnabled().catch(() => false)) {
      await nextMonth.click();
    }
  }

  private async selectDateOnTrigger(trigger: Locator, targetDate: Date): Promise<void> {
    const calendar = await this.calendarForTrigger(trigger);
    await this.selectDateInCalendar(calendar, targetDate);
    await this.programNameInput.click();
  }

  private async selectTournamentDates(data: ProgramData): Promise<void> {
    ProgramPage.assertDateRules(data);

    await this.selectDateOnTrigger(this.startDateButton, data.startDate);
    await this.selectDateOnTrigger(this.endDateButton, data.endDate);

    await expect(this.page.getByText('Program start date is required')).not.toBeVisible();
    await expect(this.page.getByText('Program end date is required')).not.toBeVisible();
    await expect(
      this.page.getByText(
        /start date.*(before|earlier)|end date.*(after|later)|must be before|must be after/i,
      ),
    ).not.toBeVisible();
  }

  private async selectSeason(): Promise<void> {
    const seasonCombobox = this.scheduleSection()
      .getByRole('combobox')
      .filter({ hasText: /Select season/i })
      .first();

    if (!(await seasonCombobox.count())) {
      return;
    }

    await seasonCombobox.click();
    await this.page.getByRole('option').first().click();
  }
}
