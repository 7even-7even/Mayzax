# Mayzax Profile Changes Testing Cases - Plan Upgrades

This file documents the detailed test cases for plan upgrades, validation hierarchy, and approval payment installments generation.

---

### Test Case ID: PR-UPG-001
Scenario ID: PR-CHG-04
Module: Profile Changes
Title: Reject plan downgrade request
Priority: High
Severity: Medium
Type: Negative
Platform: Web

Preconditions:
- User's current planSelected = `"Gold"`.

Steps:
1. Send `POST /api/v1/profile-changes/profiles/:id/upgrade-plan` with targetPlan = `"Basic"`.

Expected Result:
- Status Code: `400 Bad Request`.
- Response contains message: `"Target plan must be higher than current plan"`.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: PR-UPG-002
Scenario ID: PR-CHG-05
Module: Profile Changes
Title: Approve plan upgrade generates price difference payment installment
Priority: Critical
Severity: High
Type: Positive
Platform: Web

Preconditions:
- Profile planSelected = `"Basic"` (Price: 1500).
- Profile has 1 PAID client payment of amount 1500.
- Pending change request exists to upgrade plan to `"Premium"` (Price: 3500).

Steps:
1. Approve change request via `POST /api/v1/profile-changes/:id/approve` as Admin.

Expected Result:
- Status Code: `200 OK`.
- Database Verification:
  * Profile `planSelected` updated to `"Premium"`.
  * Profile `amountPaid` updated to `3500`.
  * A new `ClientPayment` record is created with:
    - `amount` = `2000` (Price difference: 3500 - 1500).
    - `status` = `"PENDING"`.
    - `installmentNo` = `2`.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:
Tests complex upgrade workflows including financial calculations and ledger migration.
