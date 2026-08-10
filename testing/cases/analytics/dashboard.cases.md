# Mayzax Analytics Testing Cases - Dashboard Overview

This file documents the test cases for Admin and Team Leader recruiter rollup reports and breakdown details.

---

### Test Case ID: ANA-DASH-001
Scenario ID: ANA-SC-03
Module: Analytics
Title: Admin views full dashboard overview
Priority: Critical
Severity: High
Type: Positive
Platform: Web

Preconditions:
- Multiple recruiters exist across different teams.

Steps:
1. Send `GET /api/v1/analytics/dashboard` authenticated as Admin.

Expected Result:
- Status Code: `200 OK`.
- Response contains rollups (name, email, totalApplications, assignedProfiles, lastActiveAt) for ALL active recruiters in the system.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: ANA-DASH-002
Scenario ID: ANA-SC-04
Module: Analytics
Title: Team Leader views team-scoped dashboard overview
Priority: Critical
Severity: High
Type: Positive
Platform: Web

Preconditions:
- Team Leader A manages Recruiter A.
- Recruiter B is managed by Team Leader B.

Steps:
1. Send `GET /api/v1/analytics/dashboard` authenticated as Team Leader A.

Expected Result:
- Status Code: `200 OK`.
- Response items only list Recruiter A (Recruiter B is omitted).

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: ANA-DASH-003
Scenario ID: ANA-SC-05
Module: Analytics
Title: Block Team Leader from viewing unmanaged recruiter breakdown
Priority: High
Severity: High
Type: Negative
Platform: Web

Preconditions:
- Team Leader A manages Recruiter A.
- Recruiter B is managed by Team Leader B.

Steps:
1. Send `GET /api/v1/analytics/dashboard/:recruiter_b_id/breakdown` authenticated as Team Leader A.

Expected Result:
- Status Code: `403 Forbidden`.
- Response JSON:
   ```json
   {
     "success": false,
     "error": {
       "message": "You can only access recruiter stats for your own team"
     }
   }
   ```

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:
