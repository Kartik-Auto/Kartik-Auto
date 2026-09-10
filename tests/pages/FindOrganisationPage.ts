import { expect, type Locator, type Page } from '@playwright/test';

export class FindOrganisationPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  heading(): Locator {
    return this.page.getByRole('heading', {
      name: /Find Existing Organi[sz]ation/i,
    });
  }

  orgIdInput(): Locator {
    return this.page.getByPlaceholder(/Enter organization id/i);
  }

  requestToJoinButton(): Locator {
    return this.page.getByRole('button', {
      name: /Send Request to join Organi[sz]ation/i,
    });
  }

  async waitForPage(): Promise<void> {
    await expect(this.heading()).toBeVisible();
    await expect(this.orgIdInput()).toBeVisible();
  }

  async enterOrgId(orgId: string): Promise<void> {
    const input = this.orgIdInput();
    const digits = orgId.replace(/^ORG-?/i, '');
    await input.fill(digits);
    await expect(this.page.getByRole('heading', { level: 3 }).first()).toBeVisible();
  }

  async chooseAdminRole(): Promise<void> {
    const combo = this.page.getByRole('combobox').first();
    await expect(combo).toBeVisible();
    if (!(await combo.innerText()).match(/Admin/i)) {
      await combo.click();
      await this.page.getByRole('option', { name: /^Admin$/i }).click();
    }
    await expect(combo).toContainText(/Admin/i);
  }

  async requestToJoin(): Promise<void> {
    const button = this.requestToJoinButton();
    await expect(button).toBeEnabled();
    await button.click();
  }

  async getMatchedOrganisationName(): Promise<string> {
    const heading = this.page.getByRole('heading', { level: 3 }).first();
    await expect(heading).toBeVisible();
    const name = ((await heading.innerText()) || '').trim();
    expect(name.length, 'Expected organisation name after org ID lookup').toBeGreaterThan(0);
    return name;
  }

  async requestToJoinOrganisation(orgId: string): Promise<string> {
    await this.waitForPage();
    await this.enterOrgId(orgId);
    const organisationName = await this.getMatchedOrganisationName();
    await this.chooseAdminRole();
    await this.requestToJoin();
    const success = this.page.getByRole('dialog', { name: /Request Sent successfully/i });
    await expect(success).toBeVisible();
    await expect(success.getByText(/as a\s+Admin/i)).toBeVisible();
    return organisationName;
  }

  /**
   * After approval, staff login either lands on a picker (click the joined org)
   * or already inside that org's dashboard.
   */
  async openApprovedOrganisation(organisationName: string): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/login\/?$/i);

    const orgHeading = this.page.getByRole('heading', { name: organisationName });
    const orgButton = this.page.getByRole('button', { name: organisationName });
    const orgLink = this.page.getByRole('link', { name: organisationName });
    const pickerCopy = this.page.getByText(
      /select (an )?organi[sz]ation|choose (an )?organi[sz]ation|your organi[sz]ations/i,
    );

    const picker = orgHeading.or(orgButton).or(orgLink).or(pickerCopy);
    if (await picker.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await orgHeading.or(orgButton).or(orgLink).or(
        this.page.getByText(organisationName, { exact: true }),
      ).first().click();
    }

    await expect(
      this.page.getByRole('link', { name: 'Dashboard' }).or(
        this.page.getByRole('button', { name: 'Dashboard' }),
      ).first(),
    ).toBeVisible();
  }
}
