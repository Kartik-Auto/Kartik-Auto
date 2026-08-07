// spec: specs/parent-signup.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';
import { ParentSignupPage, PARENT_SIGNUP_PASSWORD } from './pages/ParentSignupPage';
import { PersonalDetailsPage } from './pages/PersonalDetailsPage';
import { EmailVerificationPage } from './pages/EmailVerificationPage';

const PARENT_SIGNUP_TIMEOUT = 180_000;

// Mailinator inbox must not be polled in parallel across signup tests.
test.describe.configure({ mode: 'serial' });

test.describe('Parent signup — FutureOne Sports', () => {
  test.describe.configure({ timeout: PARENT_SIGNUP_TIMEOUT });

  test('PS-01 | Signup form submit should land on Email Verification screen', async ({ page }) => {
    const signupData = ParentSignupPage.buildSignupData();
    const parentSignup = new ParentSignupPage(page);
    const verificationPage = new EmailVerificationPage(page);

    await parentSignup.gotoSignup();
    await parentSignup.submitSignup(signupData);

    await verificationPage.waitForVerificationScreen();
    await expect(verificationPage.successToast).toBeVisible();
    await expect(verificationPage.verificationHeading).toBeVisible();
    await expect(verificationPage.resendButton).toBeVisible();
    await expect(page.getByText(signupData.email, { exact: true })).toBeVisible();
    await expect(page).not.toHaveURL(/onboarding/);
  });

  test('PS-02 | Empty form click Next should not proceed', async ({ page }) => {
    const parentSignup = new ParentSignupPage(page);

    await parentSignup.gotoSignup();
    await parentSignup.clickNext();

    await expect(page).toHaveURL(/signup/i);
    await expect(page.getByRole('heading', { name: 'Email Verification Sent' })).not.toBeVisible();
  });

  test('PS-03 | Invalid email format should fail HTML validation', async ({ page }) => {
    const signupData = ParentSignupPage.buildSignupData();
    const parentSignup = new ParentSignupPage(page);

    await parentSignup.gotoSignup();
    await parentSignup.fillFirstName(signupData.firstName);
    await parentSignup.fillLastName(signupData.lastName);
    await parentSignup.fillEmail('not-an-email');
    await parentSignup.fillPassword(PARENT_SIGNUP_PASSWORD);
    await parentSignup.fillConfirmPassword(PARENT_SIGNUP_PASSWORD);
    await parentSignup.clickNext();

    const isInvalid = await page.locator('input[name="email"]').evaluate(
      (el: HTMLInputElement) => !el.validity.valid,
    );
    expect(isInvalid).toBeTruthy();
    await expect(page.getByRole('heading', { name: 'Email Verification Sent' })).not.toBeVisible();
  });

  test('PS-04 | Parent signup should reach personal details after role selection', async ({
    page,
  }) => {
    const parentSignup = new ParentSignupPage(page);
    const personalDetailsPage = new PersonalDetailsPage(page);

    await parentSignup.completeSignupToParentRole();

    await personalDetailsPage.waitForPage();
    await expect(page).toHaveURL(/onboarding/);
    await expect(page.getByRole('heading', { name: 'Personal Details' })).toBeVisible();
  });

  test('PS-05 | Parent signup should complete and show Add Child Profile popup', async ({
    page,
  }) => {
    const parentSignup = new ParentSignupPage(page);
    const signupData = await parentSignup.completeSignupToAddChildPopup();

    await parentSignup.expectAddChildProfilePopup();
    await expect(page).not.toHaveURL(/onboarding/);
    ParentSignupPage.logSignupCredentials(signupData);
  });
});
