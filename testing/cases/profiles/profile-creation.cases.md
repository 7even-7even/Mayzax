# Mayzax Profiles Testing Cases - Creation

This file documents the detailed test cases for client profile creations, duplicate checks, and validation boundaries.

---

### Test Case ID: PROF-CRE-001
Scenario ID: PROF-SC-01
Module: Profiles
Title: Admin creates a new client profile successfully
Priority: Critical
Severity: Critical
Type: Positive
Platform: Web

Preconditions:
- Assigned recruiter is active.

Test Data:
Body:
```json
{
  "candidateName": "John Candidate",
  "email": "john.candidate@mayzax.com",
  "phone": "+1234567890",
  "technology": "React/Node",
  "assignedRecruiterId": "recruiter-uuid-123"
}
```

Steps:
1. Send `POST /api/v1/profiles` authenticated as Admin.

Expected Result:
- Status Code: `200 OK` (or `201 Created`).
- Database Verification:
  * A new `ClientProfile` row is created with matching email and phone.
  * Audit log is written with action `PROFILE_CREATED`.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: PROF-CRE-002
Scenario ID: PROF-SC-02
Module: Profiles
Title: Block profile creation if duplicate email or phone is provided
Priority: Critical
Severity: Critical
Type: Negative
Platform: Web

Preconditions:
- Database contains a profile with email `"john.candidate@mayzax.com"`.

Test Data:
Body:
```json
{
  "candidateName": "Duplicate Candidate",
  "email": "john.candidate@mayzax.com",
  "phone": "+1234567890",
  "technology": "React/Node",
  "assignedRecruiterId": "recruiter-uuid-123"
}
```

Steps:
1. Send `POST /api/v1/profiles` as Admin.

Expected Result:
- Status Code: `400 Bad Request` (or Conflict).
- Response JSON details:
   ```json
   {
     "success": false,
     "error": {
       "message": "Existing Client with same Email/Phone Number"
     }
   }
   ```

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: PROF-CRE-003
Scenario ID: PROF-SC-03
Module: Profiles
Title: Block recruiter role from creating client profiles
Priority: High
Severity: High
Type: Negative
Platform: Web

Steps:
1. Send `POST /api/v1/profiles` authenticated as Recruiter.

Expected Result:
- Status Code: `403 Forbidden`.
- Response indicates only admins and team leaders can perform this action.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:
