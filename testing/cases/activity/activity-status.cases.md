# Mayzax Login Hours & Activity Testing Cases - Status Changes

This file documents the detailed test cases for status changes, log updates, and role-based validations.

---

### Test Case ID: ACT-STATUS-001
Scenario ID: ACT-SC-01
Module: Activity
Title: Verify login event initializes ACTIVE state
Priority: Critical
Severity: Critical
Type: Positive
Platform: Web

Preconditions:
- Trackable user exists (e.g. Recruiter role).

Steps:
1. Trigger `handleLoginEvent` for a user with role `RECRUITER`.
2. Retrieve current status using `GET /api/v1/activity/current`.

Expected Result:
- Status Code: `200 OK`.
- Response contains `{ status: "ACTIVE" }`.
- Database Verification: A new `ActivityLog` record is created with `status: "ACTIVE"`, `startedAt` set to login time, and `endedAt = null`.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: ACT-STATUS-002
Scenario ID: ACT-SC-02
Module: Activity
Title: Change status from ACTIVE to SHORT_BREAK
Priority: Critical
Severity: High
Type: Positive
Platform: Web

Preconditions:
- User is currently in `ACTIVE` status.

Test Data:
Body: `{"status": "SHORT_BREAK", "optionalNote": "Tea break"}`

Steps:
1. Send `POST /api/v1/activity/status` with headers:
   * `X-Client-Type: web`
2. Pass request body:
   ```json
   {
     "status": "SHORT_BREAK",
     "optionalNote": "Tea break"
   }
   ```

Expected Result:
- Status Code: `200 OK`.
- Response contains `{ status: "SHORT_BREAK", optionalNote: "Tea break" }`.
- Database Verification:
  * The previous `ACTIVE` log has `endedAt` timestamp updated to the change time.
  * A new `ActivityLog` is created with `status: "SHORT_BREAK"`, `optionalNote: "Tea break"`, and `endedAt = null`.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: ACT-STATUS-003
Scenario ID: ACT-SC-03
Module: Activity
Title: Transition status to OFFLINE on logout
Priority: High
Severity: High
Type: Positive
Platform: Web

Preconditions:
- User is currently in `ACTIVE` or break status.

Steps:
1. Trigger `handleLogoutEvent` for the user.

Expected Result:
- Database Verification:
  * The active log is closed with `endedAt = now`.
  * A new `ActivityLog` is created with `status: "OFFLINE"`, `startedAt = now`, and `endedAt = now`.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: ACT-STATUS-004
Scenario ID: ACT-SC-04
Module: Activity
Title: Prevent status tracking for untracked roles (e.g. ADMIN)
Priority: High
Severity: Medium
Type: Negative
Platform: Web

Preconditions:
- Authenticated user has role `ADMIN`.

Steps:
1. Send `POST /api/v1/activity/status` with body:
   ```json
   {
     "status": "SHORT_BREAK"
   }
   ```

Expected Result:
- Status Code: `400 Bad Request`.
- Response JSON contains:
   ```json
   {
     "success": false,
     "error": {
       "message": "Activity tracking is only applicable to Recruiters and Team Leaders."
     }
   }
   ```

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:
