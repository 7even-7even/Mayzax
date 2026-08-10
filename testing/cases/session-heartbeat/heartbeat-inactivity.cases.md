# Mayzax Session Management & Heartbeats Testing Cases - Heartbeats & Inactivity

This file documents the detailed test cases for frontend heartbeats and inactivity timeout boundaries.

---

### Test Case ID: SESS-HB-001
Scenario ID: SESS-SC-06
Module: Heartbeats
Title: Update active timestamps on periodic heartbeat
Priority: Critical
Severity: High
Type: Positive
Platform: Web

Preconditions:
- Trackable user is online.

Steps:
1. Send `POST /api/v1/activity/heartbeat`.
2. Inspect user record in `users` table.

Expected Result:
- Status Code: `200 OK`.
- Database Verification: User's `lastHeartbeatAt` and `lastActiveAt` timestamps are updated to the current request timestamp.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: SESS-HB-002
Scenario ID: SESS-SC-07
Module: Heartbeats
Title: Terminate session on inactivity (> 40 minutes)
Priority: Critical
Severity: Critical
Type: Positive
Platform: Web

Preconditions:
- User is currently `ACTIVE`.
- User's `lastHeartbeatAt` is set to 41 minutes ago.

Steps:
1. Trigger `processHeartbeat` function.

Expected Result:
- Status Code: `401 Unauthorized`.
- Response JSON contains message "Session expired due to inactivity" (which immediately logs the user out on the screen).
- Database Verification:
  * The active log is closed with `endedAt` set to `lastHeartbeatAt` (41 minutes ago).
  * A new `ActivityLog` is created with `status: "OFFLINE"`, `startedAt = lastHeartbeatAt` (41 minutes ago), and `endedAt = now`.
  * The new OFFLINE log has `optionalNote: "Disconnected due to inactivity"`.
  * All active `RefreshToken` entries for this user are deleted from the database.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: SESS-HB-003
Scenario ID: SESS-SC-08
Module: Heartbeats
Title: Do not terminate session on short network blip (< 40 minutes)
Priority: High
Severity: Medium
Type: Positive
Platform: Web

Preconditions:
- User is currently `ACTIVE`.
- User's `lastHeartbeatAt` is set to 30 minutes ago.

Steps:
1. Trigger `processHeartbeat` function.

Expected Result:
- Database Verification:
  * The active log remains open (`endedAt = null`).
  * No new offline log is created.
  * User's `lastHeartbeatAt` is updated to the current timestamp.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:
