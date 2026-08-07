# Program Creation — Test Plan

**Seed:** `tests/seed.spec.ts`

## End-to-End — Program Creation Happy Path

**Preconditions:** Valid organiser credentials in `tests/config.json`.

**Steps:**

1. Log in with valid credentials and leave the login page.
2. Open the Programs list from the main navigation.
3. Click **Create New Program** and verify the create form loads at `/programs/create`.
4. Fill all required fields with faker-generated data:
   - Program name
   - Description
   - Registration fee (per team)
   - Maximum number of teams
   - Tournament start date (first enabled future day)
   - Tournament end date (enabled day strictly after start date)
   - Season (first available option)
5. Click **Save & Continue** and wait for navigation away from the create URL.
6. Verify the new program appears on the Programs list.
7. Open the program from the list and verify the Overview tab shows the created program name.
8. On Overview, edit **Tournament Details** (gender, level, days of week) and **Registration Setup** (dates/times; skip Early Bird and Late Fee).
9. Open **Payment Plans** and skip adding a plan.
10. On **Player Eligibility**, set age range, select grade(s), set as-of date, and enable age/grade verification.
11. On **Locations**, attach an existing location via **Select Location**.
12. On **Waivers**, attach an existing waiver via **Select Waiver**.
13. Verify **Publish** is enabled, confirm the publish dialog, and verify status changes from **Draft** to **Upcoming**.

**Verifications:**

- User is authenticated (not on `/login`).
- Programs list heading is visible after navigation.
- Create form heading is visible before submit.
- No required-date validation errors remain visible before save.
- Save button is enabled before click.
- URL no longer matches `/programs/create` after save.
- Program name link is visible on the Programs list.
- Overview tab is visible on the program detail page.
- Program name is visible on the overview page.
