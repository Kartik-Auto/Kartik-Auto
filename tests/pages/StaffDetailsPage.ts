import { expect, Locator, Page } from '@playwright/test';

export type StaffRole = 'Coach' | 'Admin';

export type StaffMemberData = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: StaffRole;
};

export class StaffDetailsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private addStaffForm(): Locator {
    return this.page.getByRole('dialog', { name: /Add Staff Member/i });
  }


  async navigateToStaffDetailsViaSettings() {
    // Navigate to settings and click on staff details
    await this.page.getByRole('link', { name: 'Staff Details' }).click();
  }

  async clickAddStaffMember() {
    await this.page.getByRole('button', { name: 'Add Staff Member' }).click();
  }

  async fillStaffDetails(role: StaffRole = 'Coach'): Promise<StaffMemberData> {
    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

    const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'James', 'Emma', 'Robert', 'Olivia', 'William', 'Sophia', 'Richard', 'Isabella', 'Joseph', 'Ava', 'Thomas', 'Mia', 'Charles', 'Charlotte'];
    const randomFirstName = pick(firstNames);

    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee'];
    const randomLastName = pick(lastNames);

    const randomEmail = `${randomFirstName.toLowerCase()}${Math.floor(Math.random() * 1000)}@yopmail.com`;
    // Valid US NANP: area code and exchange cannot start with 0 or 1
    const areaCode = String(Math.floor(Math.random() * 800) + 200);
    const exchange = String(Math.floor(Math.random() * 800) + 200);
    const lineNumber = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const randomPhoneNumber = `${areaCode}${exchange}${lineNumber}`;

    const form = this.addStaffForm();
    await form.waitFor({ state: 'visible' });

    await form.getByRole('textbox', { name: /First name/i }).fill(randomFirstName);
    await form.getByRole('textbox', { name: /Last name/i }).fill(randomLastName);
    await form.getByRole('combobox').click();
    await this.page.getByRole('option', { name: role }).click();
    await form.getByRole('textbox', { name: /Email id/i }).fill(randomEmail);
    await form.getByRole('textbox', { name: /Contact number/i }).fill(randomPhoneNumber);
    
    return {
      firstName: randomFirstName,
      lastName: randomLastName,
      email: randomEmail,
      phoneNumber: randomPhoneNumber,
      role,
    };
  }

  async clickAddStaffMemberButton() {
    await this.addStaffForm().getByRole('button', { name: /add staff member/i }).click();
  }

  async addStaffMember(role: StaffRole = 'Coach'): Promise<StaffMemberData> {
    const data = await this.fillStaffDetails(role);
    await this.clickAddStaffMemberButton();
    await this.addStaffForm().waitFor({ state: 'hidden' });
    return data;
  }

  staffListRow(data: Pick<StaffMemberData, 'email'>) {
    return this.page.getByRole('row').filter({
      has: this.page.getByRole('cell', { name: data.email }),
    });
  }

  async expectStaffInList(data: StaffMemberData) {
    const fullName = `${data.firstName} ${data.lastName}`;
    const row = this.staffListRow(data);

    await expect(row).toBeVisible();
    await expect(row.getByRole('cell', { name: fullName })).toBeVisible();
    await expect(row.getByRole('cell', { name: data.email })).toBeVisible();
    await expect(row.getByRole('cell', { name: data.role })).toBeVisible();
  }
}

