import { expect, type Locator, type Page } from '@playwright/test';
import { faker } from '@faker-js/faker';

export type PlayerInviteData = {
  guardianEmail: string;
  firstName: string;
  lastName: string;
  contactNumber: string;
  jerseyNumber: string;
  position: string;
};

export class InvitePlayerPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  static buildPlayerInviteData(overrides: Partial<PlayerInviteData> = {}): PlayerInviteData {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const emailLocal = firstName.replace(/[^a-zA-Z]/g, '').toLowerCase() || 'parent';
    return {
      guardianEmail: `${emailLocal}${faker.number.int({ min: 10, max: 99 })}@yopmail.com`,
      firstName,
      lastName,
      contactNumber: InvitePlayerPage.buildUsPhoneDigits(),
      jerseyNumber: faker.number.int({ min: 0, max: 999 }).toString(),
      position: '',
      ...overrides,
    };
  }

  /**
   * The form validates US formatting: area code and exchange must start with
   * 2-9 and must not be an N11 service code.
   */
  static buildUsPhoneDigits(): string {
    const block = () => {
      let digits = '';
      do {
        digits = `${faker.number.int({ min: 2, max: 9 })}${faker.string.numeric(2)}`;
      } while (digits.endsWith('11'));
      return digits;
    };

    return `${block()}${block()}${faker.string.numeric(4)}`;
  }

  static formatUsPhone(digits: string): string {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  guardianEmailInput(): Locator {
    return this.page.getByRole('textbox', { name: /Enter guardian email ID/i });
  }

  inviteLinkedToGuardianButton(): Locator {
    return this.page.getByRole('button', {
      name: /Invite new player linked to this guardian/i,
    });
  }

  playerForm(): Locator {
    return this.page.getByRole('dialog').filter({
      has: this.page.getByRole('button', { name: 'Invite Player', exact: true }),
    });
  }

  playerRow(data: Pick<PlayerInviteData, 'firstName' | 'lastName'>): Locator {
    const fullName = `${data.firstName} ${data.lastName}`;
    return this.page.getByRole('row').filter({ hasText: fullName });
  }

  /**
   * Empty team shows Invite New Player immediately; a roster with players
   * needs Edit Roster first (then Invite New Player beside Select Existing Roster).
   */
  async openInviteNewPlayer(): Promise<void> {
    const inviteButton = this.page.getByRole('button', { name: 'Invite New Player', exact: true });
    const editRoster = this.page.getByRole('button', { name: 'Edit Roster', exact: true });

    await expect(inviteButton.or(editRoster)).toBeVisible();

    if (!(await inviteButton.isVisible().catch(() => false))) {
      await editRoster.click();
      await expect(inviteButton).toBeVisible();
    }

    await inviteButton.click();
    await expect(this.page.getByRole('heading', { name: 'Invite New Player', exact: true })).toBeVisible();
    await expect(this.guardianEmailInput()).toBeVisible();
  }

  async enterGuardianEmail(email: string): Promise<void> {
    const input = this.guardianEmailInput();
    await input.click();
    await input.fill(email);
    await expect(input).toHaveValue(email);
    // Product lookup debounce — only hard wait allowed for this flow.
    await this.page.waitForTimeout(1000);
  }

  async expectGuardianDoesNotExist(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: /No Matches Found/i })).toBeVisible();
    await expect(this.inviteLinkedToGuardianButton()).toBeVisible();
  }

  async openLinkedPlayerForm(): Promise<void> {
    await this.inviteLinkedToGuardianButton().click();
    await expect(this.playerForm()).toBeVisible();
    await expect(this.playerForm().getByRole('textbox', { name: /First name/i })).toBeVisible();
  }

  async fillAndSubmitPlayerForm(data: PlayerInviteData): Promise<PlayerInviteData> {
    const form = this.playerForm();
    await form.getByRole('textbox', { name: /First name/i }).fill(data.firstName);
    await form.getByRole('textbox', { name: /Last name/i }).fill(data.lastName);

    const emailInput = form.getByRole('textbox', { name: /Guardian email|Email/i });
    await expect(emailInput).toHaveValue(data.guardianEmail);

    await form.getByRole('textbox', { name: /^Number$/i }).fill(data.contactNumber);
    await expect(
      form.getByText(/Invalid phone number format/i),
      `Contact number ${data.contactNumber} was rejected by the form`,
    ).toHaveCount(0);
    await form.getByRole('textbox', { name: /Jersey/i }).fill(data.jerseyNumber);

    const positionCombo = form.getByRole('combobox').filter({ hasText: /Select position/i });
    await expect(positionCombo).toBeVisible();
    await positionCombo.click();
    const option = this.page.getByRole('option').first();
    await expect(option).toBeVisible();
    const position = ((await option.innerText()) || '').trim();
    expect(position.length).toBeGreaterThan(0);
    await option.click();
    data.position = position;

    await form.getByRole('button', { name: 'Invite Player', exact: true }).click();
    await expect(form).toBeHidden();
    return data;
  }

  async expectInvitationSucceeded(data: PlayerInviteData): Promise<void> {
    const errorToast = this.page.getByText(/failed|unable to invite|already exists/i);
    await expect(errorToast).toHaveCount(0);

    const success = this.page.getByText(/invited|added to (the )?roster|player invited/i);
    if (await success.first().isVisible().catch(() => false)) {
      await expect(success.first()).toBeVisible();
    }
  }

  async expectPlayerOnRosterOnce(data: PlayerInviteData): Promise<void> {
    const row = this.playerRow(data);
    await expect(row).toHaveCount(1);
    await expect(row).toBeVisible();
    await expect(row).toContainText(`${data.firstName} ${data.lastName}`);
    await expect(row).toContainText(data.guardianEmail);
    await expect(row).toContainText(InvitePlayerPage.formatUsPhone(data.contactNumber));
    await expect(row).toContainText(data.jerseyNumber);
    await expect(row).toContainText(data.position);
    await expect(row.getByText('Invited', { exact: true })).toBeVisible();
  }
}
