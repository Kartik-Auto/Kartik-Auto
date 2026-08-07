# Team Creation — Test Plan

**Seed:** `tests/seed.spec.ts`  
**Depends on:** An existing Program with a Division that exposes **Team & Roster** (or a legacy program that still has Team & Roster at program level)

## Application Overview

On a Program detail page, the **Team & Roster** tab lets organizers create teams for the program. Creating a team opens a **Create new Team** dialog where only **Team name** is required; logo and coach are optional.

### Key UI

| Element | Label / role |
|---------|----------------|
| Tab | `Team & Roster` |
| Panel heading | `Teams & Roster` |
| Create CTA | `Create New Team` |
| Dialog | `Create new Team` |
| Required field | Team name (`Enter your team name`) |
| Submit | `Save` |
| Success toast | `Team has been created` |

## Happy Path — Create Team on Existing Program

**Preconditions:**

- Valid organiser credentials in `tests/config.json`.
- At least one existing Program on the Programs list (Upcoming or Active preferred).

**Steps:**

1. Log in with valid credentials and leave the login page.
2. Open the Programs list and open an existing Program (reuse existing; do not create a new program unless none exist).
3. Navigate to the **Team & Roster** tab.
4. Open create flow:
   - If **Create New Team** is visible (empty state), click it.
   - Otherwise open **Add** and choose **Create New Team**.
5. Enter a unique Team Name (faker-js).
6. Click **Save**.

**Expected Results:**

- Create dialog closes.
- Success toast **Team has been created** is shown (when available).
- New team appears in the Teams list with the exact name entered.

## Negative Cases

### Empty team name (TM-02)

**Steps:**

1. Open **Create New Team**.
2. Leave Team name empty.
3. Click **Save**.

**Expected Results:**

- Dialog remains open.
- Validation message **Team name is required** is shown.
- Success toast is not shown.

### Cancel create (TM-03)

**Steps:**

1. Open **Create New Team**.
2. Enter a unique Team Name (faker-js).
3. Click **Cancel**.

**Expected Results:**

- Dialog closes.
- Team name does not appear in the Teams list.
- Success toast is not shown.

### Whitespace-only team name (TM-04)

**Steps:**

1. Open **Create New Team**.
2. Enter only spaces in Team name.
3. Click **Save**.

**Expected Results:**

- Dialog remains open.
- Team is not created (no success toast).

### Duplicate team name (TM-05)

**Steps:**

1. Note an existing team name from the Teams list.
2. Open **Create New Team** and enter that same name.
3. Click **Save**.

**Expected Results:**

- Dialog remains open.
- Error toast: **Team with this name already exists in this organization**.
- Team row count for that name does not increase.

### Invalid logo file type (TM-06)

**Steps:**

1. Open **Create New Team**.
2. Upload a non-image file (e.g. `.txt`).

**Expected Results:**

- Dialog remains open.
- Error toast indicates invalid file / allowed image types.

### Oversized logo (TM-07)

**Steps:**

1. Open **Create New Team**.
2. Upload a file larger than **5MB**.

**Expected Results:**

- Dialog remains open.
- Error toast: **File size must be less than 5MB**.

## Out of Scope

- Valid logo upload happy path
- Extremely long team name validation
- Coach assignment
- Roster management / player invites
- Program creation (covered by PC-01)
