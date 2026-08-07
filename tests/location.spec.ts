import { test, expect, BrowserContext } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { LoginPage } from './pages/LoginPage';
import { LocationPage } from './pages/LocationPage';
import config from './config.json';

test.describe.configure({ mode: 'serial' });

test.describe('Add Locations', () => {
  let context: BrowserContext;
  let locationPage: LocationPage;

  test.beforeAll(async ({ browser }) => {
    console.log('[location.spec] Logging in once for all tests');
    context = await browser.newContext();
    const page = await context.newPage();

    const loginPage = new LoginPage(page);
    await loginPage.goto(config.baseUrl);
    await loginPage.login(config.username, config.password);
    console.log('[location.spec] Login successful');

    locationPage = new LocationPage(page);
    await locationPage.goto(config.locationUrl);
    console.log('[location.spec] Opened locations settings page');
  });

  test.afterAll(async () => {
    console.log('[location.spec] Closing browser context');
    await context?.close();
  });

  test.beforeEach(async () => {
    console.log('[location.spec] Ensuring on locations list page');
    await locationPage.waitForListPage();
  });

  // Verify the locations settings page loads with heading and add button visible
  test('LC-01 | Locations settings page should load', async () => {
    console.log('[location.spec] LC-01: Locations settings page should load');

    await expect(locationPage.heading).toBeVisible();
    console.log('[location.spec] Verified Locations heading');
    await expect(locationPage.addNewLocationButton).toBeVisible();
    console.log('[location.spec] Verified Add New Location button');
  });

  // Add a single-field location and confirm it appears in the list
  test('LC-02 | Add location should appear in the locations list', async () => {
    console.log('[location.spec] LC-02: Add location should appear in the locations list');
    const locationData = LocationPage.buildLocationData({
      name: LocationPage.buildLocationName(),
      address: faker.location.streetAddress(),
      fields: [
        LocationPage.buildFieldData({
          typeOfField: faker.helpers.arrayElement(['Soccer Field', 'Football Field']),
          fieldNumber: faker.string.numeric(1),
          name: faker.commerce.productName(),
        }),
      ],
    });
    console.log(`[location.spec] Built location data: ${locationData.name}`);

    await locationPage.addLocation(locationData);
    console.log('[location.spec] Submitted new location');

    await locationPage.expectLocationInList(locationData);
    console.log('[location.spec] Location found in list');
  });

  // Add a location with multiple fields and confirm the correct field count is shown
  test('LC-03 | Add location with multiple fields should show correct field count', async () => {
    console.log('[location.spec] LC-03: Add location with multiple fields');
    const locationData = LocationPage.buildLocationWithMultipleFields(2);
    console.log(`[location.spec] Built location with ${locationData.fields.length} fields`);

    await locationPage.addLocation(locationData);
    console.log('[location.spec] Submitted location with multiple fields');

    await locationPage.expectLocationInList(locationData);
    console.log('[location.spec] Multi-field location verified in list');
  });

  // Open the add dialog, fill the form, cancel, and confirm the location is not saved
  test('LC-04 | Cancel should close dialog without adding location', async () => {
    console.log('[location.spec] LC-04: Cancel should not save location');
    const locationData = LocationPage.buildLocationData({
      name: `${faker.word.adjective()} ${faker.location.city()} ${faker.string.numeric(3)}`,
      address: faker.location.streetAddress(),
    });
    console.log(`[location.spec] Built cancellable location: ${locationData.name}`);

    await locationPage.clickAddNewLocation();
    console.log('[location.spec] Opened Add New Location dialog');
    await locationPage.fillLocationForm(locationData);
    console.log('[location.spec] Filled form without submitting');
    await locationPage.cancelAddLocation();
    console.log('[location.spec] Cancelled add location');

    await expect(locationPage.locationRow(locationData.name)).toHaveCount(0);
    console.log('[location.spec] Confirmed location was not saved');
  });
});
