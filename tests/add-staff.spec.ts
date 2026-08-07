import { test, expect } from '@playwright/test';
import { StaffDetailsPage } from './pages/StaffDetailsPage';
import { LoginPage } from './pages/LoginPage';
import config from './config.json';

test.describe.configure({ mode: 'serial' });

test('AS-01 | Add staff to the organisation with valid details', async ({ page }) => {
  // Login first
  const loginPage = new LoginPage(page);
  await loginPage.goto(config.baseUrl);
  console.log('Navigated to login page');
  
  await loginPage.login(config.username, config.password);
  console.log('Logged in successfully');
  
  // Proceed with add staff flow
  const staffDetailsPage = new StaffDetailsPage(page);
  
  // Navigate to settings and click on staff details button
  await staffDetailsPage.navigateToStaffDetailsViaSettings();
  console.log('Navigated to settings and clicked on staff details button');
  
  // Verify we're on the correct page
  await expect(page).toHaveURL(/staff-details/i);
  console.log('Verified URL contains staff-details');
  
  // Click on "Add staff member" button
  await staffDetailsPage.clickAddStaffMember();
  console.log('Clicked on "Add staff member" button');
  
  const addStaffForm = page.getByRole('dialog', { name: /Add Staff Member/i });
  await expect(addStaffForm).toBeVisible();
  console.log('Add staff member form is visible');

  const staffData = await staffDetailsPage.fillStaffDetails();
  console.log(`Filled staff details - Name: ${staffData.firstName} ${staffData.lastName}, Email: ${staffData.email}, Role: ${staffData.role}, Phone: ${staffData.phoneNumber}`);

  const firstNameInput = addStaffForm.getByRole('textbox', { name: /First name/i });
  const lastNameInput = addStaffForm.getByRole('textbox', { name: /Last name/i });
  const emailInput = addStaffForm.getByRole('textbox', { name: /Email id/i });
  const phoneInput = addStaffForm.getByRole('textbox', { name: /Contact number/i });
  
  await expect(firstNameInput).toHaveValue(staffData.firstName);
  console.log('Validated first name field');
  
  await expect(lastNameInput).toHaveValue(staffData.lastName);
  console.log('Validated last name field');
  
  await expect(emailInput).toHaveValue(staffData.email);
  console.log('Validated email field');
  
  // For phone fields, sometimes extra formatting is applied, so relax the check to 'toContain' instead of 'toHaveValue'
  const phoneValue = await phoneInput.inputValue();
  expect(phoneValue.replace(/\D/g, '')).toContain(staffData.phoneNumber);
  console.log('Validated phone number field');
  
  // Validate email format
  expect(staffData.email).toMatch(/^[a-z]+[0-9]*@yopmail\.com$/i);
  console.log('Validated email format (firstname@yopmail.com)');
  
  // Validate phone number format (10 digits)
  expect(staffData.phoneNumber).toMatch(/^\d{10}$/);
  console.log('Validated phone number format (10 digits)');
  
  // Validate role is one of the expected values Coach
  expect(staffData.role).toBe('Coach');
  console.log('Validated role: Coach');
  
  await staffDetailsPage.clickAddStaffMemberButton();
  console.log('Clicked "Add staff member" button to submit form');

  await expect(addStaffForm).toBeHidden();
  await staffDetailsPage.expectStaffInList(staffData);
  console.log('Staff member found in the list');

  console.log('Test completed successfully');
});

test('AS-02 | Add staff member with Admin role', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto(config.baseUrl);
  await loginPage.login(config.username, config.password);

  const staffDetailsPage = new StaffDetailsPage(page);
  await staffDetailsPage.navigateToStaffDetailsViaSettings();
  await expect(page).toHaveURL(/staff-details/i);

  await staffDetailsPage.clickAddStaffMember();

  const addStaffForm = page.getByRole('dialog', { name: /Add Staff Member/i });
  await expect(addStaffForm).toBeVisible();

  const staffData = await staffDetailsPage.fillStaffDetails('Admin');
  expect(staffData.role).toBe('Admin');

  await staffDetailsPage.clickAddStaffMemberButton();
  await expect(addStaffForm).toBeHidden();
  await staffDetailsPage.expectStaffInList(staffData);
});

test('AS-03 | Added staff member should be shown in the staff list', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto(config.baseUrl);
  await loginPage.login(config.username, config.password);

  const staffDetailsPage = new StaffDetailsPage(page);
  await staffDetailsPage.navigateToStaffDetailsViaSettings();
  await expect(page).toHaveURL(/staff-details/i);

  await staffDetailsPage.clickAddStaffMember();
  await expect(page.getByRole('dialog', { name: /Add Staff Member/i })).toBeVisible();

  const staffData = await staffDetailsPage.addStaffMember('Coach');
  await staffDetailsPage.expectStaffInList(staffData);
});

