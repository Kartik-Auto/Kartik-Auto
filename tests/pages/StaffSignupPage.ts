import { expect, type Page } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { EmailVerificationPage } from './EmailVerificationPage';
import { RoleSelectionPage } from './RoleSelectionpage';
import { PersonalDetailsPage, type PersonalDetailsData } from './PersonalDetailsPage';
import { pace } from '../helpers/pacing';
import { getEnvConfig } from '../helpers/env';
import { PARENT_SIGNUP_EMAIL_DOMAIN, PARENT_SIGNUP_PASSWORD } from './ParentSignupPage';

export type StaffSignupData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export class StaffSignupPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async gotoSignup() {
    await this.page.goto(getEnvConfig().signupUrl, { waitUntil: 'domcontentloaded' });
    await this.page.locator('input[name="firstName"]').waitFor({ state: 'visible' });
  }

  async fillFirstName(firstName: string) {
    await this.page.locator('input[name="firstName"]').fill(firstName);
  }

  async fillLastName(lastName: string) {
    await this.page.locator('input[name="lastName"]').fill(lastName);
  }

  async fillEmail(email: string) {
    await this.page.fill('input[name="email"]', email);
  }

  async fillPassword(password: string) {
    await this.page.fill('input[name="password"]', password);
  }

  async fillConfirmPassword(password: string) {
    await this.page.fill('input[name="confirmPassword"]', password);
  }

  async clickNext() {
    await this.page.getByRole('button', { name: 'Next' }).click();
  }

  async fillSignupForm(data: StaffSignupData) {
    await this.fillFirstName(data.firstName);
    await this.fillLastName(data.lastName);
    await this.fillEmail(data.email);
    await this.fillPassword(data.password);
    await this.fillConfirmPassword(data.password);
  }

  async submitSignup(data: StaffSignupData) {
    console.log('[StaffSignup] Filling and submitting signup form');
    await this.fillSignupForm(data);
    await this.clickNext();
    console.log('[StaffSignup] Signup form submitted');
  }

  /**
   * Signup → Mailinator verify → Staff Member role only.
   * Leaves the browser on personal details.
   */
  async completeSignupToStaffRole(): Promise<StaffSignupData> {
    const signupData = StaffSignupPage.buildSignupData();
    const verificationPage = new EmailVerificationPage(this.page);
    const roleSelectionPage = new RoleSelectionPage(this.page);

    console.log('[StaffSignup] Navigating to signup page');
    await this.gotoSignup();
    await this.submitSignup(signupData);

    console.log('[StaffSignup] Waiting for email verification screen');
    await verificationPage.waitForVerificationScreen();
    console.log('[StaffSignup] Verifying email via Mailinator');
    await verificationPage.verifyEmail(signupData.email);
    await pace(this.page);

    console.log('[StaffSignup] Choosing Staff Member role only');
    await roleSelectionPage.waitForPage();
    await roleSelectionPage.chooseStaffOnly();

    console.log('[StaffSignup] Ready for personal details');
    return signupData;
  }

  /**
   * Parent-style personal details (mobile OTP when required), then land on
   * Find Existing Organisation — not organiser org Step-1.
   */
  async submitPersonalDetailsToFindOrg(
    personalData: PersonalDetailsData = PersonalDetailsPage.buildPersonalDetailsDataWithPhone(),
  ): Promise<void> {
    const details = new PersonalDetailsPage(this.page);
    const data = {
      ...personalData,
      mobileNumber: personalData.mobileNumber ?? PersonalDetailsPage.buildMobileNumber(),
    };

    console.log('[StaffSignup] Filling personal details');
    await details.ensureOnPersonalDetailsPageForParent();
    await details.ensureMobileHandled(data.mobileNumber);
    await details.fillPersonalDetails(data);

    const nextOrContinue = this.page
      .getByRole('button', { name: 'Next', exact: true })
      .or(this.page.getByRole('button', { name: 'Continue', exact: true }))
      .or(this.page.getByRole('button', { name: 'Sign up', exact: true }));
    await expect(nextOrContinue.first()).toBeEnabled();
    await nextOrContinue.first().click();

    await expect(
      this.page.getByRole('heading', { name: /Find Existing Organi[sz]ation/i }),
    ).toBeVisible();
    console.log('[StaffSignup] Find Existing Organisation page is visible');
  }

  static buildSignupData(overrides: Partial<StaffSignupData> = {}): StaffSignupData {
    const sanitizeName = (value: string) => value.replace(/[^A-Za-z ]/g, '').trim();
    const firstName = sanitizeName(faker.person.firstName()) || 'Staffuser';
    const lastName = sanitizeName(faker.person.lastName()) || 'Automation';
    const prefix = firstName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'staff';

    const signupData: StaffSignupData = {
      firstName,
      lastName,
      email: `${prefix}${faker.string.numeric(4)}@${PARENT_SIGNUP_EMAIL_DOMAIN}`,
      password: PARENT_SIGNUP_PASSWORD,
      ...overrides,
    };

    console.log(`[StaffSignup] Email: ${signupData.email}`);
    console.log(`[StaffSignup] Password: ${signupData.password}`);
    return signupData;
  }
}
