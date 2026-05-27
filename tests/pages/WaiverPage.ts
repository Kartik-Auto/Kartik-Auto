import { expect, Locator, Page } from '@playwright/test';
import { faker } from '@faker-js/faker';

export type WaiverType = 'Organization' | 'Player';
export type ProgramType = 'Coach' | 'Tournament' | 'Camp' | 'Clinic' | 'Class' | 'League';
export type WaiverStatus = 'In Effect' | 'Draft';

export type WaiverData = {
  name: string;
  description: string;
  waiverType: WaiverType;
  programType: ProgramType;
};

/** Combinations verified on stage (some program types are disabled per waiver type). */
const VALID_WAIVER_COMBOS: { waiverType: WaiverType; programType: ProgramType }[] = [
  { waiverType: 'Organization', programType: 'Coach' },
  { waiverType: 'Organization', programType: 'Tournament' },
  { waiverType: 'Organization', programType: 'Camp' },
  { waiverType: 'Organization', programType: 'Clinic' },
  { waiverType: 'Player', programType: 'Tournament' },
  { waiverType: 'Player', programType: 'Camp' },
];

export class WaiverPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly createWaiverButton: Locator;
  readonly searchInput: Locator;
  readonly publishButton: Locator;
  readonly saveAsDraftButton: Locator;
  readonly cancelButton: Locator;
  readonly nameInput: Locator;
  readonly descriptionEditor: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Waivers' });
    this.createWaiverButton = page.getByRole('button', { name: 'Create Waiver' });
    this.searchInput = page.getByRole('textbox', { name: 'Search by name' });
    this.publishButton = page.getByRole('button', { name: 'Publish' });
    this.saveAsDraftButton = page.getByRole('button', { name: 'Save as Draft' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.nameInput = page.locator('input[name="name"]');
    this.descriptionEditor = page.locator('.ql-editor');
  }

  async goto(url: string) {
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    await this.waitForListPage();
  }

  async waitForListPage() {
    await expect(this.page).toHaveURL(/\/settings\/waiver/);
    await expect(this.heading).toBeVisible();
    await expect(this.createWaiverButton).toBeVisible();
  }

  async waitForCreateForm() {
    await expect(this.page.getByRole('heading', { name: 'Waiver Type *' })).toBeVisible();
    await expect(this.publishButton).toBeVisible();
  }

  async clickCreateWaiver() {
    await this.createWaiverButton.click();
    await this.waitForCreateForm();
  }

  private async selectOption(label: string) {
    await this.page.locator('label').filter({ hasText: new RegExp(`^${label}$`) }).click();
  }

  async fillWaiverForm(data: WaiverData) {
    await this.selectOption(data.waiverType);
    await this.selectOption(data.programType);
    await this.nameInput.fill(data.name);
    await this.descriptionEditor.fill(data.description);
  }

  async publish() {
    await this.publishButton.click();
    await this.waitForListPage();
  }

  async saveAsDraft() {
    await this.saveAsDraftButton.click();
    await this.waitForListPage();
  }

  async cancelCreate() {
    await this.cancelButton.click();
    await this.waitForListPage();
  }

  async createAndPublish(data: WaiverData) {
    await this.clickCreateWaiver();
    await this.fillWaiverForm(data);
    await this.publish();
  }

  async createAsDraft(data: WaiverData) {
    await this.clickCreateWaiver();
    await this.fillWaiverForm(data);
    await this.saveAsDraft();
  }

  waiverRow(name: string) {
    return this.page.getByRole('row').filter({
      has: this.page.getByRole('cell', { name }),
    });
  }

  async expectWaiverInList(data: WaiverData, status: WaiverStatus) {
    const row = this.waiverRow(data.name);
    await expect(row).toBeVisible();
    // Status column is the second cell (after Waivers Name).
    await expect(row.getByRole('cell').nth(1)).toHaveText(status);
    await expect(row).toContainText(data.waiverType);
    await expect(row).toContainText(data.programType);
  }

  static randomWaiverCombo() {
    return faker.helpers.arrayElement(VALID_WAIVER_COMBOS);
  }

  static buildWaiverName(): string {
    return `${faker.company.buzzPhrase()} Waiver ${faker.string.alphanumeric(4)}`;
  }

  static buildWaiverDescription(): string {
    return faker.lorem.paragraphs({ min: 1, max: 2 });
  }

  static buildWaiverData(overrides: Partial<WaiverData> = {}): WaiverData {
    const combo = WaiverPage.randomWaiverCombo();
    return {
      name: WaiverPage.buildWaiverName(),
      description: WaiverPage.buildWaiverDescription(),
      waiverType: combo.waiverType,
      programType: combo.programType,
      ...overrides,
    };
  }

  static buildPublishedWaiverData(overrides: Partial<WaiverData> = {}): WaiverData {
    return WaiverPage.buildWaiverData({
      waiverType: 'Organization',
      programType: 'Coach',
      ...overrides,
    });
  }

  static buildDraftWaiverData(overrides: Partial<WaiverData> = {}): WaiverData {
    return WaiverPage.buildWaiverData({
      waiverType: 'Organization',
      programType: 'Coach',
      ...overrides,
    });
  }
}
