import { test, expect, BrowserContext } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { LoginPage } from './pages/LoginPage';
import { WaiverPage } from './pages/WaiverPage';
import { config } from './helpers/env';

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
    await waiverPage.clearSearch();
  });

  // Verify the waiver settings page loads and the search input works
  test('WV-01 | Waiver settings page should load', async () => {
    const searchTerm = faker.lorem.words(2);

    await expect(waiverPage.heading).toBeVisible();
    await expect(waiverPage.createWaiverButton).toBeVisible();
    await expect(waiverPage.searchInput).toBeVisible();

    await waiverPage.searchInput.fill(searchTerm);
    await expect(waiverPage.searchInput).toHaveValue(searchTerm);
  });

  // Create and publish a waiver, then confirm it appears as In Effect in the list
  test('WV-02 | Publish waiver should create an In Effect waiver in the list', async () => {
    const waiverData = WaiverPage.buildPublishedWaiverData();

    await waiverPage.createAndPublish(waiverData);
    await waiverPage.expectWaiverInList(waiverData, 'In Effect');
  });

  // Save a waiver as draft and confirm it appears with Draft status in the list
  test('WV-03 | Save as draft should create a Draft waiver in the list', async () => {
    const waiverData = WaiverPage.buildDraftWaiverData({
      name: WaiverPage.buildWaiverName(),
      description: faker.lorem.paragraph({ min: 2, max: 4 }),
    });

    await waiverPage.createAsDraft(waiverData);
    await waiverPage.expectWaiverInList(waiverData, 'Draft');
  });

  // Create a published waiver and confirm it is visible in the waivers list
  test('WV-04 | Created waiver should be shown in the waivers list', async () => {
    const waiverData = WaiverPage.buildPublishedWaiverData({
      name: WaiverPage.buildWaiverName(),
      description: faker.lorem.sentences({ min: 2, max: 4 }),
    });

    await waiverPage.createAndPublish(waiverData);
    await waiverPage.expectWaiverInList(waiverData, 'In Effect');
  });

  // Fill the create form then cancel and confirm the waiver is not saved
  test('WV-05 | Cancel should return to waivers list without saving', async () => {
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
