import { Page, Locator, expect } from '@playwright/test';
import { delay } from '../helpers/pacing';

const MAILINATOR_DOMAIN = 'mailinator.com';
const MAILINATOR_API_BASE = 'https://mailinator.com/api/v2/domains/public';
const EMAIL_ARRIVAL_WAIT_MS = 12_000;
const INBOX_POLL_INTERVAL_MS = 3_000;
const MAILINATOR_POLL_TIMEOUT_MS = 60_000;

type InboxMessagesResponse = {
  msgs?: Array<{ id: string }>;
};

type MailinatorMessagePayload = {
  parts?: Array<{ body?: string }>;
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
    await expect(this.verificationHeading).toBeVisible();
    await expect(this.resendButton).toBeVisible();
  }

  async expectEmailVisible(email: string) {
    await expect(this.page.getByText(email, { exact: true })).toBeVisible();
  }

  async clickResend() {
    await this.resendButton.click();
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
    const parts = payload.parts ?? payload.data?.parts ?? [];
    for (const part of parts) {
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

  private async fetchLatestMessageId(inbox: string): Promise<string> {
    const response = await this.page.request.get(
      `${MAILINATOR_API_BASE}/inboxes/${encodeURIComponent(inbox)}`,
    );
    if (!response.ok()) return '';

    const body = (await response.json()) as InboxMessagesResponse;
    return body.msgs?.[0]?.id ?? '';
  }

  private async fetchMessagePayload(messageId: string): Promise<MailinatorMessagePayload> {
    const response = await this.page.request.get(
      `${MAILINATOR_API_BASE}/messages/${encodeURIComponent(messageId)}`,
    );
    if (!response.ok()) return {};

    return (await response.json()) as MailinatorMessagePayload;
  }

  /** Wait for delivery, then poll the public Mailinator API (no browser inbox tab). */
  private async pollMailinatorMessageId(inbox: string): Promise<string> {
    await delay(EMAIL_ARRIVAL_WAIT_MS);

    let messageId = '';
    await expect
      .poll(
        async () => {
          messageId = await this.fetchLatestMessageId(inbox);
          return messageId;
        },
        { timeout: MAILINATOR_POLL_TIMEOUT_MS, intervals: [INBOX_POLL_INTERVAL_MS] },
      )
      .not.toBe('');

    return messageId;
  }

  async getVerificationLinkFromMailinator(email: string): Promise<string> {
    const inbox = this.inboxFromEmail(email);

    try {
      const messageId = await this.pollMailinatorMessageId(inbox);
      const payload = await this.fetchMessagePayload(messageId);
      const link = this.extractLinkFromMailinatorPayload(payload);
      if (link) return link;

      const legacyResponse = await this.page.request.get(
        `https://www.mailinator.com/fetch_public?msgid=${encodeURIComponent(messageId)}`,
      );
      if (!legacyResponse.ok()) return '';

      return this.extractLinkFromMailinatorPayload(
        (await legacyResponse.json()) as MailinatorMessagePayload,
      );
    } catch {
      return '';
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
