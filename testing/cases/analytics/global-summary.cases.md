# Mayzax Analytics Testing Cases - Global Summary

This file documents the test cases for active states breakdown, team rollups, and top performer analytics.

---

### Test Case ID: ANA-SUM-001
Scenario ID: ANA-SC-07
Module: Analytics
Title: Recruiter fetches global summary returns personal scoped stats
Priority: High
Severity: Medium
Type: Positive
Platform: Web

Preconditions:
- Active recruiter has submitted 15 applications.
- Overall system has 200 applications.

Steps:
1. Send `GET /api/v1/analytics/summary` authenticated as Recruiter.

Expected Result:
- Status Code: `200 OK`.
- Response details:
  * `totalApplications` = 0 (global stats zeroed out for recruiter role)
  * `myTotalApplications` = 15
  * `totalRecruiters` = 0
  * `activeRecruiters` = 0

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: ANA-SUM-002
Scenario ID: ANA-SC-08
Module: Analytics
Title: Admin fetches global summary calculates top performer
Priority: Critical
Severity: High
Type: Positive
Platform: Web

Preconditions:
- Recruiter A has submitted 5 applications today (top performer).
- Recruiter B has submitted 2 applications today.

Steps:
1. Send `GET /api/v1/analytics/summary` authenticated as Admin.

Expected Result:
- Status Code: `200 OK`.
- Response contains:
  * `topPerformer` = "Recruiter A Name (5)"
  * `totalRecruiters` = count of recruiters in database.
  * `activeMemberCount` matching active activity logs.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:
