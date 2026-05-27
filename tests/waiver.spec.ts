import { test, expect, BrowserContext } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { LoginPage } from './pages/LoginPage';
import { WaiverPage } from './pages/WaiverPage';
import config from './config.json';

test.describe.configure({ mode: 'serial' });

test.describe('Waiver creation', () => {
  let context: BrowserContext;
  let waiverPage: WaiverPage;

  test.beforeAll(async ({ browser }) => {
    console.log('[waiver.spec] Logging in once for all tests');
    context = await browser.newContext();
    const page = await context.newPage();

    const loginPage = new LoginPage(page);
    await loginPage.goto(config.baseUrl);
    await loginPage.login(config.username, config.password);
    console.log('[waiver.spec] Login successful');

    waiverPage = new WaiverPage(page);
    await waiverPage.goto(config.waiverUrl);
    console.log('[waiver.spec] Opened waiver settings page');
  });

  test.afterAll(async () => {
    console.log('[waiver.spec] Closing browser context');
    await context?.close();
  });

  test.beforeEach(async () => {
    console.log('[waiver.spec] Ensuring on waivers list page');
    await waiverPage.waitForListPage();
  });

  test('Waiver settings page should load', async () => {
    const searchTerm = faker.lorem.words(2);

    await expect(waiverPage.heading).toBeVisible();
    await expect(waiverPage.createWaiverButton).toBeVisible();
    await expect(waiverPage.searchInput).toBeVisible();

    await waiverPage.searchInput.fill(searchTerm);
    await expect(waiverPage.searchInput).toHaveValue(searchTerm);
  });

  test('Publish waiver should create an In Effect waiver in the list', async () => {
    const waiverData = WaiverPage.buildPublishedWaiverData();

    await waiverPage.createAndPublish(waiverData);
    await waiverPage.expectWaiverInList(waiverData, 'In Effect');
  });

  test('Save as draft should create a Draft waiver in the list', async () => {
    const waiverData = WaiverPage.buildDraftWaiverData({
      name: WaiverPage.buildWaiverName(),
      description: faker.lorem.paragraph({ min: 2, max: 4 }),
    });

    await waiverPage.createAsDraft(waiverData);
    await waiverPage.expectWaiverInList(waiverData, 'Draft');
  });

  test('Created waiver should be shown in the waivers list', async () => {
    const waiverData = WaiverPage.buildPublishedWaiverData({
      name: WaiverPage.buildWaiverName(),
      description: faker.lorem.sentences({ min: 2, max: 4 }),
    });

    await waiverPage.createAndPublish(waiverData);
    await waiverPage.expectWaiverInList(waiverData, 'In Effect');
  });

  test('Cancel should return to waivers list without saving', async () => {
    const waiverData = WaiverPage.buildPublishedWaiverData({
      name: `${faker.word.adjective()} ${faker.word.noun()} Waiver ${faker.string.numeric(4)}`,
      description: faker.lorem.sentence(),
    });

    await waiverPage.clickCreateWaiver();
    await waiverPage.fillWaiverForm(waiverData);
    await waiverPage.cancelCreate();

    await expect(waiverPage.waiverRow(waiverData.name)).toHaveCount(0);
  });
});
