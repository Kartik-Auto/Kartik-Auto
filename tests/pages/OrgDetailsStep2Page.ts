import { Page, Locator, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { pace } from '../helpers/pacing';

export type OrgStep2Data = {
  website: string;
  address: string;
  state: string;
  city: string;
  zipCode: string;
  sport?: string;
  logoPath?: string;
};

export class OrgDetailsStep2Page {
  readonly page: Page;

  readonly headingText: Locator;
  readonly uploadLogoBtn: Locator;
  readonly websiteInput: Locator;
  readonly addressInput: Locator;
  readonly stateInput: Locator;
  readonly cityInput: Locator;
  readonly zipCodeInput: Locator;
  readonly sportDropdown: Locator;
  readonly signUpButton: Locator;
  readonly processingText: Locator;

  constructor(page: Page) {
    this.page = page;
    this.headingText = page.getByRole('heading', { name: 'Organization Details' });
    this.uploadLogoBtn = page.getByText('Upload Logo');
    this.websiteInput = page.getByRole('textbox', { name: 'Website' });
    this.addressInput = page.getByRole('textbox', { name: /Address/i });
    this.stateInput = page.getByRole('textbox', { name: /State/i });
    this.cityInput = page.getByRole('textbox', { name: /City/i });
    this.zipCodeInput = page.getByRole('textbox', { name: /Zip code/i });
    this.sportDropdown = page.getByRole('combobox').filter({ hasText: /sport/i });
    this.signUpButton = page.getByRole('button', { name: 'Sign up' });
    this.processingText = page.getByText('Processing...');
  }

  async waitForPage() {
    await this.page.getByText('Step-2: Branding & Location').waitFor({ state: 'visible' });
  }

  async uploadLogo(filePath: string) {
    const [fileChooser] = await Promise.all([
      this.page.waitForEvent('filechooser'),
      this.uploadLogoBtn.click(),
    ]);
    await fileChooser.setFiles(filePath);
  }

  /** Direct fill without autosuggest (same approach as PersonalDetailsPage). */
  private async fillWithRandomTestId(field: Locator, value: string, prefix: string) {
    const testId = `${prefix}-${faker.string.alphanumeric(8).toLowerCase()}`;
    await field.evaluate((el, id) => el.setAttribute('data-testid', id), testId);
    await this.page.getByTestId(testId).fill(value);
  }

  private autocompleteDropdown(field: Locator) {
    return field.locator('xpath=..').locator('ul');
  }

  /** Close any open Places/combobox overlay so it cannot block Sign up. */
  private async dismissAutocompleteDropdowns() {
    for (const field of [this.addressInput, this.stateInput, this.cityInput]) {
      const dropdown = this.autocompleteDropdown(field);
      if (await dropdown.isVisible().catch(() => false)) {
        await this.page.keyboard.press('Escape');
        await expect(dropdown).toBeHidden();
      }
    }
    await this.headingText.click();
  }

  /** Type address and select the first suggestion from the address field dropdown only. */
  private async fillAddressWithFirstSuggestion(address: string) {
    await this.addressInput.click();
    await this.addressInput.fill(address);

    const dropdown = this.autocompleteDropdown(this.addressInput);
    const firstSuggestion = dropdown.getByRole('listitem').first();
    await expect(firstSuggestion).toBeVisible();
    await firstSuggestion.click();
    await expect(dropdown).toBeHidden();
    await pace(this.page);
  }

  private async fieldHasValue(field: Locator) {
    return (await field.inputValue()).trim().length > 0;
  }

  /** Skip when Places already filled the field; otherwise type and pick first suggestion. */
  private async fillIfEmptyWithSuggestion(field: Locator, value: string, prefix: string) {
    if (await this.fieldHasValue(field)) return;

    await field.click();
    await field.fill(value);
    const dropdown = this.autocompleteDropdown(field);
    const suggestion = dropdown.getByRole('listitem').first();
    if (await suggestion.isVisible().catch(() => false)) {
      await suggestion.click();
      await expect(dropdown).toBeHidden();
      return;
    }
    await this.fillWithRandomTestId(field, value, prefix);
    await this.dismissAutocompleteDropdowns();
  }

  private async fillIfEmpty(field: Locator, value: string, prefix: string) {
    if (await this.fieldHasValue(field)) return;
    await this.fillWithRandomTestId(field, value, prefix);
  }

  async fillOrgStep2(data: OrgStep2Data) {
    if (data.logoPath) {
      await this.uploadLogo(data.logoPath);
    }
    await this.websiteInput.fill(data.website);
    await this.fillAddressWithFirstSuggestion(data.address);
    await this.fillIfEmptyWithSuggestion(this.stateInput, data.state, 'org-state');
    await this.fillIfEmptyWithSuggestion(this.cityInput, data.city, 'org-city');
    await this.fillIfEmpty(this.zipCodeInput, data.zipCode, 'org-zip');
    await this.dismissAutocompleteDropdowns();
    await pace(this.page);
  }

  async clickSignUp() {
    const dashboardLink = this.page.getByRole('link', { name: 'Dashboard' }).first();
    await this.dismissAutocompleteDropdowns();
    await expect(this.signUpButton).toBeEnabled();
    await this.signUpButton.click();
    await expect(dashboardLink).toBeVisible({ timeout: 0 });
  }

  async submitOrgStep2(data: Parameters<typeof this.fillOrgStep2>[0]) {
    await this.fillOrgStep2(data);
    await this.clickSignUp();
  }

  static buildOrgStep2Data(overrides: Partial<OrgStep2Data> = {}): OrgStep2Data {
    return {
      website: `${faker.internet.domainWord()}.com`,
      address: faker.location.streetAddress({ useFullAddress: true }),
      state: faker.location.state({ abbreviated: false }),
      city: faker.location.city(),
      zipCode: faker.location.zipCode('#####'),
      ...overrides,
    };
  }
}
