# Mayzax Authentication Testing Cases - Access Token

This file documents the detailed test cases for access token verification, expiration, and payload handling.

---

### Test Case ID: AUTH-TOKEN-001
Scenario ID: AUTH-SC-07
Module: Authentication
Title: Access protected route with valid access token
Priority: Critical
Severity: Critical
Type: Positive
Platform: Web

Preconditions:
- Valid access token exists (obtained from login response).

Test Data:
Header: `Authorization: Bearer <valid_access_token>`

Steps:
1. Send `GET /api/v1/auth/me` with headers:
   * `Authorization: Bearer <valid_access_token>`

Expected Result:
- Status Code: `200 OK`.
- Response contains `{ success: true, data: { id, name, email, role } }`.
- User details match the token payload.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: AUTH-TOKEN-002
Scenario ID: AUTH-SC-08
Module: Authentication
Title: Access protected route without access token
Priority: Critical
Severity: Critical
Type: Negative
Platform: Web

Preconditions:
- None.

Test Data:
No credentials sent.

Steps:
1. Send `GET /api/v1/auth/me` with no Authorization headers or cookies.

Expected Result:
- Status Code: `401 Unauthorized`.
- Response JSON:
   ```json
   {
     "success": false,
     "error": {
       "message": "Authentication token missing"
     }
   }
   ```

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: AUTH-TOKEN-003
Scenario ID: AUTH-SC-08
Module: Authentication
Title: Access protected route with expired access token
Priority: Critical
Severity: Critical
Type: Negative
Platform: Web

Preconditions:
- Access token expiry threshold has passed.

Test Data:
Header: `Authorization: Bearer <expired_access_token>`

Steps:
1. Send `GET /api/v1/auth/me` with expired access token.

Expected Result:
- Status Code: `401 Unauthorized`.
- Response JSON:
   ```json
   {
     "success": false,
     "error": {
       "message": "Invalid or expired authentication token"
     }
   }
   ```

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: AUTH-TOKEN-004
Scenario ID: AUTH-SC-08
Module: Authentication
Title: Access protected route with tampered access token
Priority: Critical
Severity: Critical
Type: Negative
Platform: Web

Preconditions:
- Active access token exists.

Test Data:
Header: Alter the signature part of a valid JWT token.

Steps:
1. Send `GET /api/v1/auth/me` using the tampered token.

Expected Result:
- Status Code: `401 Unauthorized`.
- Response JSON:
   ```json
   {
     "success": false,
     "error": {
       "message": "Invalid or expired authentication token"
     }
   }
   ```

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:
