import { Page, expect } from '@playwright/test';

// ── Role values as seen in the DOM ────────────────────────────────────────────
// <input type="radio" value="ORGANIZATION_ADMIN" name="role">  → I'm Organizer
// <input type="radio" value="PARENT"              name="role">  → I'm Parent / Player
// <input type="radio" value="STAFF"               name="role">  → I'm Staff Member
// ─────────────────────────────────────────────────────────────────────────────

export type RoleType = 'ORGANIZATION_ADMIN' | 'PARENT' | 'STAFF';

const ROLE_HEADINGS: Record<RoleType, string> = {
  ORGANIZATION_ADMIN: "I'm Organizer",
  PARENT: "I'm Parent / Player",
  STAFF: "I'm Staff Member",
};

export class RoleSelectionPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async waitForPage() {
    await this.page
      .getByRole('heading', { name: /Choose how you.d like to use FutureOne Sports/i })
      .waitFor({ state: 'visible' });
  }

  private roleRadio(role: RoleType) {
    return this.page.locator(`input[name="role"][value="${role}"]`);
  }

  // Click the visible card heading (radio inputs are sr-only)
  async selectRole(role: RoleType) {
    await this.page.getByRole('heading', { name: ROLE_HEADINGS[role] }).click();
    await expect(this.roleRadio(role)).toBeChecked();
  }

  // Convenience helpers matching card labels shown in the UI
  async selectOrganizer() {
    await this.selectRole('ORGANIZATION_ADMIN');
  }

  async selectParentOrPlayer() {
    await this.selectRole('PARENT');
  }

  async selectStaffMember() {
    await this.selectRole('STAFF');
  }

  async clickContinue() {
    await this.page.getByRole('button', { name: 'Continue' }).click();
  }

  /** Signup flow — Organizer only; verifies no other role is selected. */
  async chooseOrganizerOnly() {
    await this.selectOrganizer();
    await expect(this.roleRadio('PARENT')).not.toBeChecked();
    await expect(this.roleRadio('STAFF')).not.toBeChecked();
    await this.clickContinue();
  }

  /** Signup flow — Parent / Player only; verifies no other role is selected. */
  async chooseParentOnly() {
    await this.selectParentOrPlayer();
    await expect(this.roleRadio('ORGANIZATION_ADMIN')).not.toBeChecked();
    await expect(this.roleRadio('STAFF')).not.toBeChecked();
    await this.clickContinue();
  }

  async chooseRole(role: RoleType = 'ORGANIZATION_ADMIN') {
    if (role !== 'ORGANIZATION_ADMIN') {
      throw new Error('Organiser signup supports Organizer role only');
    }
    await this.chooseOrganizerOnly();
  }
}
