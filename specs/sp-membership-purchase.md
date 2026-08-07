# SP Membership Purchase — Newly Created Child

**Seed:** `tests/seed.spec.ts`  
**Depends on:** Existing parent account from `tests/config.json`

## Happy Path

1. Log in as parent.
2. Create a new child profile using the Add Child flow.
3. Return to dashboard and verify child card shows **Free** status.
4. Locate the created child card and click **Purchase Now**.
5. In payment modal, fill:
   - Cardholder Name (derived from logged-in parent display)
   - Card Number `4242 4242 4242 4242`
   - `MM / YY`
   - `CVC`
   - `ZIP`
6. Accept Terms & Conditions and click **Pay**.
7. Verify payment success confirmation appears.
8. Refresh/poll dashboard and verify child status transitions **Free → Premium**.
9. Verify **Purchase Now** is no longer shown on the upgraded child card.

