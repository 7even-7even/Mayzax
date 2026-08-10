# Mayzax Analytics Testing Cases - Job Portals

This file documents the test cases for job portal sub-statistics, date queries, and role-based data isolation.

---

### Test Case ID: ANA-PORTAL-001
Scenario ID: ANA-SC-01
Module: Analytics
Title: Recruiter retrieves self-scoped job portal analytics
Priority: Critical
Severity: High
Type: Positive
Platform: Web

Preconditions:
- Recruiter has submitted 10 applications (5 on LINKEDIN, 5 on INDEED).
- Another recruiter has submitted 20 applications.

Steps:
1. Send `GET /api/v1/analytics/job-portals` authenticated as Recruiter.

Expected Result:
- Status Code: `200 OK`.
- Response contains portal counts reflecting ONLY the calling recruiter's applications:
  * `totalApplications` = 10
  * `portals` contains `LINKEDIN` count = 5, `INDEED` count = 5, others = 0.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: ANA-PORTAL-002
Scenario ID: ANA-SC-02
Module: Analytics
Title: Fetch job portal counts with custom date range
Priority: High
Severity: Medium
Type: Positive
Platform: Web

Preconditions:
- Authenticated user has Admin role.
- Database contains applications spanning last 30 days.

Test Data:
Query params: `?scope=custom&from=2026-08-01&to=2026-08-05`

Steps:
1. Send `GET /api/v1/analytics/job-portals?scope=custom&from=2026-08-01&to=2026-08-05`.

Expected Result:
- Status Code: `200 OK`.
- Response counts only include applications with `businessDate` between `2026-08-01` and `2026-08-05` inclusive.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:
