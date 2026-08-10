# Mayzax Push Notifications Testing Scenarios

This document outlines the testing scenarios for the In-App Notification creation, FCM push dispatch, invalid token pruning, and bulk fan-out broadcasting in the Mayzax ATS.

---

## 1. Discovered Notifications Architecture

```text
Internal System / Service
  ↓
Create Notification (`createNotification`):
- Persists a `Notification` record in the database.
- Schedules an async BullMQ job (`DispatchNotification`) for push delivery.
- Supports optional `pushAfter` Date for delayed scheduling.
  ↓
Dispatch Notification Job (`dispatchNotification`):
- Fetches the notification + user's registered device tokens.
- Skips already-read notifications.
- Sends FCM push to each registered device.
- Channel mapping: routes to different Android channels based on notification type.
- Invalid token pruning: Deletes stale FCM tokens from DB after FCM rejects them.
  ↓
User request
  ↓
List Notifications (`GET /api/v1/notifications`):
- Returns paginated list sorted by priority desc, then createdAt desc.
- Returns `unreadCount` in meta.

Mark Read (`POST /api/v1/notifications/:id/read`):
- Sets `readAt` timestamp on the specific notification.

Mark All Read (`POST /api/v1/notifications/read-all`):
- Sets `readAt` on ALL unread notifications for the user.

Fan Out Notice (`fanOutNotice`):
- Broadcasts COMPANY_NOTICE notification to ALL active users.
```

---

## 2. High-Level Test Scenarios

### A. Notification Creation Scenarios
* **NOTIF-SC-01:** Create an in-app notification and dispatch it via BullMQ queue.
* **NOTIF-SC-02:** Create notification with `pushAfter` future date schedules a delayed BullMQ job.

### B. FCM Dispatch Scenarios
* **NOTIF-SC-03:** Dispatch notification sends FCM push to all registered device tokens.
* **NOTIF-SC-04:** Dispatch skips already-read notifications.
* **NOTIF-SC-05:** Prune invalid/stale FCM tokens from database after failed push delivery.

### C. Read State Scenarios
* **NOTIF-SC-06:** User marks a single notification as read.
* **NOTIF-SC-07:** User marks all notifications as read in one action.

### D. Fan-out Scenarios
* **NOTIF-SC-08:** Fan-out company notice broadcasts to all active users.
