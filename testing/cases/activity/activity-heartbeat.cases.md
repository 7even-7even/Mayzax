# Mayzax Login Hours & Activity Testing Cases - Heartbeats

This file documents the detailed test cases for frontend heartbeats and inactivity-based auto-closures.

---

### Test Case ID: ACT-HB-001
Scenario ID: ACT-SC-05
Module: Activity
Title: Successful heartbeat registration
Priority: Critical
Severity: High
Type: Positive
Platform: Web

Preconditions:
- Trackable user is online.

Steps:
1. Send `POST /api/v1/activity/heartbeat` with headers:
   * `X-Client-Type: web`

Expected Result:
- Status Code: `200 OK`.
- Response JSON: `{ success: true, data: { status: "OK" } }`.
- Database Verification: User's `lastHeartbeatAt` and `lastActiveAt` fields in the `users` table are updated to the request timestamp.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: ACT-HB-002
Scenario ID: ACT-SC-06
Module: Activity
Title: Auto-close session on stale heartbeat (> 40 minutes)
Priority: Critical
Severity: Critical
Type: Positive
Platform: Web

Preconditions:
- User is currently in `ACTIVE` status.
- User's `lastHeartbeatAt` is set to 45 minutes ago.

Steps:
1. Send `POST /api/v1/activity/heartbeat` (simulating a heartbeat sent after a 45-minute interruption).

Expected Result:
- Status Code: `200 OK`.
- Database Verification:
  * The previous `ACTIVE` log's `endedAt` field is retroactively updated to `lastHeartbeatAt` (45 minutes ago).
  * A new `ActivityLog` is created with `status: "OFFLINE"`, `startedAt = lastHeartbeatAt` (45 minutes ago), `endedAt = now`, and `optionalNote: "Disconnected due to inactivity"`.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:
This verifies the automatic shift termination mechanism when connection is lost.
