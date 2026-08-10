# Mayzax Session Management & Heartbeats Testing Cases - Session Management

This file documents the detailed test cases for session tracking, token lifespans, multi-device sessions, and security invalidation.

---

### Test Case ID: SESS-MGMT-001
Scenario ID: SESS-SC-01
Module: Session Management
Title: Store new refresh token details on authentication
Priority: Critical
Severity: High
Type: Positive
Platform: Web

Preconditions:
- Active user exists.

Steps:
1. Call `POST /api/v1/auth/login`.
2. Inspect the `refresh_tokens` database table.

Expected Result:
- Status Code: `200 OK`.
- Database Verification: A new record is created in `refresh_tokens` containing:
  * `tokenHash` = SHA-256 hash of the issued refresh token.
  * `expiresAt` = timestamp set to 7 days from now.
  * `clientType` = resolved client type (WEB or MOBILE).
  * `ip`, `userAgent`, and `deviceName` populated correctly.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: SESS-MGMT-002
Scenario ID: SESS-SC-03
Module: Session Management
Title: Support multi-device concurrent sessions
Priority: High
Severity: Medium
Type: Positive
Platform: Web

Preconditions:
- Active user exists.

Steps:
1. Authenticate user from Device 1 (Web).
2. Authenticate the same user from Device 2 (Mobile).
3. Inspect `refresh_tokens` table for the user.

Expected Result:
- Both logins succeed.
- Database Verification: Two separate records with different `id` and `tokenHash` values exist concurrently with `revokedAt = null`.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: SESS-MGMT-003
Scenario ID: SESS-SC-04
Module: Session Management
Title: Cascade session revocation on password change
Priority: Critical
Severity: Critical
Type: Positive
Platform: Web

Preconditions:
- User is logged in on multiple devices (multiple active refresh tokens in database).

Steps:
1. User changes password using `POST /api/v1/auth/change-password`.
2. Check active tokens in `refresh_tokens` database table.

Expected Result:
- Status Code: `200 OK`.
- Database Verification: ALL refresh token records associated with this user ID are updated to have `revokedAt = current_timestamp`.
- Any subsequent refresh requests using these tokens fail with `401 Unauthorized`.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: SESS-MGMT-004
Scenario ID: SESS-SC-05
Module: Session Management
Title: Revoke all sessions on token reuse detection (Replay Attack Protection)
Priority: Critical
Severity: Critical
Type: Negative
Platform: Web

Preconditions:
- A refresh token was previously rotated (is marked revoked and has `replacedByTokenHash` set).

Steps:
1. Attacker attempts to refresh session using the previously rotated token after a 15-second delay.

Expected Result:
- Status Code: `401 Unauthorized`.
- Response JSON message: `"Refresh token has already been used. All sessions revoked for security."`
- Database Verification: ALL other active refresh token records (where `revokedAt = null`) for this user are immediately updated to have `revokedAt = current_timestamp`.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:
This tests the replay security mechanism protecting against stolen session tokens.
