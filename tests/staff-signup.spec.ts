import { expect, test } from '@playwright/test';
import { FindOrganisationPage } from './pages/FindOrganisationPage';
import { LoginPage } from './pages/LoginPage';
import { StaffDetailsPage } from './pages/StaffDetailsPage';
import { StaffSignupPage } from './pages/StaffSignupPage';
import { config } from './helpers/env';

const STAFF_SIGNUP_TIMEOUT = 180_000;

test.describe('Staff signup — form validation', () => {
  test('SS-02 | Empty form click Next should not proceed', async ({ page }) => {
    console.log('SS-02: Initializing signup page');
    const signupPage = new StaffSignupPage(page);
    console.log('SS-02: Navigating to signup page');
    await signupPage.gotoSignup();
    console.log('SS-02: Clicking Next with empty form');
    await signupPage.clickNext();
    console.log('SS-02: Asserting user stays on signup page');
    await expect(page).toHaveURL(/signup/i);
    console.log('SS-02: Completed');
  });

  test('SS-03 | Mismatched passwords should show validation', async ({ page }) => {
    console.log('SS-03: Building signup data');
    const signupData = StaffSignupPage.buildSignupData();
    const signupPage = new StaffSignupPage(page);

    console.log('SS-03: Navigating to signup page');
    await signupPage.gotoSignup();
    console.log('SS-03: Filling first name');
    await signupPage.fillFirstName(signupData.firstName);
    console.log('SS-03: Filling last name');
    await signupPage.fillLastName(signupData.lastName);
    console.log('SS-03: Filling email');
    await signupPage.fillEmail(signupData.email);
    console.log('SS-03: Filling password');
    await signupPage.fillPassword(signupData.password);
    console.log('SS-03: Filling mismatched confirm password');
    await signupPage.fillConfirmPassword('WrongPassword@123');
    console.log('SS-03: Clicking Next');
    await signupPage.clickNext();

    console.log('SS-03: Verifying mismatch validation message');
    await expect(page.getByText(/password.*match|match.*password/i)).toBeVisible();
    console.log('SS-03: Completed');
  });

  test('SS-04 | Invalid email format should fail HTML validation', async ({ page }) => {
    console.log('SS-04: Building signup data');
    const signupData = StaffSignupPage.buildSignupData();
    const signupPage = new StaffSignupPage(page);

    console.log('SS-04: Navigating to signup page');
    await signupPage.gotoSignup();
    console.log('SS-04: Filling first name');
    await signupPage.fillFirstName(signupData.firstName);
    console.log('SS-04: Filling last name');
    await signupPage.fillLastName(signupData.lastName);
    console.log('SS-04: Filling invalid email');
    await signupPage.fillEmail('not-an-email');
    console.log('SS-04: Filling password');
    await signupPage.fillPassword(signupData.password);
    console.log('SS-04: Filling confirm password');
    await signupPage.fillConfirmPassword(signupData.password);
    console.log('SS-04: Clicking Next');
    await signupPage.clickNext();

    console.log('SS-04: Checking HTML email validity state');
    const isInvalid = await page.locator('input[name="email"]').evaluate(
      (el: HTMLInputElement) => !el.validity.valid,
    );
    console.log(`SS-04: Email validity invalid = ${isInvalid}`);
    expect(isInvalid).toBeTruthy();
    console.log('SS-04: Completed');
  });

  test('SS-05 | Short password should not proceed', async ({ page }) => {
    console.log('SS-05: Building signup data');
    const signupData = StaffSignupPage.buildSignupData();
    const signupPage = new StaffSignupPage(page);

    console.log('SS-05: Navigating to signup page');
    await signupPage.gotoSignup();
    console.log('SS-05: Filling first name');
    await signupPage.fillFirstName(signupData.firstName);
    console.log('SS-05: Filling last name');
    await signupPage.fillLastName(signupData.lastName);
    console.log('SS-05: Filling email');
    await signupPage.fillEmail(signupData.email);
    console.log('SS-05: Filling short password');
    await signupPage.fillPassword('abc');
    console.log('SS-05: Filling short confirm password');
    await signupPage.fillConfirmPassword('abc');
    console.log('SS-05: Clicking Next');
    await signupPage.clickNext();

    console.log('SS-05: Asserting user remains on signup page');
    await expect(page).toHaveURL(/signup/i);
    console.log('SS-05: Completed');
  });
});

test.describe('Staff signup — join existing organisation', () => {
  test.describe.configure({ mode: 'serial', timeout: STAFF_SIGNUP_TIMEOUT });

  test('SS-01 | Staff requests to join org and admin accepts', async ({ page, browser }) => {
    test.skip(
      !config.staffApproverUsername || !config.staffJoinOrgId,
      'Set staffApproverUsername, staffApproverPassword, and staffJoinOrgId in the env config',
    );

    const staffSignup = new StaffSignupPage(page);
    const findOrg = new FindOrganisationPage(page);

    const signupData = await staffSignup.completeSignupToStaffRole();
    await staffSignup.submitPersonalDetailsToFindOrg();

    const organisationName = await findOrg.requestToJoinOrganisation(config.staffJoinOrgId);
    console.log(
      `[StaffSignup] Requested to join ${config.staffJoinOrgId} (${organisationName}) as Admin ` +
        `(${signupData.firstName} ${signupData.lastName} <${signupData.email}>)`,
    );

    // Separate context so admin login does not replace the staff onboarding session.
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    try {
      const loginPage = new LoginPage(adminPage);
      const staffDetails = new StaffDetailsPage(adminPage);

      await loginPage.goto(config.baseUrl);
      await loginPage.login(config.staffApproverUsername, config.staffApproverPassword);
      await expect(adminPage).not.toHaveURL(/\/login\/?$/i);

      const adminOrgName = config.staffJoinOrgName || organisationName;
      await staffDetails.selectOrganisationFromProfile(adminOrgName);
      console.log(`[StaffSignup] Selected organisation "${adminOrgName}" from profile`);

      await staffDetails.navigateToStaffDetailsViaSettings();
      await expect(adminPage).toHaveURL(/staff-details/i);

      await staffDetails.expectJoinRequest(signupData);
      await staffDetails.acceptJoinRequest(signupData.email);
      console.log(`[StaffSignup] Accepted join request for ${signupData.email}`);

      await staffDetails.expectApprovedStaffInList({
        firstName: signupData.firstName,
        lastName: signupData.lastName,
        email: signupData.email,
        role: 'Admin',
      });
      console.log(`[StaffSignup] Approved staff is on the Staff Members list`);
    } finally {
      await adminContext.close();
    }

    const staffLogin = new LoginPage(page);
    await staffLogin.goto(config.baseUrl);
    await staffLogin.login(signupData.email, signupData.password);
    await expect(page).not.toHaveURL(/\/login\/?$/i);
    await findOrg.openApprovedOrganisation(organisationName);
    console.log(`[StaffSignup] Staff ${signupData.email} opened organisation "${organisationName}"`);
  });
});
