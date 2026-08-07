// spec: specs/parent-add-child.md, specs/sp-membership-purchase.md
// seed: tests/seed.spec.ts

import { expect, test } from '@playwright/test';
import { AddChildProfilePage } from './pages/AddChildProfilePage';
import { LoginPage } from './pages/LoginPage';
import { MembershipPaymentPage } from './pages/MembershipPaymentPage';
import { ParentDashboardPage } from './pages/ParentDashboardPage';
import config from './config.json';

test.describe.configure({ mode: 'serial' });

test.describe('Existing Parent — Add Child Profile', () => {
  let createdChildDisplayName: string;

  test('PAC-01 | Existing parent login and add child profile', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new ParentDashboardPage(page);
    const addChildPage = new AddChildProfilePage(page);
    const child = AddChildProfilePage.buildChildData();

    await loginPage.goto(config.baseUrl);
    await loginPage.login(config.parentUsername, config.parentPassword);
    await expect(page).not.toHaveURL(/\/login\/?$/i);

    await dashboardPage.expectOnDashboard();
    await dashboardPage.openAddChildProfile();

    const completedChild = await addChildPage.fillChildProfile(child);
    const created = await addChildPage.submitChildProfile();
    expect(created.data.legalFirstName).toBe(completedChild.legalFirstName);
    expect(created.data.lastName).toBe(completedChild.legalLastName);
    expect(created.data.gender).toBe(completedChild.gender);
    expect(created.data.schoolName).toBe(completedChild.schoolName);
    expect(created.data.sports).toBe(completedChild.sport);

    const displayName = `${created.data.firstName} ${created.data.lastName}`;
    await dashboardPage.goToDashboard();
    await dashboardPage.expectChildListed(displayName, AddChildProfilePage.gradeLabel(completedChild.grade));

    await dashboardPage.openChildProfile(created.data.id);
    await addChildPage.expectChildProfileDetails(completedChild);

    createdChildDisplayName = displayName;

    console.log(
      `[ParentAddChild] Created child ${displayName} (id: ${created.data.id}, legal: ${completedChild.legalFirstName}, preferred: ${completedChild.preferredName})`,
    );
  });

  test('PAC-02 | Purchase SP membership for child created in PAC-01', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new ParentDashboardPage(page);
    const paymentPage = new MembershipPaymentPage(page);

    expect(createdChildDisplayName, 'PAC-01 must create a child before membership purchase').toBeTruthy();

    await loginPage.goto(config.baseUrl);
    await loginPage.login(config.parentUsername, config.parentPassword);
    await dashboardPage.expectOnDashboard();
    await dashboardPage.expectChildStatus(createdChildDisplayName, 'Free');

    const cardholderName = await dashboardPage.parentCardholderName();
    await dashboardPage.clickPurchaseNowForChild(createdChildDisplayName);
    await paymentPage.expectPaymentDialogOpen();

    await paymentPage.fillPaymentForm({
      cardholderName,
      cardNumber: '4242 4242 4242 4242',
      expiry: '12 / 30',
      cvc: '123',
      zipCode: '12345',
    });
    await paymentPage.submitPayment();

    await paymentPage.expectPaymentSuccess();

    await expect
      .poll(
        async () => {
          await dashboardPage.goToDashboard();
          return dashboardPage.childStatusText(createdChildDisplayName);
        },
        { timeout: 90_000, intervals: [2_000, 5_000] },
      )
      .toMatch(/Premium/i);

    const statusText = await dashboardPage.childStatusText(createdChildDisplayName);
    expect(statusText).toContain('Premium');
    expect(statusText).not.toContain('Purchase Now');
  });
});
