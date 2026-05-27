import { test, expect } from '@playwright/test';
import { OrganiserSignupPage } from './pages/OrganiserSignupPage';
import { EmailVerificationPage } from './pages/EmailVerificationPage';

test('Organiser signup should land on email verification screen', async ({ page }) => {
  const signupData = OrganiserSignupPage.buildSignupData();

  const signupPage = new OrganiserSignupPage(page);
  const emailVerificationPage = new EmailVerificationPage(page);

  await signupPage.gotoSignup();
  await signupPage.submitSignup(signupData);

  await emailVerificationPage.waitForVerificationScreen();
  await expect(emailVerificationPage.successToast).toBeVisible();
  await emailVerificationPage.expectEmailVisible(signupData.email);
  await expect(emailVerificationPage.resendButton).toBeVisible();

  await emailVerificationPage.clickResend();
  await expect(emailVerificationPage.resendButton).toBeVisible();
});
