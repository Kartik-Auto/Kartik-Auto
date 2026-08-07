import { expect, type Locator, type Page } from '@playwright/test';

/** Waits out transient toasts (e.g. sign-in success) so they stay out of screenshots. */
export async function waitForToastsToClear(page: Page): Promise<void> {
  await expect(page.locator('section[aria-label*="Notifications"] li')).toHaveCount(0, {
    timeout: 15_000,
  });
}

/** Disable CSS animations/transitions for stable screenshot pixels. */
export async function prepareForScreenshot(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        caret-color: transparent !important;
      }
    `,
  });
}

/** Shared tolerances — see playwright.config.ts expect.toHaveScreenshot. */
export const visualSnapshotName = (name: string) => `${name}.png`;

export function appHeaderMasks(page: Page): Locator[] {
  return [
    page.getByRole('banner').getByRole('button').filter({ hasText: /^\d+\+?$/ }),
    page.getByRole('button', { name: /\| Parent$/ }),
  ];
}

/** Masks volatile parent-dashboard content (child cards, schedules, pending actions). */
export function parentDashboardMasks(page: Page): Locator[] {
  const main = page.locator('main');

  return [
    ...appHeaderMasks(page),
    // Child cards change whenever a profile is added, so mask the whole grid.
    main.getByRole('heading', { name: 'Child Profiles' }).locator('xpath=../following-sibling::*[1]'),
    main.getByRole('button', { name: 'Purchase Now' }),
    main.getByText(/\d+ \| \d+(st|nd|rd|th)/),
    main.getByText(/Pending Actions/i).locator('xpath=ancestor::div[contains(@class,"rounded")][1]'),
    main.getByText(/Pending Invites/i).locator('xpath=ancestor::div[contains(@class,"rounded")][1]'),
    main.getByText(/No Schedules/i).locator('xpath=ancestor::div[contains(@class,"rounded")][1]'),
    main.locator('div').filter({ hasText: /^QQ$|^IG$|^TM$|^MT$|^SP$|^LK$|^MC$|^IH$|^SG$|^SJ$/ }),
  ];
}

/** Masks prefilled contact details on the add-child drawer form. */
export function addChildFormMasks(page: Page): Locator[] {
  const drawer = page.locator('[data-slot="drawer-content"]');

  return [
    drawer.getByText(/@[a-z0-9.-]+\.(com|net|org)/i),
    drawer.getByText(/\(\d{3}\)\s*\d{3}-\d{4}/),
  ];
}

export async function expectScreenshot(
  target: Locator | Page,
  name: string,
  masks: Locator[] = [],
): Promise<void> {
  await expect(target).toHaveScreenshot(visualSnapshotName(name), { mask: masks });
}
