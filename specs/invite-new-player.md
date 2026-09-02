# Invite New Player — Test Plan

**Seed:** `tests/seed.spec.ts`  
**Depends on:** An existing Program/Division that exposes **Team & Roster**

## Application Overview

Organizers invite a player onto an **existing** team roster by guardian email. When the guardian is unknown, the UI offers **Invite new player linked to this guardian**, which opens a player form (side dialog) prefilled with that email. The test scans the program list and picks the first program whose Team & Roster already lists a team, so nothing is created and the result is verifiable manually.

### Key UI

| Element | Label / role |
|---------|----------------|
| Team list | Team & Roster table; team name cell opens the team |
| Empty roster CTA | `Invite New Player` |
| Populated roster | `Edit Roster` then `Invite New Player` |
| Lookup heading | `Invite New Player` |
| Guardian email | `Enter guardian email ID` |
| No match | Heading `No Matches Found` |
| Linked invite | `Invite new player linked to this guardian` |
| Player form | `dialog` with First name, Last name, Guardian email, Number, Position, Jersey # |
| Submit | `Invite Player` |
| Roster row | Player name, guardian email, formatted phone, jersey, position, status `Invited` |

## Happy Path — INV-01 Invite new player for unknown guardian

**Preconditions:**

- Valid organiser credentials.
- At least one existing program (or its first division) already has a team on **Team & Roster**.

**Steps:**

1. Log in and walk the program list until a program's **Team & Roster** lists at least one team.
2. Open the first existing team on that program.
3. On the roster (empty state, or **Edit Roster** if players already exist), click **Invite New Player**.
4. Enter a randomly generated guardian email via faker-js (`firstname` + 2-digit number, e.g. `andrew21@yopmail.com`).
5. Wait **1 second** for guardian lookup.
6. Verify the guardian does **not** already exist: **No Matches Found** and **Invite new player linked to this guardian** are visible.
7. Click that button and verify the player form dialog/drawer opens.
8. Fill:
   - First Name — faker-js
   - Last Name — faker-js
   - Email — assert prefilled with the guardian email (disabled Guardian email field)
   - Contact Number — valid 10-digit number
   - Position — select a valid option from the dropdown
   - Jersey Number — random integer 0–999
9. Click **Invite Player**.

**Expected Results:**

- Invite succeeds: the invite API returns 200 or 201 (Stage and UAT), the form closes, and the player is not blocked by an error toast.
- The invite JSON shape matches the env snapshot (`invite-new-player-stage` / `invite-new-player-uat`); ids, emails, names, and timestamps are redacted.
- The new player appears on the team roster **exactly once**.
- Row shows first + last name, guardian email, contact number, jersey number, selected position, and **Invited** status.

## Out of Scope

- Guardian that already exists / existing linked players
- Bulk upload, bulk copy-paste, Select Existing Roster
- Invalid email / missing required fields
