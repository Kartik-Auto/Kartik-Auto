import { expect, type Locator, type Page } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) 
  {
    this.page = page;
    this.emailInput = this.page.getByRole('textbox', { name: 'Email' });
    this.passwordInput = this.page.getByRole('textbox', { name: 'Password' });
    this.loginButton = this.page.getByRole('button', { name: 'Login' });
    this.forgotPasswordLink = this.page.getByRole('link', { name: 'Forgot your password?' });
  }

  async goto(url: string) 
  {
    await this.page.goto(url);
  }

  async login(username: string, password: string) 
  {
    await expect(this.emailInput).toBeVisible();
    await this.emailInput.fill(username);

    // This login page is a two-step flow: email first, then password appears.
    // If password is already present, the click is harmless (no-op navigation).
    await this.loginButton.click();

    await expect(this.passwordInput).toBeVisible();
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    await expect(this.page).not.toHaveURL(/login/i);
  }
}
