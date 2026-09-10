# Staff Signup — Join Existing Organisation

**Seed:** `tests/seed.spec.ts`  
**Env:** UAT v2 (`staffJoinOrgId` + `staffApproverUsername` in `tests/config/uat.json`)

## Application Overview

A new user signs up the same way as parent/organiser until **role selection**, then chooses **I'm Staff Member**. After parent-style personal details (including mobile OTP when `requireMobileOtp` is true), they land on **Find Existing Organisation**, enter an org ID, pick **Admin**, and request to join. An organisation admin accepts the request under **Staff Details**. The staff user can then log in as an approved member.

## Happy Path — SS-01 Staff requests to join and admin accepts

**Preconditions:**

- `staffJoinOrgId` (UAT v2: `ORG-578`)
- `staffApproverUsername` / `staffApproverPassword` for that organisation
- Mailinator public inbox for the generated staff email

**Steps:**

1. Sign up with faker first/last name and a unique `@mailinator.com` email (same form as parent/organiser).
2. Verify email via Mailinator.
3. On role selection, choose **I'm Staff Member** only and Continue.
4. Fill Personal Details (mobile + OTP when a Verify control is shown; otherwise address/state/city/zip and Next).
5. On **Find Existing Organisation**, enter the configured org ID, choose **Admin**, click **Request to join Organisation**.
6. In a **separate browser context**, log in as the org admin, open the profile, select **Morrow Vasquez Traders** (My Accounts), then open **Staff Details**.
7. Assert the pending request shows the same first name, last name, and email; **Accept**.
8. Open the **Staff Members** list and assert the approved person is listed (Admin).
9. Log in with the new staff email/password, then click the organisation they joined.

**Expected Results:**

- Join request is visible to the admin with matching identity.
- After Accept, the staff member appears on the staff list.
- After staff login, they can open the approved organisation.

## Form validation — same signup form as organiser TC-02–TC-05

- **SS-02** Empty form click Next should not proceed
- **SS-03** Mismatched passwords should show validation
- **SS-04** Invalid email format should fail HTML validation
- **SS-05** Short password should not proceed

## Out of Scope

- Coach role, reject request, invalid org ID
