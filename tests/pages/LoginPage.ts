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

    // Stage currently shows email + password together. Clicking Login before the
    // password is filled submits an empty password and leaves the user on /login.
    // UAT (and older Stage) still reveal the password after the first click.
    if (!(await this.passwordInput.isVisible().catch(() => false))) {
      await this.loginButton.click();
      await expect(this.passwordInput).toBeVisible();
    }

    await this.passwordInput.fill(password);
    await this.loginButton.click();
    await expect(this.page).not.toHaveURL(/login/i);
  }
}
