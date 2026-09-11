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
    const link = this.page.getByRole('link', { name: 'Staff Details' });

    // The Settings submenu is open by default; clicking it toggles, so only
    // expand when the link is still missing after the sidebar has rendered.
    const linkShown = await link
      .waitFor({ state: 'visible', timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    if (!linkShown) {
      await this.page.getByRole('button', { name: 'Settings' }).click();
      await link.waitFor({ state: 'visible' });
    }

    await link.click();
  }

  /**
   * sportspass001 (and similar) belong to multiple orgs. Open the header
   * profile, View all accounts, and switch to the org that received the join request.
   */
  async selectOrganisationFromProfile(organisationName: string): Promise<void> {
    const profile = this.page.getByRole('banner').getByRole('button', { name: /\|/ });
    await expect(profile).toBeVisible();
    await profile.click();

    const menu = this.page.getByRole('menu');
    await expect(menu).toBeVisible();

    const viewAll = menu.getByText(/View all accounts/i);
    if (await viewAll.isVisible().catch(() => false)) {
      await viewAll.click();
      await expect(this.page.getByRole('heading', { name: /My Accounts/i })).toBeVisible();
      await expect(this.page.getByText(/Role:\s*Admin/i).first()).toBeVisible();
      const orgName = this.page.getByText(organisationName, { exact: true });
      await expect(orgName.first(), `Expected org "${organisationName}" on My Accounts`).toBeVisible();
      await orgName.first().click();
    } else {
      await menu.getByText(organisationName, { exact: true }).click();
    }

    await expect(this.page.getByRole('heading', { name: /My Accounts/i })).toHaveCount(0);
    await expect(this.page.getByRole('link', { name: 'Staff Details' })).toBeVisible();
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
      has: this.page.getByText(data.email, { exact: true }),
    });
  }

  async expectStaffInList(data: Pick<StaffMemberData, 'firstName' | 'lastName' | 'email'> & Partial<Pick<StaffMemberData, 'role' | 'phoneNumber'>>) {
    const fullName = `${data.firstName} ${data.lastName}`;
    const row = this.staffListRow(data);

    await expect(row).toBeVisible();
    await expect(row).toContainText(fullName);
    await expect(row).toContainText(data.email);
    if (data.role) {
      await expect(row).toContainText(data.role);
    }
  }

  staffMembersTab(): Locator {
    return this.page.getByRole('tab', { name: /Staff Member/i });
  }

  staffRequestRow(email: string): Locator {
    return this.page.getByRole('row').filter({
      has: this.page.getByText(email, { exact: true }),
    });
  }

  /** Tabs render after the table loads, so wait for the tab before selecting it. */
  private async openTab(tab: Locator): Promise<void> {
    await expect(tab).toBeVisible();
    if ((await tab.getAttribute('aria-selected')) === 'true') return;
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
  }

  private searchInput(): Locator {
    return this.page.getByPlaceholder(/Search by SP ID, name or email/i);
  }

  /** Both tables paginate at 25 rows, so search instead of scanning the page. */
  private async searchStaff(term: string): Promise<void> {
    const input = this.searchInput();
    await expect(input).toBeVisible();
    await input.fill('');
    await input.fill(term);
  }

  async openStaffMembers(): Promise<void> {
    await this.openTab(this.staffMembersTab());
  }

  async expectApprovedStaffInList(data: {
    firstName: string;
    lastName: string;
    email: string;
    role?: StaffRole;
  }): Promise<void> {
    await this.openStaffMembers();
    await this.searchStaff(data.email);
    await this.expectStaffInList({ ...data, role: data.role ?? 'Admin' });
  }

  staffRequestTab(): Locator {
    return this.page.getByRole('tab', { name: /Request/i });
  }

  async openStaffRequests(): Promise<void> {
    await this.openTab(this.staffRequestTab());
  }

  async expectJoinRequest(data: { firstName: string; lastName: string; email: string }): Promise<void> {
    await this.openStaffRequests();
    await this.searchStaff(data.email);
    const row = this.staffRequestRow(data.email);
    await expect(row, `Expected a staff request row for ${data.email}`).toBeVisible();
    await expect(row).toContainText(data.firstName);
    await expect(row).toContainText(data.lastName);
    await expect(row).toContainText(data.email);
  }

  async acceptJoinRequest(email: string): Promise<void> {
    const row = this.staffRequestRow(email);
    await expect(row).toBeVisible();
    const action = row.getByRole('button', { name: /Accept|Approve/i });
    await expect(action).toBeVisible();
    await action.click();
    await expect(this.page.getByText(/accepted|approved/i).first()).toBeVisible({ timeout: 15_000 }).catch(async () => {
      await expect(row.getByRole('button', { name: /Accept|Approve/i })).toHaveCount(0);
    });
  }
}

