import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import config from './config.json';

test('Login with valid credentials should succeed', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto(config.baseUrl);
  await loginPage.login(config.username, config.password);

  // Post-login destination can vary; assert we left the login page.
  await expect(page).not.toHaveURL(/\/login\/?$/i);
});
