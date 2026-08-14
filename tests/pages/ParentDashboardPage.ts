import { expect, type Locator, type Page } from '@playwright/test';

export class ParentDashboardPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private appOrigin(): string {
    return new URL(this.page.url()).origin;
  }

  private childProfilesSection(): Locator {
    return this.page.locator('main').filter({ hasText: 'Child Profiles' });
  }

  private childCard(displayName: string): Locator {
    return this.page
      .locator('main div.w-full.min-w-0.max-w-full.rounded-lg')
      .filter({ hasText: displayName })
      .first();
  }

  async expectOnDashboard(): Promise<void> {
    await expect(this.page.getByRole('link', { name: 'Dashboard', exact: true }).first()).toBeVisible();
    await expect(this.page).not.toHaveURL(/\/login\/?$/i);
    await expect(this.childProfilesSection()).toBeVisible();
  }

  /**
   * Open the Add Child form. Stage opens a right-side drawer; UAT (drawer not yet
   * shipped) navigates to a full page. Both render "Child Details" inside the form
   * container, so we target whichever container holds that heading.
   */
  async openAddChildProfile(): Promise<void> {
    await this.page.locator('main').getByRole('button', { name: 'Add Child', exact: true }).click();

    const form = this.page
      .locator('[data-slot="drawer-content"], main')
      .filter({ has: this.page.getByRole('heading', { name: 'Child Details', exact: true }) })
      .last();
    await expect(form).toBeVisible();
    await expect(form.getByRole('heading', { name: 'Add Child Profile' })).toBeVisible();
    await expect(form.getByRole('heading', { name: 'Child Details', exact: true })).toBeVisible();
  }

  async expectChildListed(displayName: string, grade: string): Promise<void> {
    const section = this.childProfilesSection();
    const name = section.getByText(displayName, { exact: true });

    await expect.poll(async () => name.isVisible(), { timeout: 30_000, intervals: [500, 1000, 2000] }).toBe(true);
    await expect(name).toBeVisible();

    const childCard = this.childCard(displayName);
    await childCard.scrollIntoViewIfNeeded();
    await expect(childCard).toContainText(new RegExp(`\\|\\s*${grade.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  }

  async expectChildStatus(displayName: string, status: 'Free' | 'Premium'): Promise<void> {
    const card = this.childCard(displayName);
    await expect(card).toBeVisible();
    await expect(card).toContainText(status);
  }

  async clickPurchaseNowForChild(displayName: string): Promise<void> {
    const card = this.childCard(displayName);
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: 'Purchase Now', exact: true }).click();
  }

  async childStatusText(displayName: string): Promise<string> {
    const card = this.childCard(displayName);
    await expect(card).toBeVisible();
    return (await card.innerText()).replace(/\s+/g, ' ').trim();
  }

  async parentCardholderName(): Promise<string> {
    const byParentText = this.page.getByRole('button').filter({ hasText: /Parent/i }).first();
    if (await byParentText.isVisible().catch(() => false)) {
      const raw = (await byParentText.textContent())?.trim() ?? '';
      const beforePipe = raw.split('|')[0]?.trim() ?? '';
      const withoutInitials = beforePipe.replace(/^[A-Z]{2}/, '').trim();
      if (withoutInitials) return withoutInitials;
      if (beforePipe) return beforePipe;
    }

    const dashboardHeader = this.page.locator('main').getByText('Child Profiles').first();
    if (await dashboardHeader.isVisible().catch(() => false)) {
      return 'Parent';
    }

    return 'Parent Cardholder';
  }

  async goToDashboard(): Promise<void> {
    await this.page.goto(`${this.appOrigin()}/`);
    await this.expectOnDashboard();
  }

  async openChildProfile(playerId: number): Promise<void> {
    await this.page.goto(`${this.appOrigin()}/child/${playerId}`);
    await expect(this.page).toHaveURL(new RegExp(`/child/${playerId}$`));
  }
}
