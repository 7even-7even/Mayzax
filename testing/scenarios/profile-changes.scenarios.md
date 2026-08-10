# Mayzax Profile Change Requests Testing Scenarios

This document outlines the testing scenarios for Client Profile Change Requests, plan upgrade validations, approval migrations, and payment installment generation in the Mayzax ATS.

---

## 1. Discovered Profile Changes Architecture

```text
Client User (Linked to ClientProfile)
  ↓
Submit Details Change Request (`POST /api/v1/profile-changes/profiles/:profileId`):
- Restriction: User `clientProfileId` must match the URL `:profileId`.
- Sanitization: Only copies allowed fields (name, phone, skills, visaStatus, location). Unallowed fields are stripped.
- Deduplication: If a pending request already exists, updates it instead of creating duplicates.
  ↓
Submit Plan Upgrade Request (`POST /api/v1/profile-changes/profiles/:profileId/upgrade-plan`):
- Hierarchy validation: Target plan must be higher than current selected plan (Basic < Gold < Premium).
- Deduplication: Rejects if an upgrade request is already pending.
  ↓
Approve Request (`POST /api/v1/profile-changes/:id/approve`):
- Restriction: Admin role only.
- Actions:
  * Details Update: Migrates approved fields into the live profile record.
  * Plan Upgrade: Adjusts client's selected plan, computes pricing difference, and automatically creates a new pending installment `ClientPayment` record.
```

---

## 2. High-Level Test Scenarios

### A. Details Change Submission Scenarios
* **PR-CHG-01:** Submit change request successfully with allowed fields (stripping unallowed fields).
* **PR-CHG-02:** Prevent users from submitting change requests for other profiles.

### B. Plan Upgrade Scenarios
* **PR-CHG-03:** Request plan upgrade successfully (Basic -> Premium).
* **PR-CHG-04:** Reject downgrade requests (Premium -> Gold).
* **PR-CHG-05:** Approve plan upgrade and generate pending installment payment representing the price difference.
