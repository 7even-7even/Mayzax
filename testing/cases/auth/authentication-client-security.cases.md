# Mayzax Authentication Testing Cases - Client Security

This file documents the detailed test cases for client-type restrictions (`X-Client-Type`) and mobile client blocks.

---

### Test Case ID: AUTH-CLIENT-001
Scenario ID: AUTH-SC-15
Module: Authentication
Title: Mobile client attempting mutating attendance actions
Priority: Critical
Severity: Critical
Type: Negative
Platform: Mobile

Preconditions:
- Active user logged in via Mobile.
- Valid mobile access token available.

Test Data:
Header: `Authorization: Bearer <mobile_access_token>`
Route: `POST /api/v1/activity/clock-in` or similar mutating routes

Steps:
1. Send mutating request to a protected activity/attendance endpoint.

Expected Result:
- Status Code: `403 Forbidden`.
- Response JSON:
   ```json
   {
     "success": false,
     "error": {
       "message": "This action is not available on the mobile companion app. Please use the desktop CMS."
     }
   }
   ```
- Database Verification: No new attendance state or log row is created in `activity_logs` or `attendance_days` tables.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:
Tests the `disallowMobile` middleware restriction on mutating endpoints.

---

### Test Case ID: AUTH-CLIENT-002
Scenario ID: AUTH-SC-18
Module: Authentication
Title: Default ClientType mapping when X-Client-Type is missing
Priority: High
Severity: Medium
Type: Positive
Platform: Web

Preconditions:
- Active user exists.

Test Data:
No `X-Client-Type` header sent.

Steps:
1. Send `POST /api/v1/auth/login` without `X-Client-Type` header.

Expected Result:
- Status Code: `200 OK`.
- Token contains `clientType: "WEB"` (the safe default returned by `resolveClientType`).
- Attendance login events are triggered in database logs.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: AUTH-CLIENT-003
Scenario ID: AUTH-SC-18
Module: Authentication
Title: Invalid X-Client-Type header handling
Priority: High
Severity: Medium
Type: Negative
Platform: Web

Preconditions:
- Active user exists.

Test Data:
Header: `X-Client-Type: INVALID_TYPE`

Steps:
1. Send `POST /api/v1/auth/login` with `X-Client-Type: INVALID_TYPE`.

Expected Result:
- Status Code: `200 OK`.
- System resolves client type to `"WEB"` (default fallback) and proceeds with normal web login.
- Token issued contains `clientType: "WEB"`.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:
Tests robustness of client type resolution.
