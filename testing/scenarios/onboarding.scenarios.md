# Mayzax Client Onboarding Testing Scenarios

This document outlines the testing scenarios for the Self-Service Client Onboarding, duplicate detection, Admin approval workflow, and payment record generation in the Mayzax ATS.

---

## 1. Discovered Onboarding Architecture

```text
External Client (Public Endpoint)
  ↓
Submit Onboarding Application (`POST /api/v1/onboarding`):
- No auth required — public self-registration.
- Duplicate guard (layer 1): Blocks if active ClientProfile already exists with same email/phone.
- Duplicate guard (layer 2): Blocks if a PENDING onboarding application already exists with same email/phone.
- Creates a new `ClientOnboarding` record with status = PENDING.
  ↓
Admin Review (`GET /api/v1/onboarding`)
- Restriction: Admin only.
- Returns paginated list of onboarding applications, filterable by status.
  ↓
Approve Onboarding (`PATCH /api/v1/onboarding/:id/approve`):
- Restriction: Admin only.
- Blocks re-approval of already APPROVED/REJECTED applications.
- Atomic actions:
  * Creates `ClientProfile` from onboarding data.
  * Payment resolution:
    - Full payment (amountPaid >= plan price): Creates 1 PAID ClientPayment.
    - Partial payment (amountPaid < plan price): Creates 1 PAID + 1 PENDING installment ClientPayment.
  * Creates `User` account with CLIENT role and default password.
  * Updates `ClientOnboarding` status to APPROVED.
  ↓
Reject Onboarding (`PATCH /api/v1/onboarding/:id/reject`):
- Restriction: Admin only.
- Blocks re-rejection of non-PENDING applications.
- Updates `ClientOnboarding` status to REJECTED.
```

---

## 2. High-Level Test Scenarios

### A. Application Submission Scenarios
* **ONB-SC-01:** New applicant submits onboarding form successfully.
* **ONB-SC-02:** Block submission if active ClientProfile with same email already exists.
* **ONB-SC-03:** Block submission if a PENDING onboarding application with same email already exists.

### B. Admin Approval Scenarios
* **ONB-SC-04:** Admin approves onboarding — creates ClientProfile, User, and payment records.
* **ONB-SC-05:** Admin approves partial payment — generates PAID + PENDING installment records.
* **ONB-SC-06:** Block re-approving an already APPROVED onboarding application.

### C. Admin Rejection Scenarios
* **ONB-SC-07:** Admin rejects a pending onboarding application.
* **ONB-SC-08:** Block re-rejecting an already REJECTED application.
