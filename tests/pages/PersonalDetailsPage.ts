import { Page, Locator } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { pace } from '../helpers/pacing';

export type PersonalDetailsData = {
  address: string;
  state: string;
  city: string;
  zipCode: string;
  mobileNumber?: string;
};

export class PersonalDetailsPage {
  readonly page: Page;

  readonly emailVerifiedToast: Locator;
  readonly mobileInput:        Locator;
  readonly proceedWithoutOtp:  Locator;
  readonly addressInput:       Locator;
  readonly stateInput:         Locator;
  readonly cityInput:          Locator;
  readonly zipCodeInput:       Locator;
  readonly nextButton:         Locator;
  readonly cancelButton:       Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailVerifiedToast = page.getByText('Your email has been verified');
    this.mobileInput        = page.getByRole('textbox', { name: 'Mobile number' });
    this.proceedWithoutOtp  = page
      .getByRole('button', { name: 'Proceed without OTP' })
      .or(page.getByRole('link', { name: 'Proceed without OTP' }))
      .or(page.getByText('Proceed without OTP'));
    this.addressInput       = page.getByRole('textbox', { name: /Address/i });
    this.stateInput         = page.getByRole('textbox', { name: /State/i });
    this.cityInput          = page.getByRole('textbox', { name: /City/i });
    this.zipCodeInput       = page.getByRole('textbox', { name: /Zip code/i });
    this.nextButton         = page.getByRole('button', { name: 'Next' });
    this.cancelButton       = page.getByRole('button', { name: 'Cancel' });
  }

  async waitForPage() {
    await this.page.getByRole('heading', { name: 'Personal Details' }).waitFor({ state: 'visible' });
  }

  async ensureOnPersonalDetailsPage() {
    if (
      await this.page
        .getByRole('heading', { name: 'Personal Details' })
        .isVisible()
        .catch(() => false)
    ) {
      return;
    }
    await this.skipOptionalPhoneVerification();
    await this.waitForPage();
  }

  async skipOptionalPhoneVerification() {
    const proceed = this.proceedWithoutOtp;
    if (await proceed.isVisible().catch(() => false)) {
      await proceed.click();
    } else {
      const phoneStepNav = this.page.getByRole('button', {
        name: 'Navigate to Phone verification',
      });
      if (await phoneStepNav.isVisible().catch(() => false)) {
        await phoneStepNav.click();
      }
      await proceed.waitFor({ state: 'visible' });
      await proceed.click();
    }

    const basicDetailsNav = this.page.getByRole('button', {
      name: 'Navigate to Basic Details',
    });
    if (await basicDetailsNav.isVisible().catch(() => false)) {
      await basicDetailsNav.click();
    }
  }

  private async fillMobileIfProvided(mobileNumber: string) {
    if (!(await this.mobileInput.isEditable().catch(() => false))) return;
    await this.mobileInput.fill(mobileNumber);
  }

  /** Assign a fresh random data-testid and fill the field directly (no autosuggest). */
  private async fillWithRandomTestId(field: Locator, value: string, prefix: string) {
    const testId = `${prefix}-${faker.string.alphanumeric(8).toLowerCase()}`;
    await field.evaluate((el, id) => el.setAttribute('data-testid', id), testId);
    await this.page.getByTestId(testId).fill(value);
  }

  async fillPersonalDetails(data: PersonalDetailsData) {
    await this.ensureOnPersonalDetailsPage();

    if (data.mobileNumber) {
      await this.fillMobileIfProvided(data.mobileNumber);
    }

    await this.fillWithRandomTestId(this.addressInput, data.address, 'address');
    await this.fillWithRandomTestId(this.stateInput, data.state, 'state');
    await this.fillWithRandomTestId(this.cityInput, data.city, 'city');
    await this.fillWithRandomTestId(this.zipCodeInput, data.zipCode, 'zip');
  }

  async clickNext() {
    await Promise.all([
      this.page.getByText('Step-1: Basic Information').waitFor({ state: 'visible' }),
      this.nextButton.click(),
    ]);
    await pace(this.page);
  }

  async submitPersonalDetails(data: PersonalDetailsData) {
    await this.fillPersonalDetails(data);
    await this.clickNext();
  }

  static buildAddress(): string {
    return faker.location.streetAddress({ useFullAddress: true });
  }

  static buildState(): string {
    return faker.location.state({ abbreviated: false });
  }

  static buildCity(): string {
    return faker.location.city();
  }

  static buildZipCode(): string {
    return faker.location.zipCode('#####');
  }

  static buildPersonalDetailsData(overrides: Partial<PersonalDetailsData> = {}): PersonalDetailsData {
    return {
      address: PersonalDetailsPage.buildAddress(),
      state: PersonalDetailsPage.buildState(),
      city: PersonalDetailsPage.buildCity(),
      zipCode: PersonalDetailsPage.buildZipCode(),
      ...overrides,
    };
  }

  static buildPersonalDetailsDataWithPhone(): PersonalDetailsData {
    return PersonalDetailsPage.buildPersonalDetailsData({
      mobileNumber: faker.string.numeric(10),
    });
  }
}
