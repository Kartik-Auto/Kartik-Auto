import { expect, type Locator, type Page, type Response } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { randomAlpha } from '../helpers/testData';

export type ChildProfileData = {
  legalFirstName: string;
  legalLastName: string;
  preferredName: string;
  useSamePreferredName: boolean;
  dateOfBirth: Date;
  gender: 'Male' | 'Female';
  schoolName: string;
  grade: string;
  sport: string;
  position: string;
};

type CreatedChildResponse = {
  data: {
    id: number;
    firstName: string;
    legalFirstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    schoolName: string;
    grade: string;
    sports: string;
    position: string[];
  };
};

export class AddChildProfilePage {
  readonly page: Page;

  private static readonly GRADES = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'] as const;

  constructor(page: Page) {
    this.page = page;
  }

  static buildChildData(): ChildProfileData {
    const sanitizeName = (value: string) => value.replace(/[^A-Za-z ]/g, '').trim();
    const legalFirstName = sanitizeName(faker.person.firstName()) || `Child${randomAlpha(4)}`;
    const legalLastName = sanitizeName(faker.person.lastName()) || `QA${randomAlpha(4)}`;
    const useSamePreferredName = faker.datatype.boolean();
    const preferredName = useSamePreferredName
      ? legalFirstName
      : `${legalFirstName.slice(0, 3)}${faker.person.firstName().replace(/[^A-Za-z]/g, '').slice(0, 5)}`;

    return {
      legalFirstName,
      legalLastName,
      preferredName,
      useSamePreferredName,
      dateOfBirth: faker.date.birthdate({ min: 8, max: 14, mode: 'age' }),
      gender: faker.helpers.arrayElement(['Male', 'Female']),
      schoolName: `${sanitizeName(faker.company.name())} School`,
      grade: faker.helpers.arrayElement([...AddChildProfilePage.GRADES]),
      sport: 'Lacrosse',
      position: '',
    };
  }

  static formatProfileDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}/${day}/${date.getFullYear()}`;
  }

  static gradeLabel(grade: string): string {
    return grade.endsWith('th') || grade.endsWith('st') || grade.endsWith('nd') || grade.endsWith('rd')
      ? grade
      : `${grade}th`;
  }

  /** The form lives in a right-side drawer opened from the dashboard. */
  formDrawer(): Locator {
    return this.page.locator('[data-slot="drawer-content"]');
  }

  private childDetailsHeading(): Locator {
    return this.formDrawer().getByRole('heading', { name: 'Child Details', exact: true });
  }

  private legalFirstNameInput(): Locator {
    return this.formDrawer().locator('input[name="legalFirstName"]');
  }

  private legalLastNameInput(): Locator {
    return this.formDrawer().locator('input[name="lastName"]');
  }

  private preferredNameInput(): Locator {
    return this.formDrawer().locator('input[name="firstName"]');
  }

  private schoolNameInput(): Locator {
    return this.formDrawer().locator('input[name="schoolName"]');
  }

  private sameNameCheckbox(): Locator {
    return this.formDrawer().getByRole('checkbox', {
      name: /legal name and preferred name are same/i,
    });
  }

  private selectTrigger(label: RegExp): Locator {
    return this.formDrawer().locator('button[data-slot="select-trigger"]').filter({ hasText: label });
  }

  private genderCombobox(): Locator {
    return this.selectTrigger(/Select gender|^Male$|^Female$/);
  }

  private gradeCombobox(): Locator {
    return this.selectTrigger(/school grade|^\d{1,2}(st|nd|rd|th)$/);
  }

  private sportCombobox(): Locator {
    return this.selectTrigger(/Lacrosse|Select sport/i);
  }

  private positionCombobox(): Locator {
    return this.formDrawer().locator('button[role="combobox"][data-slot="popover-trigger"]');
  }

  private submitButton(): Locator {
    return this.formDrawer().getByRole('button', { name: 'Add Child', exact: true });
  }

  private static dayOrdinal(day: number): string {
    const rest = day % 100;
    if (rest >= 11 && rest <= 13) return `${day}th`;

    switch (day % 10) {
      case 1: return `${day}st`;
      case 2: return `${day}nd`;
      case 3: return `${day}rd`;
      default: return `${day}th`;
    }
  }

  /** Calendar day buttons are named e.g. "Saturday, April 16th, 2016". */
  private dayButtonName(date: Date): RegExp {
    const month = date.toLocaleString('en-US', { month: 'long' });
    return new RegExp(`${month} ${AddChildProfilePage.dayOrdinal(date.getDate())}, ${date.getFullYear()}$`);
  }

  private monthShortLabel(date: Date): string {
    return date.toLocaleString('en-US', { month: 'short' });
  }

  private calendarPopover(): Locator {
    return this.page
      .locator('[data-slot="popover-content"]')
      .filter({ has: this.page.locator('select[aria-label="Choose the Year"]') });
  }

  private async selectDateOfBirth(dateOfBirth: Date): Promise<void> {
    await this.dateOfBirthTrigger().click();

    const calendar = this.calendarPopover();
    await expect(calendar).toBeVisible();

    const yearSelect = calendar.locator('select[aria-label="Choose the Year"]');
    const monthSelect = calendar.locator('select[aria-label="Choose the Month"]');

    await yearSelect.selectOption(String(dateOfBirth.getFullYear()));
    await monthSelect.selectOption({ label: this.monthShortLabel(dateOfBirth) });

    const dayButton = calendar.getByRole('button', { name: this.dayButtonName(dateOfBirth) });
    await expect(dayButton).toBeVisible();
    // Day cells only react to the full pointer sequence.
    await dayButton.dispatchEvent('pointerdown');
    await dayButton.dispatchEvent('pointerup');
    await dayButton.dispatchEvent('click');

    // Calendar can stay open after picking a day; close it via the drawer heading.
    if (await calendar.isVisible().catch(() => false)) {
      await this.childDetailsHeading().click();
    }
    await expect(calendar).toBeHidden();
    await expect(this.dateOfBirthTrigger()).not.toHaveText('Select date of birth');
  }

  private async selectRadixOption(combo: Locator, optionName: string): Promise<void> {
    await combo.scrollIntoViewIfNeeded();
    await combo.click();

    // Radix portals dropdown content outside the drawer.
    const content = this.page.locator('[data-slot="select-content"]').last();
    await expect(content).toBeVisible();
    await content.getByRole('option', { name: optionName, exact: true }).click();
    await expect(content).toBeHidden();
    await expect(combo).toContainText(optionName);
  }

  private dateOfBirthTrigger(): Locator {
    return this.formDrawer().locator('button[data-slot="popover-trigger"]:not([role="combobox"])').first();
  }

  async expectOnAddChildForm(): Promise<void> {
    await expect(this.formDrawer()).toBeVisible();
    await expect(this.formDrawer().getByRole('heading', { name: 'Add Child Profile' })).toBeVisible();
    await expect(this.childDetailsHeading()).toBeVisible();
  }

  async fillLegalNames(legalFirstName: string, legalLastName: string): Promise<void> {
    await this.legalFirstNameInput().fill(legalFirstName);
    await this.legalLastNameInput().fill(legalLastName);
  }

  async configurePreferredName(data: ChildProfileData): Promise<void> {
    const checkbox = this.sameNameCheckbox();
    const preferredInput = this.preferredNameInput();

    if (data.useSamePreferredName) {
      await checkbox.check();
      await expect(preferredInput).toHaveValue(data.legalFirstName);
      await expect(preferredInput).toHaveValue(data.preferredName);

      await checkbox.uncheck();
      const customPreferred = `Pref${randomAlpha(5)}`;
      await preferredInput.fill(customPreferred);
      await expect(preferredInput).toHaveValue(customPreferred);

      await checkbox.check();
      await expect(preferredInput).toHaveValue(data.legalFirstName);
      data.preferredName = data.legalFirstName;
      return;
    }

    await checkbox.uncheck();
    await preferredInput.fill(data.preferredName);
    await expect(preferredInput).toHaveValue(data.preferredName);
    await expect(preferredInput).not.toHaveValue(data.legalFirstName);
  }

  async expectSportPrefilled(expectedSport = 'Lacrosse'): Promise<void> {
    const sportCombo = this.sportCombobox();
    await expect(sportCombo).toBeVisible();
    await expect(sportCombo).toContainText(expectedSport);
    await expect(sportCombo).toBeDisabled();
  }

  async fillChildProfile(data: ChildProfileData): Promise<ChildProfileData> {
    await this.expectOnAddChildForm();
    await this.fillLegalNames(data.legalFirstName, data.legalLastName);
    await this.configurePreferredName(data);
    await this.selectDateOfBirth(data.dateOfBirth);
    await this.selectRadixOption(this.genderCombobox(), data.gender);
    await this.schoolNameInput().fill(data.schoolName);
    await this.selectRadixOption(this.gradeCombobox(), data.grade);
    await this.expectSportPrefilled(data.sport);
    data.position = await this.selectPosition();
    return data;
  }

  private async selectPosition(): Promise<string> {
    const combo = this.positionCombobox();
    await combo.scrollIntoViewIfNeeded();
    await combo.click();

    const popoverId = await combo.getAttribute('aria-controls');
    const popover = popoverId
      ? this.page.locator(`[id="${popoverId}"]`)
      : this.page.locator('[data-slot="popover-content"]').last();
    await expect(popover).toBeVisible();

    const option = popover.locator('[role="option"]').first();
    const position = (await option.textContent())?.trim() ?? '';
    expect(position.length).toBeGreaterThan(0);
    await option.click();

    // Position picker stays open after selecting; close it by clicking the drawer heading.
    await this.childDetailsHeading().click();
    await expect(popover).toBeHidden();
    await expect(combo).toContainText(position);

    return position;
  }

  private createChildResponsePromise(): Promise<Response> {
    return this.page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/players')
        && response.request().method() === 'POST'
        && !response.url().includes('list')
        && response.status() === 201,
    );
  }

  async submitChildProfile(): Promise<CreatedChildResponse> {
    const responsePromise = this.createChildResponsePromise();
    await this.submitButton().click();
    const response = await responsePromise;
    await expect(this.formDrawer()).toBeHidden();
    return (await response.json()) as CreatedChildResponse;
  }

  async expectChildProfileDetails(data: ChildProfileData): Promise<void> {
    const profile = this.page.locator('main');
    const formattedDob = AddChildProfilePage.formatProfileDate(data.dateOfBirth);
    const gradeLabel = AddChildProfilePage.gradeLabel(data.grade);

    // Header shows the preferred name, while Child Details lists the legal name.
    await expect(
      profile.getByRole('heading', { name: `${data.preferredName} ${data.legalLastName}`, exact: true }),
    ).toBeVisible();
    await this.expectProfileField('First name', data.legalFirstName);
    await this.expectProfileField('Last name', data.legalLastName);
    await this.expectProfileField('Preferred name', data.preferredName);
    await this.expectProfileField('DOB', formattedDob);
    await this.expectProfileField('Gender', data.gender);
    await this.expectProfileField('School name', data.schoolName);
    await this.expectProfileField('Grade', gradeLabel);
    await this.expectProfileField('Sport', data.sport);
    await this.expectProfileField('Position', data.position);
  }

  private async expectProfileField(label: string, value: string): Promise<void> {
    const field = this.page
      .locator('main')
      .getByText(label, { exact: true })
      .locator('xpath=following-sibling::*[1]');
    await expect(field).toHaveText(value);
  }
}
