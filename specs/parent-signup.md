# Parent Signup — FutureOne Sports (Stage)

## Application Overview

FutureOne Sports parent signup on **stage** (`https://stage.futureonesports.com`) is a multi-step onboarding flow for users who register as **Parent / Player**. Unlike the organizer path, parents do **not** complete organization details (Steps 1–2). After account creation, email verification, and role selection, they fill **Personal Details** and submit with **Sign up** to reach the main application dashboard.

### Key URLs

| Step | URL pattern |
|------|-------------|
| Signup form | `/signup` |
| Email verification (pending) | `/signup` (same route, post-submit state) |
| Onboarding | `/onboarding` (role selection, personal details) |
| Dashboard (success) | Main app (not `/onboarding`; Dashboard link visible) |

### Flow Summary (Parent path)

1. **Signup form** — First name, last name, email, password, confirm password → **Next**
2. **Email verification sent** — Toast + heading; verification email to `@mailinator.com` inbox
3. **Verify email** — Open link from Mailinator (public API); lands on onboarding
4. **Role selection** — Select **I'm Parent / Player** (`PARENT`) only → **Continue**
5. **Personal details** — Address, state, city, zip (optional phone/OTP skip) → **Sign up**
6. **Dashboard** — User leaves onboarding; **Dashboard** link is visible

### Assumptions (all scenarios)

- **Fresh state**: No existing session; start from `/signup` unless noted.
- **Environment**: Staging (`stage.futureonesports.com`).
- **Email**: Unique `@mailinator.com` address per run (avoid duplicate-account errors).
- **Password**: Meets minimum requirements (e.g. `Test@123`, min 8 characters).
- **Mailinator**: Tests that verify email run **serially** with `--workers=1` (shared public API rate limits).
- **Phone OTP**: Optional step may appear; parent flow may use **Proceed without OTP** when offered.

### Out of scope

- Organizer (`ORGANIZATION_ADMIN`) and Staff (`STAFF`) role paths
- Organization details Steps 1–2
- Production environment
- Payment, waiver, or post-dashboard settings

---

## Test Scenarios

**Seed:** `tests/seed.spec.ts`

---

### 1. Signup Form — Page Load & UI

#### 1.1 Signup page loads with required fields

**Steps:**
1. Navigate to `https://stage.futureonesports.com/signup` (or run seed test).
2. Wait for the signup form to be visible.

**Expected Results:**
- Page heading **Sign up** is visible.
- Subtext mentions creating an account for teams/programs.
- Required fields visible: **First name**, **Last name**, **Email**, **Password**, **Confirm password** (all marked required).
- Placeholders: "Enter first name", "Enter last name", "you@company.com", "Min 8 character", "Match the password".
- **Next** button is visible.
- **Login** link points to `/login`.
- Footer links: **Terms & Conditions**, **Privacy Policy**.

**Failure conditions:** Missing fields, broken layout, or navigation away from signup without user action.

---

### 2. Signup Form — Validation (Negative)

#### 2.1 Empty form — Next does not advance

**Steps:**
1. Open `/signup` with all fields empty.
2. Click **Next**.

**Expected Results:**
- User remains on `/signup`.
- Email verification screen does **not** appear.

#### 2.2 Mismatched passwords

**Steps:**
1. Fill first name, last name, and a valid unique `@mailinator.com` email.
2. Enter password `Test@123` in **Password**.
3. Enter a different value in **Confirm password** (e.g. `WrongPassword@123`).
4. Click **Next**.

**Expected Results:**
- Validation message visible (password match error).
- User remains on signup form; no verification screen.

#### 2.3 Invalid email format

**Steps:**
1. Fill first name and last name.
2. Enter `not-an-email` in **Email**.
3. Fill matching valid-length passwords.
4. Click **Next**.

**Expected Results:**
- HTML5 email validation fails (`input[name="email"]` invalid).
- User does not reach email verification screen.

#### 2.4 Short password (below minimum length)

**Steps:**
1. Fill all fields with valid names and email.
2. Enter password and confirm password with fewer than 8 characters (e.g. `Test@1`).
3. Click **Next**.

**Expected Results:**
- Form does not proceed to verification (validation error or HTML constraint).
- User remains on signup.

#### 2.5 Duplicate email (existing account)

**Steps:**
1. Complete signup once with email `parent-e2e@mailinator.com` (or reuse from prior run).
2. Sign out or use a fresh browser context.
3. Attempt signup again with the **same email**.

**Expected Results:**
- Signup is rejected with an appropriate error (duplicate user / email already registered).
- User does not reach a successful verification-sent state for the duplicate attempt.

---

### 3. Signup Form — Happy Path Submit

#### 3.1 Valid signup lands on Email Verification screen

**Steps:**
1. Generate unique signup data: first name, last name, `{prefix}{4digits}@mailinator.com`, password `Test@123`.
2. Fill all signup fields.
3. Click **Next**.

**Expected Results:**
- Success toast: *"Your account has been created. Please check your email to verify your account."*
- Heading **Email Verification Sent** is visible.
- Copy confirms email was sent to the entered address.
- **Resend** button is visible.
- User email address appears on screen.

**Success criteria:** All verification UI elements visible; no onboarding URL yet.

---

### 4. Email Verification

#### 4.1 Resend verification email

**Precondition:** On Email Verification Sent screen (scenario 3.1).

**Steps:**
1. Click **Resend**.
2. Observe UI and network (optional).

**Expected Results:**
- Resend action completes without error (success feedback or no crash).
- New verification email may arrive in Mailinator inbox (poll API after ~12s).

#### 4.2 Verify email via Mailinator link

**Precondition:** On Email Verification Sent screen; verification email delivered to inbox.

**Steps:**
1. Poll Mailinator public API for inbox `{local-part}` of signup email.
2. Fetch latest message; extract verification link (`verify`, `onboarding`, or `stage.futureonesports.com` URL).
3. Navigate to the verification link in the same browser session.

**Expected Results:**
- Verification link opens successfully.
- User is redirected into onboarding (URL contains `/onboarding` or role selection appears).
- Optional toast: *"Your email has been verified"* may appear before or during onboarding.

**Failure conditions:** No email within timeout; invalid/expired link; stuck on verification screen.

---

### 5. Role Selection — Parent Path

#### 5.1 Role selection page displays all roles

**Precondition:** Email verified; user on role selection step.

**Steps:**
1. Wait for heading matching *"Choose how you'd like to use FutureOne Sports"*.

**Expected Results:**
- Three role cards visible:
  - **I'm Organizer** (`ORGANIZATION_ADMIN`)
  - **I'm Parent / Player** (`PARENT`)
  - **I'm Staff Member** (`STAFF`)
- **Continue** button present (may be disabled until a role is selected).

#### 5.2 Select Parent / Player only and continue

**Steps:**
1. Click heading **I'm Parent / Player** (radio `value="PARENT"` becomes checked).
2. Confirm **I'm Organizer** and **I'm Staff Member** are **not** checked.
3. Click **Continue**.

**Expected Results:**
- Only `PARENT` role is selected.
- User advances to **Personal Details** onboarding step.
- URL matches `/onboarding`.
- Heading **Personal Details** is visible.

#### 5.3 Continue without selecting a role

**Steps:**
1. On role selection page, do not select any role.
2. Click **Continue** (if enabled) or attempt to proceed.

**Expected Results:**
- User cannot proceed to personal details without a role selection, OR **Continue** remains disabled.

#### 5.4 Wrong role — Organizer selected (parent flow guard)

**Steps:**
1. Select **I'm Organizer** instead of Parent.
2. Click **Continue** and complete organizer-only steps if reachable.

**Expected Results:**
- Parent test suite intent: this path leads to organizer onboarding (org steps), **not** the parent personal-details-only path. Document as regression if parent tests accidentally take organizer route.

---

### 6. Personal Details — Parent Onboarding

#### 6.1 Personal details form displays required fields

**Precondition:** Parent role selected; on Personal Details step.

**Steps:**
1. Wait for heading **Personal Details**.
2. If phone verification step appears first, use **Proceed without OTP** (or navigate to Basic Details).

**Expected Results:**
- Fields available: **Address**, **State**, **City**, **Zip code** (and optionally **Mobile number**).
- **Sign up** button visible (parent final CTA — not **Next** to org steps).
- **Cancel** may be present.

#### 6.2 Submit personal details with valid US address

**Steps:**
1. Fill address (street), state, city, and 5-digit zip with valid values.
2. Click **Sign up**.

**Expected Results:**
- Form submits without validation errors.
- User leaves `/onboarding`.
- **Dashboard** link appears in the main application shell.
- Account onboarding for parent path is complete.

#### 6.3 Personal details — empty required fields

**Steps:**
1. On Personal Details, leave address fields empty.
2. Click **Sign up**.

**Expected Results:**
- Validation prevents submission OR inline errors shown.
- User remains on personal details; dashboard not reached.

#### 6.4 Optional phone verification skip

**Precondition:** Phone verification step shown after email verify.

**Steps:**
1. When **Proceed without OTP** (or link equivalent) is visible, click it.
2. Navigate to Basic Details if a stepper is shown.
3. Complete address fields and click **Sign up**.

**Expected Results:**
- User can complete signup without SMS OTP.
- Lands on dashboard as in 6.2.

---

### 7. End-to-End — Parent Signup to Dashboard

#### 7.1 Full parent signup happy path (PS-03 equivalent)

**Steps:**
1. Navigate to `/signup`.
2. Submit valid unique Mailinator signup data → Email Verification screen.
3. Verify email via Mailinator link.
4. Select **Parent / Player** only → **Continue**.
5. Fill personal details (address, state, city, zip).
6. Click **Sign up**.

**Expected Results:**
- Each intermediate screen matches expectations in sections 3–6.
- Final URL is **not** `/onboarding`.
- **Dashboard** link is visible.
- User can access main app navigation.

**Success criteria:** Complete parent registration without organizer org steps.

#### 7.2 Partial flow — stop at personal details (PS-02 equivalent)

**Steps:**
1. Execute steps 1–4 of scenario 7.1.

**Expected Results:**
- User on Personal Details (`/onboarding`).
- Heading **Personal Details** visible.
- Flow ready for personal details submission in a follow-up test.

---

### 8. Navigation & Session Edge Cases

#### 8.1 Login link from signup page

**Steps:**
1. On `/signup`, click **Login**.

**Expected Results:**
- User navigates to `/login`.
- Login form loads (separate from signup flow).

#### 8.2 Terms and Privacy links open correctly

**Steps:**
1. On signup page, click **Terms & Conditions** and **Privacy Policy**.

**Expected Results:**
- Terms opens `https://futureonesports.com/terms-of-service`.
- Privacy opens `https://futureonesports.com/privacy-policy`.
- Links open in new tab or same window per app behavior; no broken URLs.

#### 8.3 Refresh on email verification screen

**Precondition:** On Email Verification Sent screen, email not yet verified.

**Steps:**
1. Refresh the browser.

**Expected Results:**
- User remains on verification-pending state OR is prompted appropriately.
- Resend remains available; user can still verify via email link.

---

## Test Data Conventions

| Field | Convention |
|-------|------------|
| First / Last name | Alphabetic; faker-generated or fixed test names |
| Email | `{firstname}{4digits}@mailinator.com` — unique per run |
| Password | `Test@123` (min 8 chars, mixed case, symbol) |
| Address | Valid US street address |
| State / City / Zip | Consistent US location data |

---

## Automation Notes

- **Page objects:** `ParentSignupPage`, `EmailVerificationPage`, `RoleSelectionPage`, `PersonalDetailsPage`
- **Existing specs:** `tests/parent-signup.spec.ts` (PS-01 through PS-03)
- **Mailinator:** Use REST API polling (`/api/v2/domains/public/inboxes/{inbox}`); allow ≥12s before first poll; run signup tests serially.
- **Timeouts:** Full parent E2E may require up to 180s (email delivery + onboarding).

---

## Scenario Index

| ID | Scenario | Type |
|----|----------|------|
| 1.1 | Signup page load | Smoke |
| 2.1–2.5 | Form validation | Negative |
| 3.1 | Valid submit → verification screen | Happy path |
| 4.1–4.2 | Email verify / resend | Integration |
| 5.1–5.4 | Role selection (parent) | Functional |
| 6.1–6.4 | Personal details | Functional |
| 7.1–7.2 | E2E parent signup | E2E |
| 8.1–8.3 | Navigation / session | Edge |
