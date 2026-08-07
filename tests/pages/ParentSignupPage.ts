import { Page, Locator, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { EmailVerificationPage } from './EmailVerificationPage';
import { RoleSelectionPage } from './RoleSelectionpage';
import { PersonalDetailsPage, PersonalDetailsData } from './PersonalDetailsPage';
import { pace } from '../helpers/pacing';

export const PARENT_SIGNUP_PASSWORD = 'Test@123';
export const PARENT_SIGNUP_EMAIL_DOMAIN = 'mailinator.com';

export type ParentSignupData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export class ParentSignupPage {
  readonly page: Page;
  readonly signUpButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.signUpButton = page.getByRole('button', { name: 'Sign up' });
  }

  async gotoSignup() {
    await this.page.goto('https://stage.futureonesports.com/signup', {
      waitUntil: 'domcontentloaded',
    });
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

  async fillSignupForm(data: ParentSignupData) {
    await this.fillFirstName(data.firstName);
    await this.fillLastName(data.lastName);
    await this.fillEmail(data.email);
    await this.fillPassword(data.password);
    await this.fillConfirmPassword(data.password);
  }

  async submitSignup(data: ParentSignupData) {
    console.log('[ParentSignup] Filling and submitting signup form');
    await this.fillSignupForm(data);
    await this.clickNext();
    console.log('[ParentSignup] Signup form submitted');
  }

  /** Submit personal details; parent signup ends when Add Child Profile popup appears. */
  async clickSignUp() {
    const addChildDialog = this.addChildProfileDialog();
    await expect(this.signUpButton).toBeEnabled();
    await this.signUpButton.click();
    await expect(this.page).not.toHaveURL(/\/onboarding/);
    await expect(addChildDialog).toBeVisible({ timeout: 0 });
    await pace(this.page);
  }

  /** Empty-state popup shown after first parent signup (before any child exists). */
  addChildProfileDialog(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: /Add Child Profile/i });
  }

  async expectAddChildProfilePopup(): Promise<void> {
    const dialog = this.addChildProfileDialog();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Add Child Profile', exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Add Child Profile', exact: true })).toBeVisible();
  }

  async submitPersonalDetails(personalData: PersonalDetailsData) {
    const personalDetailsPage = new PersonalDetailsPage(this.page);

    console.log('[ParentSignup] Filling personal details');
    await personalDetailsPage.ensureOnPersonalDetailsPageForParent();
    await personalDetailsPage.completeMobileVerification(personalData.mobileNumber);
    await personalDetailsPage.fillPersonalDetails(personalData);

    console.log('[ParentSignup] Clicking Sign up');
    await this.clickSignUp();
  }

  /**
   * Signup → Mailinator verify → Parent role only.
   * Leaves the browser on the personal details onboarding step.
   */
  async completeSignupToParentRole(): Promise<ParentSignupData> {
    const signupData = ParentSignupPage.buildSignupData();
    const verificationPage = new EmailVerificationPage(this.page);
    const roleSelectionPage = new RoleSelectionPage(this.page);

    console.log('[ParentSignup] Navigating to signup page');
    await this.gotoSignup();
    await this.submitSignup(signupData);

    console.log('[ParentSignup] Waiting for email verification screen');
    await verificationPage.waitForVerificationScreen();
    console.log('[ParentSignup] Verifying email via Mailinator');
    await verificationPage.verifyEmail(signupData.email);
    await pace(this.page);

    console.log('[ParentSignup] Choosing Parent / Player role only');
    await roleSelectionPage.waitForPage();
    await roleSelectionPage.chooseParentOnly();

    console.log('[ParentSignup] Ready for personal details');
    return signupData;
  }

  /**
   * Full parent signup through personal details until Add Child Profile popup.
   */
  async completeSignupToAddChildPopup(
    personalData: PersonalDetailsData = PersonalDetailsPage.buildPersonalDetailsDataWithPhone(),
  ): Promise<ParentSignupData> {
    const signupData = await this.completeSignupToParentRole();
    await this.submitPersonalDetails(personalData);

    console.log('[ParentSignup] Signup completed — Add Child Profile popup visible');
    return signupData;
  }

  static logSignupCredentials(data: ParentSignupData) {
    console.log(`[ParentSignup] Email: ${data.email}`);
    console.log(`[ParentSignup] Password: ${data.password}`);
  }

  static buildSignupEmail(firstName: string) {
    const prefix = firstName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
    return `${prefix}${faker.string.numeric(4)}@${PARENT_SIGNUP_EMAIL_DOMAIN}`;
  }

  static buildSignupData(overrides: Partial<ParentSignupData> = {}): ParentSignupData {
    const sanitizeName = (value: string) => value.replace(/[^A-Za-z ]/g, '').trim();
    const firstName = sanitizeName(faker.person.firstName()) || 'Testuser';
    const lastName = sanitizeName(faker.person.lastName()) || 'Automation';

    const signupData: ParentSignupData = {
      firstName,
      lastName,
      email: ParentSignupPage.buildSignupEmail(firstName),
      password: PARENT_SIGNUP_PASSWORD,
      ...overrides,
    };

    ParentSignupPage.logSignupCredentials(signupData);
    return signupData;
  }
}
