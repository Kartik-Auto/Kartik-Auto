# Division Creation — Test Plan

**Seed:** `tests/seed.spec.ts`  
**Depends on:** Published program in **Upcoming** status (`ProgramPage.createAndPublishProgramEndToEnd`)

## Division Creation Happy Path

**Preconditions:** Valid organiser credentials; program created and published.

**Steps:**

1. Log in and create + publish a program (reuse Program Creation flow).
2. Verify program status is **Upcoming**.
3. Click **Add Divisions** on the Upcoming program.
4. Enter Division Name (faker) and Capacity.
5. Verify program-level fields are prefilled (Registration Fee, Registration Start/End dates).
6. Save the division.
7. Open **Divisions** tab and verify the division appears in **Draft** status.
8. Open the division and review tabs: Overview → Payment Plans (skip) → Player Eligibility → Locations → Waivers.
9. Verify inherited program data is prefilled. On **Locations** and **Waivers**, skip adding when at least one item is already attached (verify it is visible); otherwise attach via **Select Location** / **Select Waiver**.
10. Validate data persists when switching tabs.
11. Verify **Publish** is enabled.
12. Publish the division, confirm the dialog, and verify status changes **Draft → Upcoming**.

**Verifications:**

- Create dialog prefilled registration fee and dates match program data.
- Division card shows **Draft** before publish.
- Overview shows inherited registration fee, dates, gender, and level.
- Existing inherited location/waiver is detected and left unchanged (no duplicate associations).
- Location and waiver attach successfully only when none are present on the division.
- Division status becomes **Upcoming** after publish.
