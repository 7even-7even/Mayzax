# Mayzax Recruiter & User Management Testing Cases

This document details the test cases for user creation, profile updates, status toggling, soft depletions, team assignments, and statistical aggregation.

---

### Test Case ID: REC-MGMT-001
Module: Recruiter Management
Title: Admin creates a new recruiter successfully
Priority: Critical
Severity: Critical
Type: Positive
Platform: Web

Preconditions:
- Authenticated user has role `ADMIN`.
- Email is not already registered.

Test Data:
Body:
```json
{
  "name": "Jane Doe",
  "email": "jane.doe@mayzax.com",
  "password": "Password123!",
  "role": "RECRUITER"
}
```

Steps:
1. Send `POST /api/v1/recruiters` with Admin authentication token.

Expected Result:
- Status Code: `201 Created` (or `200 OK` depending on controller mapping, check schema).
- Response contains `{ success: true, data: { id, name, email, role, isActive: true } }`.
- Password hash is NOT exposed in the JSON response.
- Database Verification:
  * A new user is created in `users` table.
  * An audit log record with action `RECRUITER_CREATED` is created in `audit_logs`.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: REC-MGMT-002
Module: Recruiter Management
Title: Admin deactivates a recruiter account
Priority: High
Severity: High
Type: Positive
Platform: Web

Preconditions:
- Active recruiter account exists in database.

Test Data:
Body: `{"isActive": false}`

Steps:
1. Send `PATCH /api/v1/recruiters/:id/status` with Admin credentials.

Expected Result:
- Status Code: `200 OK`.
- Database Verification:
  * `isActive` set to `false` for the recruiter.
  * Audit log created with action `RECRUITER_DEACTIVATED`.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: REC-MGMT-003
Module: Recruiter Management
Title: Admin deactivating own account is blocked
Priority: High
Severity: High
Type: Negative
Platform: Web

Preconditions:
- Admin is logged in.

Steps:
1. Send `PATCH /api/v1/recruiters/:my_id/status` passing `isActive = false` where `:my_id` is the current Admin's user ID.

Expected Result:
- Status Code: `400 Bad Request`.
- Response JSON:
   ```json
   {
     "success": false,
     "error": {
       "message": "You cannot deactivate your own account"
     }
   }
   ```

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: REC-MGMT-004
Module: Recruiter Management
Title: Recruiter role demotion handles team cleanups
Priority: Critical
Severity: Critical
Type: Positive
Platform: Web

Preconditions:
- User is currently `TEAM_LEADER` and manages recruiters (they have `createdById = user.id`).

Steps:
1. Admin demotes the `TEAM_LEADER` to `RECRUITER` by sending `PATCH /api/v1/recruiters/:id` with body:
   ```json
   { "role": "RECRUITER" }
   ```

Expected Result:
- Status Code: `200 OK`.
- Database Verification:
  * User role is updated to `RECRUITER`.
  * `teamName` for this user is set to `null`.
  * All recruiters previously managed by this team leader have their `createdById` set to `null` (unassigned).

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: REC-MGMT-005
Module: Recruiter Management
Title: Soft delete recruiter cleanups assignments
Priority: Critical
Severity: Critical
Type: Positive
Platform: Web

Preconditions:
- Recruiter has active client profiles assigned.

Steps:
1. Admin deletes recruiter via `DELETE /api/v1/recruiters/:id`.

Expected Result:
- Status Code: `200 OK`.
- Database Verification:
  * User record has `deletedAt` set to current timestamp.
  * All `ClientProfile` records assigned to this recruiter have their `assignedRecruiterId` set to `null` to enable reassignment.
  * All matching rows in `client_profile_assignments` table are deleted.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: REC-MGMT-006
Module: Recruiter Management
Title: Edit recruiter details (name, email)
Priority: High
Severity: Medium
Type: Positive
Platform: Web

Preconditions:
- Active recruiter account exists.

Test Data:
Body:
```json
{
  "name": "Jane Smith",
  "email": "jane.smith@mayzax.com"
}
```

Steps:
1. Send `PATCH /api/v1/recruiters/:id` with updated parameters.

Expected Result:
- Status Code: `200 OK`.
- Database Verification: Recruiter record's `name` and `email` fields are updated. Audit log created with action `RECRUITER_UPDATED`.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: REC-MGMT-007
Module: Recruiter Management
Title: Team Leader updates team name
Priority: Medium
Severity: Low
Type: Positive
Platform: Web

Preconditions:
- Authenticated user has role `TEAM_LEADER`.

Test Data:
Body: `{"teamName": "Alpha Recruiters"}`

Steps:
1. Send `PATCH /api/v1/recruiters/me/team-name` with Team Leader authentication.

Expected Result:
- Status Code: `200 OK`.
- Database Verification: User's `teamName` field is updated to `"Alpha Recruiters"`.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: REC-MGMT-008
Module: Recruiter Management
Title: Team Leader access blocked viewing stats of unmanaged recruiter
Priority: High
Severity: High
Type: Negative
Platform: Web

Preconditions:
- Team Leader A manages Recruiter A (`createdById = TL_A.id`).
- Recruiter B is managed by Team Leader B.

Steps:
1. Send request `GET /api/v1/recruiters/:recruiter_b_id/stats` authenticated as Team Leader A.

Expected Result:
- Status Code: `403 Forbidden`.
- Response JSON:
   ```json
   {
     "success": false,
     "error": {
       "message": "You can only view stats for recruiters managed by your team"
     }
   }
   ```

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

