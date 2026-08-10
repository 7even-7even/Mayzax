# Mayzax Devices Testing Cases - Registration

This file documents the detailed test cases for registering and updating device tokens.

---

### Test Case ID: DEV-REG-001
Scenario ID: DEV-SC-01
Module: Devices
Title: Register a new device FCM token successfully
Priority: High
Severity: Medium
Type: Positive
Platform: Web / Mobile

Preconditions:
- Authenticated user.

Test Data:
Body:
```json
{
  "fcmToken": "fcm-token-abc-123",
  "platform": "IOS",
  "deviceName": "John's iPhone",
  "deviceModel": "iPhone 15 Pro"
}
```

Steps:
1. Send `POST /api/v1/devices/register` with the given parameters.

Expected Result:
- Status Code: `200 OK` (or `201 Created`).
- Database Verification:
  * A new `DeviceToken` row is created with matching parameters.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: DEV-REG-002
Scenario ID: DEV-SC-02
Module: Devices
Title: Re-register / update an existing FCM token updates lastSeen
Priority: High
Severity: Medium
Type: Positive
Platform: Web / Mobile

Preconditions:
- FCM token `"fcm-token-abc-123"` is already registered to user A.

Test Data:
Body:
```json
{
  "fcmToken": "fcm-token-abc-123",
  "platform": "IOS",
  "deviceName": "John's iPhone Updated"
}
```

Steps:
1. Send `POST /api/v1/devices/register` with the same token but updated deviceName.

Expected Result:
- Status Code: `200 OK`.
- Database Verification:
  * The existing `DeviceToken` row is updated (no new row is created).
  * `deviceName` is updated to `"John's iPhone Updated"`.
  * `lastSeen` is updated to the current timestamp.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:
