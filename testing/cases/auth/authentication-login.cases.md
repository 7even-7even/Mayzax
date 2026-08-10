# Mayzax Authentication Testing Cases - Login

This file documents the detailed test cases for the login functionality of the Mayzax application.

---

### Test Case ID: AUTH-LOGIN-001
Scenario ID: AUTH-SC-01
Module: Authentication
Title: Login with valid credentials via Web
Priority: Critical
Severity: Critical
Type: Positive
Platform: Web

Preconditions:
- Active user exists in the database.
- Database is running and seed data is populated.

Test Data:
Email: `admin@mayzax.com` (lowercase in database)
Password: `Password123`

Steps:
1. Send `POST /api/v1/auth/login` with headers:
   * `Content-Type: application/json`
   * `X-Client-Type: web`
2. Pass request body:
   ```json
   {
     "email": "admin@mayzax.com",
     "password": "Password123"
   }
   ```

Expected Result:
- Status Code: `200 OK`.
- Response contains `{ success: true }` and `data` object with `user` and `tokens`.
- Cookies `access_token` and `refresh_token` are set in the response headers.
- Attendance activity logout event tracking (`handleLoginEvent`) is triggered.
- Database Verification: User's `lastActiveAt` timestamp in `users` table is updated.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: AUTH-LOGIN-002
Scenario ID: AUTH-SC-01
Module: Authentication
Title: Login with valid credentials via Mobile
Priority: Critical
Severity: Critical
Type: Positive
Platform: Mobile

Preconditions:
- Active user exists in the database.

Test Data:
Email: `recruiter@mayzax.com`
Password: `Password123`

Steps:
1. Send `POST /api/v1/auth/login` with headers:
   * `Content-Type: application/json`
   * `X-Client-Type: mobile`
   * `X-Device-Name: Android Test Device`
2. Pass request body:
   ```json
   {
     "email": "recruiter@mayzax.com",
     "password": "Password123"
   }
   ```

Expected Result:
- Status Code: `200 OK`.
- Response contains `{ success: true, data: { tokens: { accessToken, refreshToken }, user } }`.
- Cookies are set but mobile app extracts tokens from response body payload.
- Attendance activity events (`handleLoginEvent`) are NOT triggered (Mobile is read-only).
- Database Verification: User's `lastActiveAt` timestamp in `users` table is updated.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: AUTH-LOGIN-003
Scenario ID: AUTH-SC-02
Module: Authentication
Title: Login with wrong password
Priority: Critical
Severity: Critical
Type: Negative
Platform: Web

Preconditions:
- Registered user exists in the database.

Test Data:
Email: `admin@mayzax.com`
Password: `WrongPassword123`

Steps:
1. Send `POST /api/v1/auth/login` with request body:
   ```json
   {
     "email": "admin@mayzax.com",
     "password": "WrongPassword123"
   }
   ```

Expected Result:
- Status Code: `401 Unauthorized`.
- Response JSON:
   ```json
   {
     "success": false,
     "error": {
       "message": "Invalid email or password"
     }
   }
   ```
- Cookies are not set.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: AUTH-LOGIN-004
Scenario ID: AUTH-SC-02
Module: Authentication
Title: Login with unregistered email
Priority: Critical
Severity: Critical
Type: Negative
Platform: Web

Preconditions:
- Email is not registered.

Test Data:
Email: `notregistered@mayzax.com`
Password: `Password123`

Steps:
1. Send `POST /api/v1/auth/login` with request body:
   ```json
   {
     "email": "notregistered@mayzax.com",
     "password": "Password123"
   }
   ```

Expected Result:
- Status Code: `401 Unauthorized`.
- Response JSON:
   ```json
   {
     "success": false,
     "error": {
       "message": "Invalid email or password"
     }
   }
   ```
- Notice that the message must be identical to `AUTH-LOGIN-003` to prevent credential harvesting.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: AUTH-LOGIN-005
Scenario ID: AUTH-SC-03
Module: Authentication
Title: Login attempt by deactivated account
Priority: High
Severity: High
Type: Negative
Platform: Web

Preconditions:
- A user exists with `isActive = false` in `users` table.

Test Data:
Email: `inactive@mayzax.com`
Password: `Password123`

Steps:
1. Send `POST /api/v1/auth/login` with request body:
   ```json
   {
     "email": "inactive@mayzax.com",
     "password": "Password123"
   }
   ```

Expected Result:
- Status Code: `403 Forbidden`.
- Response JSON:
   ```json
   {
     "success": false,
     "error": {
       "message": "Your account has been deactivated. Please contact an administrator."
     }
   }
   ```

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: AUTH-LOGIN-006
Scenario ID: AUTH-SC-04
Module: Authentication
Title: Verify case insensitivity in login email
Priority: Medium
Severity: Low
Type: Positive
Platform: Web

Preconditions:
- Registered user exists with email `admin@mayzax.com`.

Test Data:
Email: `AdMiN@mAyZaX.cOm`
Password: `Password123`

Steps:
1. Send `POST /api/v1/auth/login` with request body:
   ```json
   {
     "email": "AdMiN@mAyZaX.cOm",
     "password": "Password123"
   }
   ```

Expected Result:
- Status Code: `200 OK`.
- Email is normalized to lowercase internally and succeeds.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: AUTH-LOGIN-007
Scenario ID: AUTH-SC-03
Module: Authentication
Title: Login attempt by soft-deleted account
Priority: High
Severity: High
Type: Negative
Platform: Web

Preconditions:
- A user exists with `deletedAt` set to a timestamp in the past.

Test Data:
Email: `deleted@mayzax.com`
Password: `Password123`

Steps:
1. Send `POST /api/v1/auth/login` with request body:
   ```json
   {
     "email": "deleted@mayzax.com",
     "password": "Password123"
   }
   ```

Expected Result:
- Status Code: `401 Unauthorized`.
- Response JSON:
   ```json
   {
     "success": false,
     "error": {
       "message": "Invalid email or password"
     }
   }
   ```

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:
