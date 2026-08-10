# Mayzax Authentication Testing Cases - Logout

This file documents the detailed test cases for user logout, session invalidation, and attendance logging triggers.

---

### Test Case ID: AUTH-LOGOUT-001
Scenario ID: AUTH-SC-12
Module: Authentication
Title: Successful logout via Web client
Priority: High
Severity: High
Type: Positive
Platform: Web

Preconditions:
- User is logged in on Web.
- Valid `access_token` and `refresh_token` cookies exist.

Test Data:
Cookie: `access_token=<valid_token>; refresh_token=<valid_token>`

Steps:
1. Send `POST /api/v1/auth/logout` with headers:
   * `Authorization: Bearer <access_token>`
   * `X-Client-Type: web`
2. Pass cookie: `refresh_token=<valid_token>`

Expected Result:
- Status Code: `200 OK`.
- Response contains `{ success: true, data: { message: "Logged out" } }`.
- Response headers contain `Set-Cookie` directives clearing `access_token` and `refresh_token` (sets expiry date to past).
- Database Verification: The `RefreshToken` record associated with the submitted token is updated with `revokedAt = current_time`.
- Attendance activity logout event tracking (`handleLogoutEvent`) is triggered.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: AUTH-LOGOUT-002
Scenario ID: AUTH-SC-13
Module: Authentication
Title: Successful logout via Mobile client (read-only)
Priority: High
Severity: Medium
Type: Positive
Platform: Mobile

Preconditions:
- User is logged in on Mobile.
- Valid `access_token` and `refresh_token` string exist on client.

Test Data:
Header: `Authorization: Bearer <access_token>`
Body: `{"refreshToken": "<valid_refresh_token_string>"}`

Steps:
1. Send `POST /api/v1/auth/logout` with headers:
   * `Authorization: Bearer <access_token>`
   * `X-Client-Type: mobile`
2. Pass request body:
   ```json
   {
     "refreshToken": "<valid_refresh_token_string>"
   }
   ```

Expected Result:
- Status Code: `200 OK`.
- Response contains `{ success: true, data: { message: "Logged out" } }`.
- Database Verification: The `RefreshToken` record is marked revoked.
- Attendance events (`handleLogoutEvent`) are NOT triggered (Mobile is read-only and does not track active state changes).

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: AUTH-LOGOUT-003
Scenario ID: AUTH-SC-12
Module: Authentication
Title: Attempt protected route access after logout
Priority: High
Severity: High
Type: Negative
Platform: Web

Preconditions:
- User has logged out successfully.

Test Data:
Header: Use the `access_token` that was active before logout.

Steps:
1. Send `GET /api/v1/auth/me` with the previous access token.

Expected Result:
- Status Code: `401 Unauthorized`.
- Access is blocked. (If access token was short-lived, it may still pass signature check until expiration if not store-checked, but refresh token is definitely revoked. Test if stateless access token verification is blocked or allowed during its short validity window).

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:
Mayzax utilizes stateless JWT verification. An access token remains valid until its absolute expiration timestamp, even after logout, unless matched against a blacklist (which is not implemented in `requireAuth` currently). This should be noted for security audit.
