# Existing Parent Login and Add Child Profile

**Seed:** `tests/seed.spec.ts`  
**Credentials:** `parentUsername` / `parentPassword` in `tests/config.json`

## Add Child Profile Happy Path

**Preconditions:** Existing parent account on stage.

**Steps:**

1. Log in with parent credentials.
2. Verify Parent Dashboard loads with **Child Profiles**.
3. Click **Add Child**; the Add Child Profile form opens in a right-side drawer (no page navigation).
4. Enter Legal First Name and Legal Last Name (faker).
5. Preferred Name:
   - When checkbox is checked, verify Preferred Name auto-populates with Legal First Name exactly.
   - When unchecked, enter a custom Preferred Name (faker-driven path per run).
6. Select Date of Birth, Gender, School Name, and Grade.
7. Verify Sport is prefilled (Lacrosse).
8. Select Position.
9. Click **Add Child**.
10. Verify child profile is created (API 201).
11. Verify the child appears on the Parent Dashboard list.
12. Open the child profile and validate saved details.

**Verifications:**

- Preferred Name behavior matches checkbox state.
- Sport is prefilled and read-only.
- Dashboard lists `Legal First Last` with grade.
- Profile page shows first name, last name, preferred name, DOB, gender, school, grade, sport, and position.
