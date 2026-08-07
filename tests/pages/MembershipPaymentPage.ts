import { expect, type Locator, type Page } from '@playwright/test';

export type MembershipPaymentData = {
  cardholderName: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
  zipCode: string;
};

export class MembershipPaymentPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private paymentDialog(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: 'SportPass Membership - Payment' }).first();
  }

  async expectPaymentDialogOpen(): Promise<void> {
    await expect(this.paymentDialog()).toBeVisible();
    await expect(this.paymentDialog().getByRole('heading', { name: 'Card Details' })).toBeVisible();
  }

  async fillPaymentForm(data: MembershipPaymentData): Promise<void> {
    const dialog = this.paymentDialog();
    await this.expectPaymentDialogOpen();

    await dialog.locator('#cardholder-name').fill(data.cardholderName);

    const stripeCard = this.page.frameLocator('iframe[src*="elements-inner-card"]');
    await stripeCard.getByPlaceholder('Card number').fill(data.cardNumber);
    await stripeCard.getByPlaceholder('MM / YY').fill(data.expiry);
    await stripeCard.getByPlaceholder('CVC').fill(data.cvc);
    await stripeCard.getByPlaceholder('ZIP').fill(data.zipCode);

    const termsCheckbox = dialog.getByRole('checkbox');
    await termsCheckbox.check();
    await expect(termsCheckbox).toBeChecked();
  }

  async submitPayment(): Promise<void> {
    const dialog = this.paymentDialog();
    await dialog.getByRole('button', { name: /Pay/i }).first().click();
  }

  async expectPaymentSuccess(): Promise<void> {
    const dialog = this.paymentDialog();
    await expect(this.page.getByText('Membership purchased successfully')).toBeVisible();
    await expect(dialog).toBeHidden();
  }
}

