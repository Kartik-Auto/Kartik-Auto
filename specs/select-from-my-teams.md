# Select from My Teams — Test Plan

**Seed:** `tests/seed.spec.ts`  
**Depends on:** An existing Program; at least one team available under **My Teams**

## Application Overview

On a Program **Team & Roster** tab, organizers can add an existing organization team via **Select from My Teams**. This opens a dialog with a **Select Team** dropdown and optional coach, then **Submit**.

### Key UI

| Element | Label / role |
|---------|----------------|
| Tab | `Team & Roster` |
| Entry | `Add` → `Select from My Teams` (or direct CTA when empty) |
| Dialog | `Select from My Teams` |
| Dropdown | Combobox starting as `Select Team` |
| Submit | `Submit` |
| Success toast | `Team has been created` |

## Happy Path — Add existing team (STM-01)

**Preconditions:**

- Valid organiser credentials in `tests/config.json`.
- Existing Program (Upcoming/Active preferred).
- At least one reasonably short team name available in My Teams.

**Steps:**

1. Log in and open an existing Program.
2. Navigate to **Team & Roster**.
3. Open **Add** → **Select from My Teams**.
4. Open the **Select Team** dropdown.
5. Choose an existing team with a clear, short name (avoid excessively long names; skip teams already on the program).
6. Click **Submit**.

**Expected Results:**

- Dialog closes.
- Success toast **Team has been created** is shown.
- Selected team name appears exactly once in the Teams list.

## No duplicate add (STM-02)

**Preconditions:** Team from STM-01 (or any team already on the program) is listed.

**Steps:**

1. Open **Select from My Teams** again.
2. Attempt to add the same team again if it still appears in the dropdown.
3. If the team is no longer listed in the dropdown, treat that as duplicate prevention.

**Expected Results:**

- Teams list does not gain an extra row for the same team name.
- If re-submit is possible, create does not succeed as a second distinct listing (row count for that name stays the same).

## Negative Cases

### Submit disabled with no selection (STM-03)

**Steps:**

1. Open **Select from My Teams**.
2. Do not choose a team.

**Expected Results:**

- **Submit** remains disabled.
- Dialog stays open.
- No success toast.

### Cancel after selecting a team (STM-04)

**Steps:**

1. Open **Select from My Teams**.
2. Choose a short team name not already on the program.
3. Click **Cancel**.

**Expected Results:**

- Dialog closes.
- Selected team is not added to the Teams list.
- No success toast.
