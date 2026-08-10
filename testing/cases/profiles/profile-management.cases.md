# Mayzax Profiles Testing Cases - Management

This file documents the detailed test cases for profile updates, recruiter edit blocks, and candidate name protections.

---

### Test Case ID: PROF-MGMT-001
Scenario ID: PROF-SC-05
Module: Profiles
Title: Block recruiter from editing unassigned client profiles
Priority: High
Severity: High
Type: Negative
Platform: Web

Preconditions:
- Profile B is assigned to Recruiter B.
- Requesting user is Recruiter A.

Steps:
1. Send `PATCH /api/v1/profiles/:profile_b_id` authenticated as Recruiter A.

Expected Result:
- Status Code: `403 Forbidden`.
- Response contains message: `"You can only edit profiles assigned to you"`.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: PROF-MGMT-002
Scenario ID: PROF-SC-06
Module: Profiles
Title: Block recruiter from editing candidate name
Priority: Critical
Severity: High
Type: Negative
Platform: Web

Preconditions:
- Profile A is assigned to Recruiter A.

Test Data:
Body: `{"candidateName": "Hacked Name"}`

Steps:
1. Send `PATCH /api/v1/profiles/:profile_a_id` authenticated as Recruiter A.

Expected Result:
- Status Code: `403 Forbidden`.
- Response contains message: `"Recruiters are not allowed to edit candidate name"`.
- Database Verification: Candidate name is NOT modified in the database.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:
Checks business constraints where recruiters are blocked from altering profile identity attributes.
