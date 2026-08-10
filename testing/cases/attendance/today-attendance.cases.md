# Mayzax Attendance Testing Cases - Today Summary

This file documents the detailed test cases for today's live user attendance summaries.

---

### Test Case ID: ATT-TODAY-001
Scenario ID: ATT-SC-01
Module: Attendance
Title: Get today's attendance summary while working (active status)
Priority: Critical
Severity: High
Type: Positive
Platform: Web / Mobile

Preconditions:
- User is currently `ACTIVE` (working).
- Shift expected work seconds = 28800 (8 hours).
- User has logged 18000 seconds (5 hours) of productive time.

Steps:
1. Send `GET /api/v1/attendance/today`.

Expected Result:
- Status Code: `200 OK`.
- Response DTO checks:
  * `today.currentStatus` = `"ACTIVE"`.
  * `today.isLoggedIn` = `true`.
  * `today.workedSeconds` = `18000`.
  * `today.remainingWorkSeconds` = `10800` (3 hours remaining).
  * `today.currentBreak` = `null`.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: ATT-TODAY-002
Scenario ID: ATT-SC-02
Module: Attendance
Title: Get today's attendance summary while user is on short break
Priority: High
Severity: Medium
Type: Positive
Platform: Web / Mobile

Preconditions:
- User is currently on `SHORT_BREAK`.
- Break started 300 seconds (5 minutes) ago.
- Allowed short break duration = 900 seconds (15 minutes).

Steps:
1. Send `GET /api/v1/attendance/today`.

Expected Result:
- Status Code: `200 OK`.
- Response DTO checks:
  * `today.status` = `"ON_BREAK"`.
  * `today.currentBreak.type` = `"SHORT_BREAK"`.
  * `today.currentBreak.usedSec` = `300` (approximately).
  * `today.currentBreak.remainingSec` = `600` (approximately).
  * `today.currentBreak.isOver` = `false`.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:
Tests real-time remaining countdown limits calculations.
