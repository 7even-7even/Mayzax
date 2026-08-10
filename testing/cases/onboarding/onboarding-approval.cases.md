# Mayzax Onboarding Testing Cases - Admin Approval

This file documents the detailed test cases for Admin approval workflows, payment record generation, and blocking double-approvals.

---

### Test Case ID: ONB-APR-001
Scenario ID: ONB-SC-04
Module: Onboarding
Title: Admin approves onboarding — creates ClientProfile, User, and full payment record
Priority: Critical
Severity: Critical
Type: Positive
Platform: Web

Preconditions:
- PENDING `ClientOnboarding` exists with `planSelected = "Gold"`, `amountPaid = 2500`.

Steps:
1. Send `PATCH /api/v1/onboarding/:id/approve` as Admin.

Expected Result:
- Status Code: `200 OK`.
- Database Verification:
  * A new `ClientProfile` is created with matching candidate details.
  * A new `User` is created with `role = CLIENT` and `clientProfileId` pointing to the new profile.
  * 1 `ClientPayment` record is created with `status = "PAID"`, `amount = 2500`, `installmentNo = 1`.
  * The `ClientOnboarding` record's `status` is updated to `"APPROVED"`.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: ONB-APR-002
Scenario ID: ONB-SC-05
Module: Onboarding
Title: Partial payment approval generates PAID + PENDING installment records
Priority: Critical
Severity: High
Type: Positive
Platform: Web

Preconditions:
- PENDING `ClientOnboarding` exists with `planSelected = "Gold"` (price = 2500), `amountPaid = 500`.

Steps:
1. Send `PATCH /api/v1/onboarding/:id/approve` as Admin.

Expected Result:
- Status Code: `200 OK`.
- Database Verification:
  * `ClientPayment` installment 1: `status = "PAID"`, `amount = 500`.
  * `ClientPayment` installment 2: `status = "PENDING"`, `amount = 2000` (remaining balance).
  * Both payments linked to the newly created `ClientProfile`.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: ONB-APR-003
Scenario ID: ONB-SC-06
Module: Onboarding
Title: Block re-approving an already APPROVED onboarding application
Priority: High
Severity: Medium
Type: Negative
Platform: Web

Preconditions:
- `ClientOnboarding` with status `"APPROVED"` exists.

Steps:
1. Send `PATCH /api/v1/onboarding/:id/approve` as Admin.

Expected Result:
- Status Code: `400 Bad Request`.
- Response contains message indicating application is already `APPROVED`.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: ONB-REJ-001
Scenario ID: ONB-SC-07
Module: Onboarding
Title: Admin rejects a pending onboarding application
Priority: High
Severity: Medium
Type: Positive
Platform: Web

Preconditions:
- PENDING `ClientOnboarding` exists.

Steps:
1. Send `PATCH /api/v1/onboarding/:id/reject` as Admin.

Expected Result:
- Status Code: `200 OK`.
- Database Verification:
  * `ClientOnboarding.status` is updated to `"REJECTED"`.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:
