# Mayzax Authentication Testing Cases - Security

This file documents the detailed test cases for rate limiting, password recovery security questions, credential exposure prevention, and brute force protection.

---

### Test Case ID: AUTH-SEC-001
Scenario ID: AUTH-SC-21
Module: Authentication
Title: Rate limiting on authentication endpoints (authRateLimiter)
Priority: High
Severity: High
Type: Negative
Platform: Web

Preconditions:
- None.
- Rate limiter configuration is set (default max: 100 requests per 15 minutes).

Test Data:
Perform rapid login attempts using automation scripts.

Steps:
1. Make 101 requests to `POST /api/v1/auth/login` within a 15-minute window from the same IP address.

Expected Result:
- The first 100 requests proceed normally (returning success or invalid credentials).
- The 101st request is blocked.
- Status Code: `429 Too Many Requests`.
- Response JSON:
   ```json
   {
     "success": false,
     "error": {
       "code": "RATE_LIMITED",
       "message": "Too many auth attempts, please try again later."
     }
   }
   ```

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: AUTH-SEC-002
Scenario ID: AUTH-SC-23
Module: Authentication
Title: Password reset via correct security question answer
Priority: High
Severity: High
Type: Positive
Platform: Web

Preconditions:
- Active user has set a security question ("What is your pet's name?") and answer ("Fido").

Test Data:
Email: `user@mayzax.com`
Answer: `fido` (test case insensitivity normalization)

Steps:
1. Send `POST /api/v1/auth/forgot-password/question` with body:
   ```json
   { "email": "user@mayzax.com" }
   ```
2. Verify returned question matches `"What is your pet's name?"`.
3. Send `POST /api/v1/auth/forgot-password/reset` with body:
   ```json
   {
     "email": "user@mayzax.com",
     "securityAnswer": "FIDO",
     "newPassword": "Password1234",
     "confirmPassword": "Password1234"
   }
   ```

Expected Result:
- Step 1: Status Code `200 OK`. Returns security question.
- Step 3: Status Code `200 OK`. Password is reset successfully.
- Database Verification: User's `passwordHash` is updated. All existing active refresh tokens/sessions are revoked.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: AUTH-SEC-003
Scenario ID: AUTH-SC-23
Module: Authentication
Title: Password reset attempt via incorrect security question answer
Priority: High
Severity: High
Type: Negative
Platform: Web

Preconditions:
- Active user has set a security question.

Test Data:
Email: `user@mayzax.com`
Answer: `incorrect_answer`

Steps:
1. Send `POST /api/v1/auth/forgot-password/reset` with body:
   ```json
   {
     "email": "user@mayzax.com",
     "securityAnswer": "incorrect_answer",
     "newPassword": "Password1234",
     "confirmPassword": "Password1234"
   }
   ```

Expected Result:
- Status Code: `400 Bad Request`.
- Response JSON:
   ```json
   {
     "success": false,
     "error": {
       "message": "Security answer is incorrect"
     }
   }
   ```
- Database Verification: User's password is NOT changed. Active sessions are NOT revoked.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: AUTH-SEC-004
Scenario ID: AUTH-SC-24
Module: Authentication
Title: Password exposure prevention in responses
Priority: Critical
Severity: Critical
Type: Positive
Platform: Web

Preconditions:
- Active user exists.

Test Data:
Perform successful login.

Steps:
1. Send `POST /api/v1/auth/login` with valid credentials.
2. Inspect the JSON structure of the returned `user` object.

Expected Result:
- Status Code: `200 OK`.
- The user object does NOT contain the fields `passwordHash` or `securityAnswerHash`.
- No sensitive database fields are leaked in API responses.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:
Tests the user sanitization logic (`sanitizeUser` helper) to guarantee password hashes are kept secure and never sent to clients.
