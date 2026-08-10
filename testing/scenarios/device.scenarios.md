# Mayzax Devices Testing Scenarios

This document outlines the testing scenarios for the Mobile and Web Companion Device Token Registration and Management module in the Mayzax ATS.

---

## 1. Discovered Device Management Architecture

```text
User Device
  ↓
Register / Update Device (`POST /api/v1/devices/register`):
- Restriction: Authenticated user.
- Action: Checks for existing device by unique `fcmToken`.
  * If exists: Updates user assignment, versioning parameters, and sets `lastSeen = now`.
  * If new: Inserts a new `DeviceToken` row.
  ↓
List Registered Devices (`GET /api/v1/devices`):
- Output: Returns list of devices registered to the requesting user, sorted by `lastSeen` in descending order.
  ↓
Remove Device Registration (`DELETE /api/v1/devices/:id`):
- Action: Deletes the FCM token device configuration if owned by the requesting user.
  ↓
Touch / Refresh Activity (`touchDevice` service helper):
- Action: Updates `lastSeen` timestamp of the matching user + FCM token connection.
```

---

## 2. High-Level Test Scenarios

### A. Device Registration Scenarios
* **DEV-SC-01:** Register a new FCM device token successfully.
* **DEV-SC-02:** Re-register / update an existing FCM device token.

### B. Device Management Scenarios
* **DEV-SC-03:** List registered devices for a user.
* **DEV-SC-04:** Delete a device registration owned by the user.
* **DEV-SC-05:** Prevent deleting a device registration owned by a different user.
