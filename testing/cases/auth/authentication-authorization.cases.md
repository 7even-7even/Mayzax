# Mayzax Authentication Testing Cases - Authorization

This file documents the detailed test cases for Role-Based Access Control (RBAC) and role restrictions.

---

### Test Case ID: AUTH-ROLE-001
Scenario ID: AUTH-SC-16
Module: Authentication
Title: Verify Admin role access to restricted administrative endpoints
Priority: Critical
Severity: Critical
Type: Positive
Platform: Web

Preconditions:
- User with role `ADMIN` is authenticated.

Test Data:
Email: `admin@mayzax.com`
Route: `GET /api/v1/analytics/summary` (Requires Admin or Team Leader)

Steps:
1. Log in as Admin.
2. Send `GET /api/v1/analytics/summary` using Admin credentials.

Expected Result:
- Status Code: `200 OK`.
- Access granted; analytics summary returned.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: AUTH-ROLE-002
Scenario ID: AUTH-SC-17
Module: Authentication
Title: Verify Recruiter role access blocked on Admin/TL endpoints
Priority: Critical
Severity: Critical
Type: Negative
Platform: Web

Preconditions:
- User with role `RECRUITER` is authenticated.

Test Data:
Email: `recruiter@mayzax.com`
Route: `GET /api/v1/analytics/summary` (Requires Admin or Team Leader)

Steps:
1. Log in as Recruiter.
2. Send `GET /api/v1/analytics/summary` using Recruiter credentials.

Expected Result:
- Status Code: `403 Forbidden`.
- Response JSON:
   ```json
   {
     "success": false,
     "error": {
       "message": "You do not have permission to perform this action"
     }
   }
   ```

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: AUTH-ROLE-003
Scenario ID: AUTH-SC-16
Module: Authentication
Title: Verify Client role access to client-specific endpoints
Priority: High
Severity: High
Type: Positive
Platform: Web

Preconditions:
- User with role `CLIENT` is authenticated.

Test Data:
Email: `client@mayzax.com`
Route: `GET /api/v1/profile-changes`

Steps:
1. Log in as Client.
2. Send request to endpoints permitted for Clients.

Expected Result:
- Status Code: `200 OK` (or specific success response depending on implementation).

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: AUTH-ROLE-004
Scenario ID: AUTH-SC-17
Module: Authentication
Title: Privilege Escalation Attempt (Modifying JWT Role Claim)
Priority: Critical
Severity: Critical
Type: Negative
Platform: Web

Preconditions:
- Recruiter login token exists.

Test Data:
Tampered Token: Decode recruiter token, modify the `role` field from `"RECRUITER"` to `"ADMIN"`, resign (or don't sign) and send.

Steps:
1. Send request `GET /api/v1/analytics/summary` passing the tampered token.

Expected Result:
- Status Code: `401 Unauthorized`.
- Backend verification fails because the signature is invalid due to key mismatches.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:
Tests signature integrity checking of JWTs on role configuration.
