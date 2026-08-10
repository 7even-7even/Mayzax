# Mayzax Notifications Testing Cases - Creation & Dispatch

This file documents the detailed test cases for notification creation, FCM push delivery, and invalid token pruning.

---

### Test Case ID: NOTIF-CRE-001
Scenario ID: NOTIF-SC-01
Module: Notifications
Title: Create an in-app notification record and enqueue dispatch job
Priority: Critical
Severity: High
Type: Positive
Platform: Web / Mobile

Steps:
1. Call `createNotification` with a valid userId, type, title, and body.

Expected Result:
- A new `Notification` row is persisted in the database.
- A BullMQ `DispatchNotification` job is enqueued with the notification ID.
- The created record is returned.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: NOTIF-FCM-001
Scenario ID: NOTIF-SC-03
Module: Notifications
Title: Dispatch sends FCM push to all registered device tokens
Priority: Critical
Severity: High
Type: Positive
Platform: Mobile

Preconditions:
- User has 2 registered device tokens in the database.

Steps:
1. Call `dispatchNotification(notificationId)` via BullMQ job worker.

Expected Result:
- FCM `sendPush` is called exactly 2 times (once per device).
- `pushSentAt` is updated on the notification record.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: NOTIF-FCM-002
Scenario ID: NOTIF-SC-04
Module: Notifications
Title: Dispatch skips already-read notifications
Priority: High
Severity: Medium
Type: Positive
Platform: Mobile

Preconditions:
- Notification has `readAt != null` (already read).

Steps:
1. Call `dispatchNotification(notificationId)`.

Expected Result:
- FCM `sendPush` is NOT called.
- No device tokens are queried.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: NOTIF-FCM-003
Scenario ID: NOTIF-SC-05
Module: Notifications
Title: Prune invalid FCM tokens after failed push delivery
Priority: High
Severity: High
Type: Positive
Platform: Mobile

Preconditions:
- User has 1 device with invalid/stale FCM token.
- Firebase returns `invalidToken: true` for the push.

Steps:
1. Call `dispatchNotification(notificationId)`.

Expected Result:
- `prisma.deviceToken.deleteMany` is called with the invalid device ID.
- Invalid device token is removed from the database.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:
Prevents future failed push delivery attempts to stale tokens.
