import { Page, Locator, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { pace } from '../helpers/pacing';

export class OrgDetailsStep1Page {
  readonly page: Page;

  readonly headingText:       Locator;
  readonly orgNameInput:      Locator;
  readonly legalEntityName:   Locator;
  readonly einInput:          Locator;
  readonly legalEntityType:   Locator;  // dropdown
  readonly emailIdInput:      Locator;  // pre-filled, read-only
  readonly contactNumberInput:Locator;
  readonly nextButton:        Locator;
  readonly saveAddressDialog: Locator;  // Chrome "Save address?" dialog
  readonly noThanksButton:    Locator;

  constructor(page: Page) {
    this.page = page;
    // TODO: Replace with real locators from DOM inspection
    this.headingText        = page.getByRole('heading', { name: 'Organization Details' });
    this.orgNameInput       = page.getByLabel('Organization name');
    this.legalEntityName    = page.getByLabel('Legal entity name');
    this.einInput           = page.getByLabel('Tax identification number (EIN)');
    this.legalEntityType    = page.getByRole('combobox').filter({ hasText: 'Select legal entity type' });
    this.emailIdInput       = page.getByLabel('Email ID');
    this.contactNumberInput = page.getByLabel('Contact Number');
    this.nextButton         = page.getByRole('button', { name: 'Next' });
    // Browser native "Save address?" popup — handle via dialog event
    this.saveAddressDialog  = page.locator('[role="dialog"]');
    this.noThanksButton     = page.getByRole('button', { name: 'No, thanks' });
  }

  async waitForPage() {
    await this.page.getByText('Step-1: Basic Information').waitFor({ state: 'visible' });
  }

  async dismissSaveAddressDialog() {
    if (await this.noThanksButton.isVisible().catch(() => false)) {
      await this.noThanksButton.click();
    }
  }

  async fillOrgStep1(data: {
    orgName: string;
    legalEntityName: string;
    ein: string;
    legalEntityType: string;
    contactNumber: string;
  }) {
    await this.orgNameInput.fill(data.orgName);
    await this.legalEntityName.fill(data.legalEntityName);
    await this.einInput.fill(data.ein);
    await this.legalEntityType.click();
    await this.page.getByRole('option', { name: new RegExp(data.legalEntityType, 'i') }).click();
    await this.contactNumberInput.fill(data.contactNumber);
    await expect(this.page.getByText('Invalid phone number format')).not.toBeVisible();
    await this.dismissSaveAddressDialog();
  }

  async clickNext() {
    const step2Heading = this.page.getByText('Step-2: Branding & Location');
    await Promise.all([step2Heading.waitFor({ state: 'visible' }), this.nextButton.click()]);
    await pace(this.page);
  }

  async submitOrgStep1(data: Parameters<typeof this.fillOrgStep1>[0]) {
    await this.fillOrgStep1(data);
    await this.clickNext();
  }

  /** US NANP: area code and exchange cannot start with 0 or 1. */
  static buildContactNumber(): string {
    const areaCode = faker.number.int({ min: 200, max: 999 });
    const exchange = faker.number.int({ min: 200, max: 999 });
    return `${areaCode}${exchange}${faker.string.numeric(4)}`;
  }

  static buildOrgStep1Data(emailPrefix?: string) {
    const prefix = emailPrefix ?? faker.string.alpha(6).toLowerCase();
    return {
      orgName: `${faker.company.name()}-${faker.string.alpha(4).toLowerCase()}`,
      legalEntityName: `${faker.company.name()} LLC`,
      ein: faker.string.numeric(9),
      legalEntityType: 'Corporation',
      contactNumber: OrgDetailsStep1Page.buildContactNumber(),
      email: `${prefix}@yopmail.com`,
    };
  }
}