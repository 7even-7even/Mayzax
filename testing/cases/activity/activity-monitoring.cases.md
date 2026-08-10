# Mayzax Login Hours & Activity Testing Cases - Monitoring & Reports

This file documents the detailed test cases for daily summaries, live monitoring, and report authorizations.

---

### Test Case ID: ACT-MON-001
Scenario ID: ACT-SC-07
Module: Activity
Title: Verify today's activity summary calculations
Priority: High
Severity: High
Type: Positive
Platform: Web

Preconditions:
- Mock logs exist in the database for the user:
  * ACTIVE from 09:00:00 to 10:00:00 (3600 seconds)
  * SHORT_BREAK from 10:00:00 to 10:15:00 (900 seconds)
  * ACTIVE from 10:15:00 to 12:00:00 (6300 seconds)
  * OFFLINE at 12:00:00

Steps:
1. Send `GET /api/v1/activity/today`.

Expected Result:
- Status Code: `200 OK`.
- Response fields:
  * `totalLoggedInSeconds` = 10800 (3 hours)
  * `totalProductiveSeconds` = 9900 (2.75 hours)
  * `totalBreakSeconds` = 900 (15 minutes)
  * `breakDetails.shortBreakSeconds` = 900
  * `loginTime` = "09:00:00" equivalent ISO string
  * `logoutTime` = "12:00:00" equivalent ISO string

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: ACT-MON-002
Scenario ID: ACT-SC-09
Module: Activity
Title: Admin retrieves live status dashboard
Priority: High
Severity: Medium
Type: Positive
Platform: Web

Preconditions:
- User is logged in as `ADMIN`.

Steps:
1. Send `GET /api/v1/activity/live-status`.

Expected Result:
- Status Code: `200 OK`.
- Returns list of online users and their current statuses/durations.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: ACT-MON-003
Scenario ID: ACT-SC-10
Module: Activity
Title: Recruiter access blocked on live status report
Priority: High
Severity: Medium
Type: Negative
Platform: Web

Preconditions:
- User is logged in as `RECRUITER`.

Steps:
1. Send `GET /api/v1/activity/live-status`.

Expected Result:
- Status Code: `403 Forbidden`.
- Response JSON contains:
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
