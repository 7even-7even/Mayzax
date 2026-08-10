# Mayzax Updates Testing Cases - Read Receipts

This file documents the detailed test cases for tracking user read receipts for system announcements.

---

### Test Case ID: UPD-READ-001
Scenario ID: UPD-SC-03
Module: Updates
Title: User marks update as read successfully
Priority: High
Severity: Medium
Type: Positive
Platform: Web / Mobile

Preconditions:
- System update `"update-uuid-123"` exists in database.

Steps:
1. Send `POST /api/v1/updates/update-uuid-123/read`.

Expected Result:
- Status Code: `200 OK`.
- Database Verification:
  * A `UserUpdateRead` record is created or updated for this user and updateId combination.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: UPD-READ-002
Scenario ID: UPD-SC-04
Module: Updates
Title: Attempt marking non-existent update as read returns 404
Priority: Medium
Severity: Low
Type: Negative
Platform: Web / Mobile

Steps:
1. Send `POST /api/v1/updates/non-existent-uuid/read`.

Expected Result:
- Status Code: `404 Not Found`.
- Response contains message: `"Update not found"`.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:
