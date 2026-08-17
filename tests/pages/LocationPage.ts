import { expect, Locator, Page } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { getEnvConfig } from '../helpers/env';

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

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Locations', exact: true });
    this.addNewLocationButton = page.getByRole('button', { name: 'Add New Location' });
  }

  /** Stage: dialog. UAT: full-page create form inside main. */
  private dialogForm(): Locator {
    return this.page.getByRole('dialog', { name: /Add New Location/i });
  }

  private pageForm(): Locator {
    return this.page.locator('main').filter({
      has: this.page.getByRole('heading', { name: /Create location/i }),
    });
  }

  private async formRoot(): Promise<Locator> {
    if (await this.dialogForm().isVisible().catch(() => false)) {
      return this.dialogForm();
    }
    return this.pageForm();
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
    // UAT Save sometimes lands on dashboard; recover to the locations list.
    if (!/\/settings\/location\/?$/.test(this.page.url())) {
      await this.page.goto(getEnvConfig().locationUrl, { waitUntil: 'domcontentloaded' });
    }
    await expect(this.page).toHaveURL(/\/settings\/location\/?$/);
    await expect(this.heading).toBeVisible();
    await expect(this.addNewLocationButton).toBeVisible();
  }

  async waitForAddLocationForm() {
    this.log('Waiting for Add/Create location form (dialog on Stage, page on UAT)');
    await Promise.race([
      this.dialogForm().waitFor({ state: 'visible' }),
      this.page.waitForURL(/\/settings\/location\/create/),
      this.pageForm().waitFor({ state: 'visible' }),
    ]);

    const form = await this.formRoot();
    await expect(form).toBeVisible();
    await expect(
      form.getByRole('heading', { name: /Add New Location|Create location/i }),
    ).toBeVisible();
  }

  /** @deprecated Prefer waitForAddLocationForm */
  async waitForAddLocationDialog() {
    await this.waitForAddLocationForm();
  }

  async clickAddNewLocation() {
    this.log('Clicking Add New Location');
    await this.addNewLocationButton.click();
    await this.waitForAddLocationForm();
  }

  private async fillAddress(address: string) {
    this.log(`Filling location address: ${address}`);
    const form = await this.formRoot();
    const input = form.locator('#address');
    await input.click();
    await input.fill(address);

    // Prefer Places suggestion when present; UAT allows free-form entry.
    const option = this.page.getByRole('option').first();
    try {
      await expect(option).toBeVisible({ timeout: 2500 });
      await option.click();
      this.log('Selected address from suggestions');
    } catch {
      this.log('No address suggestions — keeping free-form value');
    }
  }

  private async fieldInput(index: number, field: keyof LocationFieldData): Promise<Locator> {
    const form = await this.formRoot();
    const name =
      field === 'typeOfField'
        ? `fields.${index}.typeOfField`
        : field === 'fieldNumber'
          ? `fields.${index}.fieldNumber`
          : `fields.${index}.name`;
    return form.locator(`input[name="${name}"]`);
  }

  async fillField(index: number, field: LocationFieldData) {
    this.log(
      `Filling field ${index}: type=${field.typeOfField}, number=${field.fieldNumber}, name=${field.name}`,
    );
    await (await this.fieldInput(index, 'typeOfField')).fill(field.typeOfField);
    await (await this.fieldInput(index, 'fieldNumber')).fill(field.fieldNumber);
    await (await this.fieldInput(index, 'name')).fill(field.name);
  }

  async fillLocationForm(data: LocationData) {
    this.log(`Filling location form for: ${data.name}`);
    const form = await this.formRoot();
    await form.locator('input[name="name"]').fill(data.name);
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
    const form = await this.formRoot();
    await form.getByRole('button', { name: 'Add More Field' }).click();
  }

  async clickAddLocations() {
    this.log('Submitting location form (Add Locations on Stage / Save on UAT)');
    const form = await this.formRoot();
    // Stage: "Add Locations"; UAT create page: "Save"
    await form.getByRole('button', { name: /^(Add Locations|Save)$/ }).click();

    // Stage closes the dialog on the list URL; UAT may navigate to list or dashboard.
    await Promise.race([
      this.dialogForm().waitFor({ state: 'hidden' }).catch(() => undefined),
      this.page.waitForURL(/\/settings\/location\/?$/).catch(() => undefined),
      this.page.waitForURL(/\/$/).catch(() => undefined),
    ]);
    await this.waitForListPage();
  }

  async cancelAddLocation() {
    this.log('Clicking Cancel on location form');
    const form = await this.formRoot();
    await form.getByRole('button', { name: 'Cancel', exact: true }).click();
    await Promise.race([
      this.dialogForm().waitFor({ state: 'hidden' }).catch(() => undefined),
      this.page.waitForURL(/\/settings\/location\/?$/).catch(() => undefined),
    ]);
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
