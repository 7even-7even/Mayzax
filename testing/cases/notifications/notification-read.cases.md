# Mayzax Notifications Testing Cases - Read State & Fan-out

This file documents the detailed test cases for read receipt tracking and company-wide broadcast notifications.

---

### Test Case ID: NOTIF-READ-001
Scenario ID: NOTIF-SC-06
Module: Notifications
Title: User marks a single notification as read
Priority: High
Severity: Medium
Type: Positive
Platform: Web / Mobile

Preconditions:
- Notification with ID `"notif-uuid-abc"` exists and belongs to the user.

Steps:
1. Send `POST /api/v1/notifications/notif-uuid-abc/read`.

Expected Result:
- Status Code: `200 OK`.
- Database Verification:
  * Notification `readAt` is updated to the current timestamp.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: NOTIF-READ-002
Scenario ID: NOTIF-SC-07
Module: Notifications
Title: User marks all unread notifications as read at once
Priority: Medium
Severity: Medium
Type: Positive
Platform: Web / Mobile

Preconditions:
- User has 5 unread notifications.

Steps:
1. Send `POST /api/v1/notifications/read-all`.

Expected Result:
- Status Code: `200 OK`.
- Database Verification:
  * All 5 notification records have `readAt` populated.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: NOTIF-FAN-001
Scenario ID: NOTIF-SC-08
Module: Notifications
Title: Fan-out company notice broadcasts to all active users
Priority: High
Severity: High
Type: Positive
Platform: Web / Mobile

Preconditions:
- 3 active users exist in the database.

Steps:
1. Call `fanOutNotice("System Notice", "Important company announcement")` internally.

Expected Result:
- 3 `Notification` records are created, one per active user.
- All notifications have `type = "COMPANY_NOTICE"`.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:
Tests high-volume broadcast reliability.
