import { Page, Locator, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { pace } from '../helpers/pacing';
import { getEnvConfig } from '../helpers/env';

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
  readonly verifyMobileButton: Locator;
  readonly otpInputs:          Locator;
  readonly verifiedStatus:     Locator;
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
    this.verifyMobileButton = page.getByRole('button', { name: /^Verify$/i }).first();
    // Staging OTP UI uses one digit per box under "Verification code"
    this.otpInputs          = page
      .locator('input[maxlength="1"]')
      .or(page.getByLabel(/Verification code/i).locator('input'));
    this.verifiedStatus     = page.getByText(/^Verified$/i);
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

    // Legacy optional phone step — skip only when the app still offers it.
    if (await this.proceedWithoutOtp.isVisible().catch(() => false)) {
      await this.skipOptionalPhoneVerification();
      await this.waitForPage();
      return;
    }

    const phoneStepNav = this.page.getByRole('button', {
      name: 'Navigate to Phone verification',
    });
    if (await phoneStepNav.isVisible().catch(() => false)) {
      await phoneStepNav.click();
    }

    const basicDetailsNav = this.page.getByRole('button', {
      name: 'Navigate to Basic Details',
    });
    if (await basicDetailsNav.isVisible().catch(() => false)) {
      await basicDetailsNav.click();
    }

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

  /**
   * Request OTP → enter digit in each box → Verify → assert Verified status.
   * Staging accepts `1` in every OTP box (same flow as parent signup).
   */
  async completeMobileVerification(mobileNumber?: string, otpDigit = '1') {
    const phone = mobileNumber ?? PersonalDetailsPage.buildMobileNumber();

    const phoneStepNav = this.page.getByRole('button', {
      name: 'Navigate to Phone verification',
    });
    if (await phoneStepNav.isVisible().catch(() => false)) {
      await phoneStepNav.click();
    }

    await this.fillMobileIfProvided(phone);

    await this.verifyMobileButton.click();
    await this.otpInputs.first().waitFor({ state: 'visible' });

    const boxCount = await this.otpInputs.count();
    for (let i = 0; i < boxCount; i++) {
      await this.otpInputs.nth(i).fill(otpDigit);
    }

    await this.page.getByRole('button', { name: /^Verify$/i }).click();
    await expect(this.verifiedStatus).toBeVisible();
  }

  /**
   * Fill mobile when present. Run OTP only if a Verify control appears — staff
   * UAT v2 uses a combined Personal Details form (address + Next) with no OTP.
   * Parent/organiser still complete OTP when the Verify button is shown.
   */
  async ensureMobileHandled(mobileNumber?: string, otpDigit = '1') {
    const phone = mobileNumber ?? PersonalDetailsPage.buildMobileNumber();

    const phoneStepNav = this.page.getByRole('button', {
      name: 'Navigate to Phone verification',
    });
    if (await phoneStepNav.isVisible().catch(() => false)) {
      await phoneStepNav.click();
    }

    if (await this.mobileInput.isVisible().catch(() => false)) {
      await this.fillMobileIfProvided(phone);
    }

    if (!getEnvConfig().requireMobileOtp) return;

    const verifyShown = await this.verifyMobileButton
      .waitFor({ state: 'visible', timeout: 8_000 })
      .then(() => true)
      .catch(() => false);
    if (!verifyShown) return;

    await this.completeMobileVerification(phone, otpDigit);
  }

  async ensureOnPersonalDetailsPageForParent() {
    if (
      await this.page
        .getByRole('heading', { name: 'Personal Details' })
        .isVisible()
        .catch(() => false)
    ) {
      return;
    }

    const phoneStepNav = this.page.getByRole('button', {
      name: 'Navigate to Phone verification',
    });
    if (await phoneStepNav.isVisible().catch(() => false)) {
      await phoneStepNav.click();
    }

    await this.waitForPage();
  }

  private async fillMobileIfProvided(mobileNumber: string) {
    if (!(await this.mobileInput.isEditable().catch(() => false))) return;
    await this.mobileInput.fill(mobileNumber);
    await this.mobileInput.blur();
    await expect(this.page.getByText(/Invalid phone number format/i)).toHaveCount(0);
  }

  /** Assign a fresh random data-testid and fill the field directly (no autosuggest). */
  private async fillWithRandomTestId(field: Locator, value: string, prefix: string) {
    const testId = `${prefix}-${faker.string.alphanumeric(8).toLowerCase()}`;
    await field.evaluate((el, id) => el.setAttribute('data-testid', id), testId);
    await this.page.getByTestId(testId).fill(value);
  }

  /** Text field, or a Select/combobox (staff UAT v2 Personal Details). */
  private async fillTextOrSelect(field: Locator, value: string, prefix: string, selectName: RegExp) {
    if (await field.isVisible().catch(() => false)) {
      await this.fillWithRandomTestId(field, value, prefix);
      return;
    }

    const combo = this.page.getByRole('combobox', { name: selectName }).or(
      this.page.getByPlaceholder(selectName),
    );
    await expect(combo.first()).toBeVisible();
    await combo.first().click();
    const option = this.page.getByRole('option').filter({ hasNotText: /select/i }).first();
    await expect(option).toBeVisible();
    await option.click();
  }

  async fillPersonalDetails(data: PersonalDetailsData) {
    await this.ensureOnPersonalDetailsPage();

    await this.fillWithRandomTestId(this.addressInput, data.address, 'address');
    await this.fillTextOrSelect(this.stateInput, data.state, 'state', /state/i);
    await this.fillTextOrSelect(this.cityInput, data.city, 'city', /city/i);
    await this.fillWithRandomTestId(this.zipCodeInput, data.zipCode, 'zip');
  }

  async clickNext() {
    await expect(this.nextButton).toBeEnabled();
    await Promise.all([
      this.page.getByText('Step-1: Basic Information').waitFor({ state: 'visible' }),
      this.nextButton.click(),
    ]);
    await pace(this.page);
  }

  /**
   * Mobile (OTP on Stage only) → address fields → Next into org Step-1.
   */
  async submitPersonalDetails(data: PersonalDetailsData) {
    const personalData = {
      ...data,
      mobileNumber: data.mobileNumber ?? PersonalDetailsPage.buildMobileNumber(),
    };

    await this.ensureOnPersonalDetailsPage();
    await this.ensureMobileHandled(personalData.mobileNumber);
    await this.fillPersonalDetails(personalData);
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

  /** US NANP: area code and exchange cannot start with 0 or 1. */
  static buildMobileNumber(): string {
    const areaCode = faker.number.int({ min: 200, max: 999 });
    const exchange = faker.number.int({ min: 200, max: 999 });
    return `${areaCode}${exchange}${faker.string.numeric(4)}`;
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
      mobileNumber: PersonalDetailsPage.buildMobileNumber(),
    });
  }
}
