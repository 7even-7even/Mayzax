# Mayzax Devices Testing Cases - Management

This file documents the detailed test cases for listing and deleting user device registration tokens.

---

### Test Case ID: DEV-MGMT-001
Scenario ID: DEV-SC-03
Module: Devices
Title: Retrieve registered devices list for user
Priority: High
Severity: Medium
Type: Positive
Platform: Web / Mobile

Preconditions:
- User has 2 registered device tokens.

Steps:
1. Send `GET /api/v1/devices`.

Expected Result:
- Status Code: `200 OK`.
- Response contains an array of the 2 devices, sorted by `lastSeen` in descending order.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: DEV-MGMT-002
Scenario ID: DEV-SC-04
Module: Devices
Title: User removes their registered device token
Priority: High
Severity: High
Type: Positive
Platform: Web / Mobile

Preconditions:
- User has registered device with ID `"dev-token-uuid"`.

Steps:
1. Send `DELETE /api/v1/devices/dev-token-uuid`.

Expected Result:
- Status Code: `200 OK`.
- Database Verification:
  * The row with ID `"dev-token-uuid"` is deleted.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: DEV-MGMT-003
Scenario ID: DEV-SC-05
Module: Devices
Title: Prevent user from deleting a device owned by another user
Priority: High
Severity: High
Type: Negative
Platform: Web / Mobile

Preconditions:
- Device ID `"other-users-device-uuid"` belongs to User B.
- Requesting user is User A.

Steps:
1. Send `DELETE /api/v1/devices/other-users-device-uuid` authenticated as User A.

Expected Result:
- Status Code: `404 Not Found` (or returns null/blocked).
- Database Verification:
  * The device record in the database is NOT deleted.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:
Checks security boundaries for data isolation.
