import { expect, Locator, Page } from '@playwright/test';
import { faker } from '@faker-js/faker';

export type LocationFieldData = {
  typeOfField: string;
  fieldNumber: string;
  name: string;
};

export type LocationData = {
  name: string;
  address: string;
  fields: LocationFieldData[];
};

export class LocationPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly addNewLocationButton: Locator;
  readonly addLocationsButton: Locator;
  readonly cancelButton: Locator;
  readonly addMoreFieldButton: Locator;
  readonly locationNameInput: Locator;
  readonly locationAddressInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Locations' });
    this.addNewLocationButton = page.getByRole('button', { name: 'Add New Location' });
    this.addLocationsButton = page.getByRole('button', { name: 'Add Locations' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.addMoreFieldButton = page.getByRole('button', { name: 'Add More Field' });
    this.locationNameInput = page.locator('input[name="name"]');
    this.locationAddressInput = page.locator('#address');
  }

  private addLocationDialog(): Locator {
    return this.page.getByRole('dialog', { name: /Add New Location/i });
  }

  private log(action: string) {
    console.log(`[LocationPage] ${action}`);
  }

  async goto(url: string) {
    this.log(`Navigating to ${url}`);
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    await this.waitForListPage();
  }

  async waitForListPage() {
    this.log('Waiting for locations list page');
    await expect(this.page).toHaveURL(/\/settings\/location/);
    await expect(this.heading).toBeVisible();
    await expect(this.addNewLocationButton).toBeVisible();
  }

  async waitForAddLocationDialog() {
    this.log('Waiting for Add New Location dialog');
    const dialog = this.addLocationDialog();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Add New Location' })).toBeVisible();
  }

  async clickAddNewLocation() {
    this.log('Clicking Add New Location');
    await this.addNewLocationButton.click();
    await this.waitForAddLocationDialog();
  }

  private async fillAddress(address: string) {
    this.log(`Filling location address: ${address}`);
    await this.locationAddressInput.click();
    await this.locationAddressInput.fill(address);

    const suggestion = this.page.getByRole('option').first();
    if ((await suggestion.count()) > 0 && (await suggestion.isVisible())) {
      await suggestion.click();
      this.log('Selected address from suggestions');
      return;
    }

    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
    this.log('Confirmed address with keyboard');
  }

  private fieldInput(index: number, field: keyof LocationFieldData): Locator {
    const name =
      field === 'typeOfField'
        ? `fields.${index}.typeOfField`
        : field === 'fieldNumber'
          ? `fields.${index}.fieldNumber`
          : `fields.${index}.name`;
    return this.page.locator(`input[name="${name}"]`);
  }

  async fillField(index: number, field: LocationFieldData) {
    this.log(
      `Filling field ${index}: type=${field.typeOfField}, number=${field.fieldNumber}, name=${field.name}`,
    );
    await this.fieldInput(index, 'typeOfField').fill(field.typeOfField);
    await this.fieldInput(index, 'fieldNumber').fill(field.fieldNumber);
    await this.fieldInput(index, 'name').fill(field.name);
  }

  async fillLocationForm(data: LocationData) {
    this.log(`Filling location form for: ${data.name}`);
    await this.locationNameInput.fill(data.name);
    await this.fillAddress(data.address);

    for (let i = 0; i < data.fields.length; i++) {
      if (i > 0) {
        await this.clickAddMoreField();
      }
      await this.fillField(i, data.fields[i]);
    }
  }

  async clickAddMoreField() {
    this.log('Clicking Add More Field');
    await this.addMoreFieldButton.click();
  }

  async clickAddLocations() {
    this.log('Clicking Add Locations to submit');
    await this.addLocationsButton.click();
    await expect(this.addLocationDialog()).toBeHidden();
    await this.waitForListPage();
  }

  async cancelAddLocation() {
    this.log('Clicking Cancel on Add New Location dialog');
    await this.cancelButton.click();
    await expect(this.addLocationDialog()).toBeHidden();
    await this.waitForListPage();
  }

  async addLocation(data: LocationData) {
    this.log(`Adding location: ${data.name}`);
    await this.clickAddNewLocation();
    await this.fillLocationForm(data);
    await this.clickAddLocations();
  }

  locationRow(name: string) {
    return this.page.getByRole('row').filter({
      has: this.page.getByRole('cell', { name }),
    });
  }

  async expectLocationInList(data: LocationData) {
    this.log(`Verifying location in list: ${data.name}`);
    const row = this.locationRow(data.name);
    await expect(row).toBeVisible();
    await expect(row.getByRole('cell', { name: data.name })).toBeVisible();
    // "No of fields" is the third column (Location, Address, No of fields, Actions).
    await expect(row.getByRole('cell').nth(2)).toHaveText(String(data.fields.length));
    this.log(`Location verified in list: ${data.name}`);
  }

  static buildFieldData(overrides: Partial<LocationFieldData> = {}): LocationFieldData {
    return {
      typeOfField: faker.helpers.arrayElement([
        'Soccer Field',
        'Tennis Court',
        'Basketball Court',
        'Baseball Diamond',
      ]),
      fieldNumber: faker.string.numeric({ length: { min: 1, max: 2 } }),
      name: `${faker.word.adjective()} ${faker.word.noun()} Field`,
      ...overrides,
    };
  }

  static buildLocationName(): string {
    return `${faker.company.name()} ${faker.location.city()} Site`;
  }

  static buildLocationAddress(): string {
    // Short street line works reliably with autocomplete / keyboard confirm on stage.
    return `${faker.location.buildingNumber()} ${faker.location.street()}`;
  }

  static buildLocationData(overrides: Partial<LocationData> = {}): LocationData {
    const fields = overrides.fields ?? [LocationPage.buildFieldData()];
    return {
      name: LocationPage.buildLocationName(),
      address: LocationPage.buildLocationAddress(),
      fields,
      ...overrides,
    };
  }

  static buildLocationWithMultipleFields(fieldCount = 2): LocationData {
    const fields = Array.from({ length: fieldCount }, () => LocationPage.buildFieldData());
    return LocationPage.buildLocationData({ fields });
  }
}
