# Mayzax Authentication Testing Cases - Refresh Token

This file documents the detailed test cases for session refresh operations, token rotation, and reuse attack mitigation.

---

### Test Case ID: AUTH-REFRESH-001
Scenario ID: AUTH-SC-09
Module: Authentication
Title: Session refresh using valid refresh token (Mobile style)
Priority: Critical
Severity: Critical
Type: Positive
Platform: Mobile

Preconditions:
- Valid refresh token is available.

Test Data:
Body: `{"refreshToken": "<valid_refresh_token_string>"}`

Steps:
1. Send `POST /api/v1/auth/refresh` with headers:
   * `Content-Type: application/json`
   * `X-Client-Type: mobile`
2. Pass request body:
   ```json
   {
     "refreshToken": "<valid_refresh_token_string>"
   }
   ```

Expected Result:
- Status Code: `200 OK`.
- Response contains `{ success: true, data: { tokens: { accessToken, refreshToken }, user } }`.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: AUTH-REFRESH-002
Scenario ID: AUTH-SC-09
Module: Authentication
Title: Session refresh using valid refresh token (Web style)
Priority: Critical
Severity: Critical
Type: Positive
Platform: Web

Preconditions:
- Valid refresh token cookie `refresh_token` exists.

Test Data:
Cookie: `refresh_token=<valid_refresh_token_value>`

Steps:
1. Send `POST /api/v1/auth/refresh` with headers:
   * `X-Client-Type: web`
   * No body payload sent.

Expected Result:
- Status Code: `200 OK`.
- Cookies `access_token` and `refresh_token` are set inside the response headers.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: AUTH-REFRESH-003
Scenario ID: AUTH-SC-11
Module: Authentication
Title: Refresh token rotation threshold checking (< 24 hours remaining)
Priority: High
Severity: High
Type: Positive
Platform: Web

Preconditions:
- A refresh token exists in database with an expiration date set to 23 hours from now.

Test Data:
Cookie: `refresh_token=<near_expiry_refresh_token>`

Steps:
1. Send `POST /api/v1/auth/refresh` with near-expiry token.

Expected Result:
- Status Code: `200 OK`.
- Response sets a NEW refresh token cookie (Rotation happened).
- Database Verification: The old refresh token record is updated with `revokedAt = current_time` and `replacedByTokenHash = sha256(new_refresh_token)`.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: AUTH-REFRESH-004
Scenario ID: AUTH-SC-11
Module: Authentication
Title: Refresh token reuse threshold checking (>= 24 hours remaining)
Priority: High
Severity: Medium
Type: Positive
Platform: Web

Preconditions:
- A refresh token exists in database with expiration set to 6 days from now.

Test Data:
Cookie: `refresh_token=<long_expiry_refresh_token>`

Steps:
1. Send `POST /api/v1/auth/refresh` with long-expiry token.

Expected Result:
- Status Code: `200 OK`.
- Response does NOT rotate the refresh token (reuses same token string).
- Only a new `access_token` is generated and set in headers/cookies.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: AUTH-REFRESH-005
Scenario ID: AUTH-SC-10
Module: Authentication
Title: Replay / reuse attack detection of a rotated refresh token
Priority: Critical
Severity: Critical
Type: Negative
Platform: Web

Preconditions:
- A refresh token has already been rotated (has a `revokedAt` timestamp older than 10 seconds).

Test Data:
Cookie: `refresh_token=<previously_rotated_refresh_token>`

Steps:
1. Send `POST /api/v1/auth/refresh` with the rotated token.

Expected Result:
- Status Code: `401 Unauthorized`.
- Response JSON:
   ```json
   {
     "success": false,
     "error": {
       "message": "Refresh token has already been used. All sessions revoked for security."
     }
   }
   ```
- Database Verification: ALL refresh tokens for the associated user that were active (`revokedAt = null`) are updated to be revoked (`revokedAt = current_time`).

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:
This tests the session hijacking protection code where replay of a leaked refresh token triggers immediate session termination for all devices.
