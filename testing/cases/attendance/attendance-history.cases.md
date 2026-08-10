# Mayzax Attendance Testing Cases - History & Summary

This file documents the detailed test cases for monthly rollups and paginated attendance logs.

---

### Test Case ID: ATT-HIST-001
Scenario ID: ATT-SC-04
Module: Attendance
Title: Get monthly attendance summary details
Priority: High
Severity: Medium
Type: Positive
Platform: Web / Mobile

Preconditions:
- Database contains 20 attendance days records for the current month.
- User was present 18 days, absent 2 days, and accrued 30 penalty minutes.

Steps:
1. Send `GET /api/v1/attendance/month-summary`.

Expected Result:
- Status Code: `200 OK`.
- Response contains rollups:
  * `presentCount` = 18
  * `absentCount` = 2
  * `totalPenaltyMinutes` = 30

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:
Tests monthly aggregation arithmetic.
