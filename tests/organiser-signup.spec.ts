import { test, expect, Page, BrowserContext } from '@playwright/test';
import { OrganiserSignupPage, SignupData } from './pages/OrganiserSignupPage';
import { EmailVerificationPage } from './pages/EmailVerificationPage';
import { RoleSelectionPage } from './pages/RoleSelectionpage';
import { PersonalDetailsPage } from './pages/PersonalDetailsPage';
import { OrgDetailsStep1Page } from './pages/OrgDetailsStep1Page';
import { OrgDetailsStep2Page } from './pages/OrgDetailsStep2Page';
import { config } from './helpers/env';

const ONBOARDING_TIMEOUT = 180_000;

/** Wait until main app dashboard is visible after signup completes. */
async function waitForDashboard(page: Page) {
  await expect(page.getByRole('link', { name: 'Dashboard' }).first()).toBeVisible({
    timeout: 0,
  });
}

test.describe('Sign Up Flow — FutureOne Sports', () => {

  test('TC-01 | Signup form submit should land on Email Verification screen', async ({ page }) => {
    console.log('TC-01: Building signup data');
    const signupData = OrganiserSignupPage.buildSignupData();
    console.log('TC-01: Signup data prepared');
    const signupPage = new OrganiserSignupPage(page);
    const verificationPage = new EmailVerificationPage(page);

    console.log('TC-01: Navigating to signup page');
    await signupPage.gotoSignup();
    console.log('TC-01: Verifying signup URL');
    console.log('TC-01: Submitting signup form');
    await signupPage.submitSignup(signupData);

    console.log('TC-01: Waiting for email verification screen');
    await verificationPage.waitForVerificationScreen();
    console.log('TC-01: Validating success toast');
    await expect(verificationPage.successToast).toBeVisible();
    console.log('TC-01: Validating verification heading');
    await expect(verificationPage.verificationHeading).toBeVisible();
    console.log('TC-01: Validating resend button visibility');
    await expect(verificationPage.resendButton).toBeVisible();
    console.log('TC-01: Completed');
  });
  

  test('TC-02 | Empty form click Next should not proceed', async ({ page }) => {
    console.log('TC-02: Initializing signup page');
    const signupPage = new OrganiserSignupPage(page);
    console.log('TC-02: Navigating to signup page');
    await signupPage.gotoSignup();
    console.log('TC-02: Clicking Next with empty form');
    await signupPage.clickNext();
    console.log('TC-02: Asserting user stays on signup page');
    await expect(page).toHaveURL(/signup/i);
    console.log('TC-02: Completed');
    
  });

  test('TC-03 | Mismatched passwords should show validation', async ({ page }) => {
    console.log('TC-03: Building signup data');
    const signupData = OrganiserSignupPage.buildSignupData();
    const signupPage = new OrganiserSignupPage(page);

    console.log('TC-03: Navigating to signup page');
    await signupPage.gotoSignup();
    console.log('TC-03: Filling first name');
    await signupPage.fillFirstName(signupData.firstName);
    console.log('TC-03: Filling last name');
    await signupPage.fillLastName(signupData.lastName);
    console.log('TC-03: Filling email');
    await signupPage.fillEmail(signupData.email);
    console.log('TC-03: Filling password');
    await signupPage.fillPassword(signupData.password);
    console.log('TC-03: Filling mismatched confirm password');
    await signupPage.fillConfirmPassword('WrongPassword@123');
    console.log('TC-03: Clicking Next');
    await signupPage.clickNext();

    console.log('TC-03: Verifying mismatch validation message');
    await expect(page.getByText(/password.*match|match.*password/i)).toBeVisible();
    console.log('TC-03: Completed');
  });

  test('TC-04 | Invalid email format should fail HTML validation', async ({ page }) => {
    console.log('TC-04: Building signup data');
    const signupData = OrganiserSignupPage.buildSignupData();
    const signupPage = new OrganiserSignupPage(page);

    console.log('TC-04: Navigating to signup page');
    await signupPage.gotoSignup();
    console.log('TC-04: Filling first name');
    await signupPage.fillFirstName(signupData.firstName);
    console.log('TC-04: Filling last name');
    await signupPage.fillLastName(signupData.lastName);
    console.log('TC-04: Filling invalid email');
    await signupPage.fillEmail('not-an-email');
    console.log('TC-04: Filling password');
    await signupPage.fillPassword(signupData.password);
    console.log('TC-04: Filling confirm password');
    await signupPage.fillConfirmPassword(signupData.password);
    console.log('TC-04: Clicking Next');
    await signupPage.clickNext();

    console.log('TC-04: Checking HTML email validity state');
    const isInvalid = await page.locator('input[name="email"]').evaluate(
      (el: HTMLInputElement) => !el.validity.valid,
    );
    console.log(`TC-04: Email validity invalid = ${isInvalid}`);
    expect(isInvalid).toBeTruthy();
    console.log('TC-04: Completed');
  });

  test('TC-05 | Short password should not proceed', async ({ page }) => {
    console.log('TC-05: Building signup data');
    const signupData = OrganiserSignupPage.buildSignupData();
    const signupPage = new OrganiserSignupPage(page);

    console.log('TC-05: Navigating to signup page');
    await signupPage.gotoSignup();
    console.log('TC-05: Filling first name');
    await signupPage.fillFirstName(signupData.firstName);
    console.log('TC-05: Filling last name');
    await signupPage.fillLastName(signupData.lastName);
    console.log('TC-05: Filling email');
    await signupPage.fillEmail(signupData.email);
    console.log('TC-05: Filling short password');
    await signupPage.fillPassword('abc');
    console.log('TC-05: Filling short confirm password');
    await signupPage.fillConfirmPassword('abc');
    console.log('TC-05: Clicking Next');
    await signupPage.clickNext();

    console.log('TC-05: Asserting user remains on signup page');
    await expect(page).toHaveURL(/signup/i);
    console.log('TC-05: Completed');
  });

  test('TC-06 | Login link should navigate to login page', async ({ page }) => {
    console.log('TC-06: Initializing signup page');
    const signupPage = new OrganiserSignupPage(page);
    console.log('TC-06: Navigating to signup page');
    await signupPage.gotoSignup();
    console.log('TC-06: Clicking Login link');
    await page.getByRole('link', { name: 'Login' }).click();
    console.log('TC-06: Verifying login URL');
    await expect(page).toHaveURL(/login/i);
    console.log('TC-06: Completed');
  });

    test('TC-07 | Sign up should proceed with valid credentials', async ({ page }) => {
    test.setTimeout(ONBOARDING_TIMEOUT);

    console.log('TC-07: Starting full signup with valid credentials');
    const signupPage = new OrganiserSignupPage(page);
    const personalDetailsPage = new PersonalDetailsPage(page);
    const orgStep1Page = new OrgDetailsStep1Page(page);
    const orgStep2Page = new OrgDetailsStep2Page(page);

    const personalData = PersonalDetailsPage.buildPersonalDetailsDataWithPhone();
    const step1Data = OrgDetailsStep1Page.buildOrgStep1Data();
    const step2Data = OrgDetailsStep2Page.buildOrgStep2Data();

    await signupPage.completeSignupToOrganizerRole();

    if (config.organiserPersonalDetailsStep) {
      console.log('TC-07: Completing personal details (mobile + OTP required)');
      await personalDetailsPage.ensureOnPersonalDetailsPage();
      await personalDetailsPage.submitPersonalDetails(personalData);
    } else {
      console.log(`TC-07: Skipping personal details — no such step in ${config.name}`);
    }

    console.log('TC-07: Completing organization step 1');
    await orgStep1Page.waitForPage();
    await orgStep1Page.submitOrgStep1(step1Data);

    console.log('TC-07: Completing organization step 2');
    await orgStep2Page.waitForPage();
    await orgStep2Page.submitOrgStep2(step2Data);

    console.log('TC-07: Waiting to land on dashboard');
    await waitForDashboard(page);
    console.log('TC-07: Completed');
  });

  test('TC-09 | Data builders for onboarding pages should return valid data', async () => {
    console.log('TC-09: Building personal details data');
    const personal = PersonalDetailsPage.buildPersonalDetailsData();
    console.log('TC-09: Building org step 1 data');
    const step1 = OrgDetailsStep1Page.buildOrgStep1Data();
    console.log('TC-09: Building org step 2 data');
    const step2 = OrgDetailsStep2Page.buildOrgStep2Data();

    console.log('TC-09: Validating personal details builders');
    expect(personal.mobileNumber).toBeUndefined();
    const personalWithPhone = PersonalDetailsPage.buildPersonalDetailsDataWithPhone();
    expect(personalWithPhone.mobileNumber).toMatch(/^\d{10}$/);
    console.log('TC-09: Validating phone builder (required for onboarding OTP)');
    expect(step1.ein).toMatch(/^\d{9}$/);
    console.log('TC-09: Validating org step 2 omits optional sport by default');
    expect(step2.sport).toBeUndefined();
    console.log('TC-09: Completed');
  });

  // Serial + one worker: shared Mailinator inbox cannot run in parallel across tests.
  test.describe.serial('Email verification and onboarding', () => {
    test.describe.configure({ timeout: ONBOARDING_TIMEOUT });

    test('TC-08 | Role selection page should be visible', async ({ page }) => {
      console.log('TC-08: Initializing signup page');
      const signupData = OrganiserSignupPage.buildSignupData();
      const signupPage = new OrganiserSignupPage(page);
      const verificationPage = new EmailVerificationPage(page);
      const roleSelectionPage = new RoleSelectionPage(page);
      console.log('TC-08: Navigating to signup page');
      await signupPage.gotoSignup();
      console.log('TC-08: Submitting signup form');
      await signupPage.submitSignup(signupData);
      console.log('TC-08: Waiting for email verification screen');
      await verificationPage.waitForVerificationScreen();
      console.log('TC-08: Verifying email via Mailinator');
      await verificationPage.verifyEmail(signupData.email);
      console.log('TC-08: Waiting for role selection page');
      await roleSelectionPage.waitForPage();
      console.log('TC-08: Completed');
    });

    test.describe.serial('Organizer onboarding — form fill', () => {
    let context: BrowserContext;
    let page: Page;
    let signupData: SignupData;
    let signupPage: OrganiserSignupPage;
    let personalDetailsPage: PersonalDetailsPage;
    let orgStep1Data: ReturnType<typeof OrgDetailsStep1Page.buildOrgStep1Data>;
    let orgStep2Data: ReturnType<typeof OrgDetailsStep2Page.buildOrgStep2Data>;

    test.beforeAll(async ({ browser }) => {
      console.log('[onboarding] beforeAll: Creating browser context for TC-10/11/12');

      context = await browser.newContext();
      page = await context.newPage();
      signupPage = new OrganiserSignupPage(page);

      console.log('[onboarding] beforeAll: Running signup with valid credentials (Organizer only)');
      signupData = await signupPage.completeSignupToOrganizerRole();

      personalDetailsPage = new PersonalDetailsPage(page);
      orgStep1Data = OrgDetailsStep1Page.buildOrgStep1Data();
      orgStep2Data = OrgDetailsStep2Page.buildOrgStep2Data();

      console.log('[onboarding] beforeAll: Shared signup and onboarding data ready');
    });

    test.afterAll(async () => {
      console.log('[onboarding] afterAll: Onboarding suite finished (TC-10, TC-11, TC-12)');
      if (signupData) {
        OrganiserSignupPage.logSignupCredentials(signupData);
      }
      console.log('[onboarding] afterAll: Closing browser context');
      await context?.close();
      console.log('[onboarding] afterAll: Context closed');
    });

    test.beforeEach(async () => {
      console.log('[onboarding] beforeEach: Verifying session is still on onboarding');
      await expect(page).toHaveURL(/onboarding/);
    });

    test('TC-10 | Personal details form should accept data and advance', async () => {
      test.skip(
        !config.organiserPersonalDetailsStep,
        `Organiser onboarding in ${config.name} has no Personal Details step`,
      );

      console.log('TC-10: Initializing personal details page');

      console.log('TC-10: Building personal details data with phone (OTP required)');
      const personalData = PersonalDetailsPage.buildPersonalDetailsDataWithPhone();
      console.log(`TC-10: address=${personalData.address}, state=${personalData.state}`);
      console.log(`TC-10: city=${personalData.city}, zipCode=${personalData.zipCode}`);
      console.log(`TC-10: mobileNumber=${personalData.mobileNumber}`);

      console.log('TC-10: Ensuring on personal details page');
      await personalDetailsPage.waitForPage();
      await personalDetailsPage.ensureOnPersonalDetailsPage();
      console.log('TC-10: Verifying mobile input starts empty');
      await expect(personalDetailsPage.mobileInput).toBeEmpty();
      console.log('TC-10: Submitting personal details (mobile verify + OTP + address)');
      await personalDetailsPage.submitPersonalDetails(personalData);

      console.log('TC-10: Waiting for organization step 1');
      await new OrgDetailsStep1Page(page).waitForPage();
      console.log('TC-10: Completed');
    });

    test('TC-11 | Organization step 1 form should accept data and advance', async () => {
      console.log('TC-11: Initializing organization step 1 page');
      const orgStep1Page = new OrgDetailsStep1Page(page);

      console.log('TC-11: Waiting for step 1 page');
      await orgStep1Page.waitForPage();
      console.log(`TC-11: Filling org step 1 — orgName=${orgStep1Data.orgName}`);
      await orgStep1Page.fillOrgStep1(orgStep1Data);

      console.log('TC-11: Validating organization name');
      await expect(orgStep1Page.orgNameInput).toHaveValue(orgStep1Data.orgName);
      console.log('TC-11: Validating EIN');
      const einDigits = (await orgStep1Page.einInput.inputValue()).replace(/\D/g, '');
      expect(einDigits).toBe(orgStep1Data.ein);
      console.log(`TC-11: EIN validated — ${einDigits}`);

      console.log('TC-11: Clicking Next and waiting for organization step 2');
      await orgStep1Page.clickNext();
      console.log('TC-11: Completed');
    });

    test('TC-12 | Organization step 2 form should complete signup', async () => {
      console.log('TC-12: Initializing organization step 2 page');
      const orgStep2Page = new OrgDetailsStep2Page(page);

      console.log('TC-12: Waiting for step 2 page');
      await orgStep2Page.waitForPage();
      console.log(`TC-12: Filling org step 2 — website=${orgStep2Data.website}`);
      await orgStep2Page.fillOrgStep2(orgStep2Data);

      console.log('TC-12: Validating website');
      await expect(orgStep2Page.websiteInput).toHaveValue(orgStep2Data.website);
      console.log('TC-12: Validating location fields are populated');
      await expect(orgStep2Page.addressInput).not.toBeEmpty();
      await expect(orgStep2Page.stateInput).not.toBeEmpty();
      await expect(orgStep2Page.cityInput).not.toBeEmpty();
      await expect(orgStep2Page.zipCodeInput).toHaveValue(/^\d{5}$/);

      console.log('TC-12: Clicking Sign up');
      await orgStep2Page.clickSignUp();

      console.log('TC-12: Waiting to land on dashboard');
      await waitForDashboard(page);
      console.log('TC-12: Completed');
    });
    });
  });
});