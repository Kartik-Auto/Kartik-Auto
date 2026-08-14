import { Page } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { EmailVerificationPage } from './EmailVerificationPage';
import { RoleSelectionPage } from './RoleSelectionpage';
import { pace } from '../helpers/pacing';
import { getEnvConfig } from '../helpers/env';

export const SIGNUP_PASSWORD = 'Test@123';
export const SIGNUP_EMAIL_DOMAIN = 'mailinator.com';

export type SignupData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export class OrganiserSignupPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async gotoSignup() {
    await this.page.goto(getEnvConfig().signupUrl, {
      waitUntil: 'domcontentloaded',
    });
    await this.page.locator('input[name="firstName"]').waitFor({ state: 'visible' });
  }

  async fillFirstName(firstName: string) {
    // TODO after DOM analysis: replace selector with actual name/placeholder found
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


  async fillAccountDetails(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.fillConfirmPassword(password);
    await this.clickNext();
  }

  async fillSignupForm(data: SignupData) {
    await this.fillFirstName(data.firstName);
    await this.fillLastName(data.lastName);
    await this.fillEmail(data.email);
    await this.fillPassword(data.password);
    await this.fillConfirmPassword(data.password);
  }

  async submitSignup(data: SignupData) {
    console.log('[OrganiserSignup] Filling and submitting signup form');
    await this.fillSignupForm(data);
    await this.clickNext();
    console.log('[OrganiserSignup] Signup form submitted');
  }

  /**
   * Full signup with valid credentials → email verify → Organizer role only.
   * Leaves the browser on the personal-details onboarding step.
   */
  async completeSignupToOrganizerRole(): Promise<SignupData> {
    const signupData = OrganiserSignupPage.buildSignupData();
    const verificationPage = new EmailVerificationPage(this.page);
    const roleSelectionPage = new RoleSelectionPage(this.page);

    console.log('[OrganiserSignup] Navigating to signup page');
    await this.gotoSignup();
    await this.submitSignup(signupData);

    console.log('[OrganiserSignup] Waiting for email verification screen');
    await verificationPage.waitForVerificationScreen();
    console.log('[OrganiserSignup] Verifying email via Mailinator');
    await verificationPage.verifyEmail(signupData.email);
    await pace(this.page);

    console.log('[OrganiserSignup] Choosing Organizer role only');
    await roleSelectionPage.waitForPage();
    await roleSelectionPage.chooseOrganizerOnly();

    console.log('[OrganiserSignup] Signup succeeded — ready for personal details');
    return signupData;
  }

  static logSignupCredentials(data: SignupData) {
    console.log(`[OrganiserSignup] Email: ${data.email}`);
    console.log(`[OrganiserSignup] Password: ${data.password}`);
  }

  static buildSignupEmail(firstName: string): string {
    const prefix = firstName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
    return `${prefix}${faker.string.numeric(4)}@${SIGNUP_EMAIL_DOMAIN}`;
  }

  static buildSignupData(overrides: Partial<SignupData> = {}): SignupData {
    const sanitizeName = (value: string) => value.replace(/[^A-Za-z ]/g, '').trim();
    const firstName = sanitizeName(faker.person.firstName()) || 'Testuser';
    const lastName = sanitizeName(faker.person.lastName()) || 'Automation';

    const signupData: SignupData = {
      firstName,
      lastName,
      email: OrganiserSignupPage.buildSignupEmail(firstName),
      password: SIGNUP_PASSWORD,
      ...overrides,
    };

    OrganiserSignupPage.logSignupCredentials(signupData);
    return signupData;
  }
}