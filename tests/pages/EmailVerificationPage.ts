import { Page, Locator, expect } from '@playwright/test';

const MAILINATOR_DOMAIN = 'mailinator.com';
const MAILINATOR_INBOX_BASE = 'https://www.mailinator.com/v4/public/inboxes.jsp';
const EMAIL_ARRIVAL_WAIT_MS = 12_000;
const INBOX_POLL_INTERVAL_MS = 3_000;

type MailinatorMessagePayload = {
  data?: {
    parts?: Array<{ body?: string }>;
  };
};

export class EmailVerificationPage {
  readonly page: Page;

  readonly successToast: Locator;
  readonly verificationHeading: Locator;
  readonly resendButton: Locator;
  readonly emailDisplayed: Locator;

  constructor(page: Page) {
    this.page = page;
    this.successToast = page.getByText(
      'Your account has been created. Please check your email to verify your account.',
    );
    this.verificationHeading = page.getByRole('heading', { name: 'Email Verification Sent' });
    this.resendButton = page.getByRole('button', { name: 'Resend' });
    this.emailDisplayed = page.getByText(new RegExp(`@${MAILINATOR_DOMAIN}`, 'i'));
  }

  async waitForVerificationScreen() {
    await this.verificationHeading.waitFor({ state: 'visible' });
  }

  async expectEmailVisible(email: string) {
    await this.page.getByText(email, { exact: false }).waitFor({ state: 'visible' });
  }

  async clickResend() {
    await this.resendButton.click();
  }

  private mailinatorInboxUrl(inbox: string) {
    return `${MAILINATOR_INBOX_BASE}?to=${encodeURIComponent(inbox)}`;
  }

  private inboxFromEmail(email: string) {
    return email.split('@')[0];
  }

  private normalizeVerificationHref(href: string): string {
    if (href.startsWith('http')) return href;
    if (href.startsWith('//')) return `https:${href}`;
    return `https://stage.futureonesports.com${href.startsWith('/') ? '' : '/'}${href}`;
  }

  private extractLinkFromText(body: string): string {
    const match =
      body.match(/https?:\/\/[^\s"'<>\\]+(?:onboarding|verify)[^\s"'<>\\]*/i) ??
      body.match(/https?:\/\/stage\.futureonesports\.com[^\s"'<>\\]*/i);
    if (!match) return '';
    return match[0].replace(/\\u002F/g, '/').replace(/\\/g, '');
  }

  private extractLinkFromMailinatorPayload(payload: MailinatorMessagePayload): string {
    for (const part of payload.data?.parts ?? []) {
      const link = this.extractLinkFromText(part.body ?? '');
      if (link) return this.normalizeVerificationHref(link);
    }
    return '';
  }

  private async waitForVerificationLinkInNetwork(action: () => Promise<void>): Promise<string> {
    const responsePromise = this.page.waitForResponse(
      (res) => /verify|email|signup|auth|user/i.test(res.url()) && res.ok(),
    );

    await action();
    const response = await responsePromise.catch(() => null);
    if (!response) return '';

    try {
      return this.extractLinkFromText(await response.text());
    } catch {
      return '';
    }
  }

  private async readLatestMessageId(mailinatorPage: Page): Promise<string> {
    return mailinatorPage.evaluate(() => {
      const inboxEl = document.getElementById('InboxCtrl');
      const angularApi = (
        window as unknown as {
          angular?: {
            element: (el: Element) => { scope: () => { emails: Array<{ id: string }> } };
          };
        }
      ).angular;
      if (!inboxEl || !angularApi) return '';
      const emails = angularApi.element(inboxEl).scope().emails;
      return emails[0]?.id ?? '';
    });
  }

  /** Wait for delivery, then poll inbox via Mailinator websocket (no page reloads). */
  private async pollMailinatorMessageId(mailinatorPage: Page): Promise<string> {
    await mailinatorPage.waitForTimeout(EMAIL_ARRIVAL_WAIT_MS);

    let messageId = '';
    await expect
      .poll(
        async () => {
          messageId = await this.readLatestMessageId(mailinatorPage);
          return messageId;
        },
        { timeout: 0, intervals: [INBOX_POLL_INTERVAL_MS] },
      )
      .not.toBe('');

    return messageId;
  }

  async getVerificationLinkFromMailinator(email: string): Promise<string> {
    const inbox = this.inboxFromEmail(email);
    const mailinatorPage = await this.page.context().newPage();

    try {
      await mailinatorPage.goto(this.mailinatorInboxUrl(inbox), { waitUntil: 'domcontentloaded' });

      const messageId = await this.pollMailinatorMessageId(mailinatorPage);
      const response = await mailinatorPage.request.get(
        `https://www.mailinator.com/fetch_public?msgid=${encodeURIComponent(messageId)}`,
      );
      const payload = (await response.json()) as MailinatorMessagePayload;

      return this.extractLinkFromMailinatorPayload(payload);
    } finally {
      await mailinatorPage.close();
    }
  }

  async verifyEmail(email: string) {
    let link = await this.getVerificationLinkFromMailinator(email);

    if (!link) {
      link = await this.waitForVerificationLinkInNetwork(() => this.clickResend());
    }
    if (!link) {
      link = await this.getVerificationLinkFromMailinator(email);
    }

    if (!link) throw new Error('Verification link not found in Mailinator inbox');
    await this.page.goto(link, { waitUntil: 'domcontentloaded' });
  }
}
