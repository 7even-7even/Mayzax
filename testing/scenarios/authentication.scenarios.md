# Mayzax Authentication Testing Scenarios

This document outlines the testing scenarios for the Authentication and Authorization modules of the Mayzax ATS & Companion application. These scenarios are designed based on the actual codebase implementation discovered within the repository.

---

## 1. Discovered Authentication & Session Architecture

```text
Client (Web / Mobile / Extension)
  ↓
Send Request with Headers:
- X-Client-Type: ("web" | "mobile" | "extension")
- X-Device-Name (for Mobile/Extension metadata)
  ↓
Backend Rate Limiting (`authRateLimiter` - default 100 requests per 15 min per IP)
  ↓
Input Validation via Zod Schemas (`loginSchema`, `signupSchema`, etc.)
  ↓
Database User Lookup (Check by lowercase email, verify `deletedAt` is null)
  ↓
Account Status Validation (`isActive` check)
  ↓
Password Verification (Bcrypt comparison against `passwordHash`)
  ↓
Token Generation (`issueTokenPair`):
- Access Token: JWT containing `{ sub, role, email, clientType }` (signed with `JWT_ACCESS_SECRET`, expires via `JWT_ACCESS_EXPIRES_IN`)
- Refresh Token: JWT containing `{ sub, tokenId }` (signed with `JWT_REFRESH_SECRET`, expires via `JWT_REFRESH_EXPIRES_IN`)
  ↓
Database Persistence:
- Store SHA-256 hash of refresh token (`tokenHash`) with metadata (IP, User Agent, ClientType, DeviceName, Expiration) in `refresh_tokens` table.
  ↓
Session Initialization (Web only):
- Trigger login/logout event tracking via `handleLoginEvent` for WEB clients (ignored for MOBILE).
  ↓
Cookie / Token Storage:
- Web: Sets `access_token` and `refresh_token` as HttpOnly, Secure, SameSite (lax/none) cookies.
- Mobile/Extension: Extract tokens from HTTP response body (`accessToken`/`refreshToken`) and store in client secure storage.
  ↓
Authenticated Requests:
- Verification: `requireAuth` parses `Authorization: Bearer <token>` header or `access_token` cookie.
  ↓
Token Rotation & Refresh:
- Call `POST /api/v1/auth/refresh` sending body `refreshToken` (mobile) or via cookie `refresh_token` (web).
- Verification: Hash token, match in database, verify expiration, verify account active status.
- Rotation Logic: If remaining lifetime is < 24 hours, revoke old refresh token (set `revokedAt` and `replacedByTokenHash`) and issue a new token pair. If >= 24 hours, reuse same refresh token and sign new access token.
- Reuse Attack Detection: If a revoked refresh token is re-submitted after 10 seconds of revocation, all active sessions/tokens for that user are immediately revoked.
  ↓
Logout:
- Revoke refresh token in database (set `revokedAt`), clear web cookies, and trigger attendance logout tracking (Web only).
```

### Client Authentication Differences
* **Web Frontend:** Authenticates using HttpOnly cookies (`access_token`, `refresh_token`). Starts attendance tracking and logs clock-in/out events upon session changes.
* **Mobile Companion:** Authenticates using JWTs passed via response body and request `Authorization: Bearer <token>` header. Mobile client type is read-only and explicitly disallowed from triggering attendance mutation endpoints (defense-in-depth via `disallowMobile` middleware).
* **Chrome Extension:** Sourcing tool that authenticates using headers; treated as a desktop web CRM extension.

---

## 2. High-Level Test Scenarios

### A. Login Scenarios
* **AUTH-SC-01:** Authenticate successfully with valid registered credentials (Web & Mobile).
* **AUTH-SC-02:** Attempt authentication with invalid email, wrong password, or unhashed matches.
* **AUTH-SC-03:** Attempt login of a deactivated user (`isActive` set to false) and soft-deleted user.
* **AUTH-SC-04:** Verify case insensitivity in email input at authentication and registration.

### B. Input Validation Scenarios
* **AUTH-SC-05:** Verify Zod validation on sign-up/login requests (empty fields, malformed email format).
* **AUTH-SC-06:** Verify password complexity constraints during sign-up and security question reset.

### C. Access Token Scenarios
* **AUTH-SC-07:** Verify access to protected routes with a valid, unexpired access token.
* **AUTH-SC-08:** Verify rejection of expired, malformed, or tampered access tokens.

### D. Refresh Token Scenarios
* **AUTH-SC-09:** Verify session refresh using a valid refresh token (via body for mobile and cookie for web).
* **AUTH-SC-10:** Verify session refresh token reuse detection (submitting a revoked refresh token triggers cascade revocation of all user tokens).
* **AUTH-SC-11:** Verify refresh token rotation threshold (< 24 hours remaining rotates; >= 24 hours remaining reuses).

### E. Logout Scenarios
* **AUTH-SC-12:** Verify logout successfully clears cookies (web) and revokes database refresh token.
* **AUTH-SC-13:** Verify client logout halts web attendance monitoring / logs logout event (Web only).

### F. Protected Routes Scenarios
* **AUTH-SC-14:** Verify access block to any protected endpoint without valid credentials.
* **AUTH-SC-15:** Verify client-type constraints (e.g. mobile companion requests to mutating attendance endpoints return `403 Forbidden`).

### G. Roles & Authorization Scenarios
* **AUTH-SC-16:** Verify access rights for each role (`ADMIN`, `TEAM_LEADER`, `RECRUITER`, `RESUME_ASSIST`, `SALES_EXEC`, `CLIENT`).
* **AUTH-SC-17:** Verify block on unauthorized role escalation attempts and direct API access to higher-privileged endpoints.

### H. Client-Type Security Scenarios
* **AUTH-SC-18:** Verify header parsing of `X-Client-Type` and proper resolving of default client type (WEB).
* **AUTH-SC-19:** Verify `X-Device-Name` and session metadata are saved correctly in db context during login.

### I. Cookies / Browser Authentication Scenarios
* **AUTH-SC-20:** Verify cookie attributes (HttpOnly, Secure, SameSite, Domain) match environment config settings.

### J. Rate Limiting Scenarios
* **AUTH-SC-21:** Verify auth endpoints limit requests and recover after rate limit window (`authRateLimiter`).

### K. Security Scenarios
* **AUTH-SC-22:** Verify password and security answer hashing strength (Bcrypt rounds = 12).
* **AUTH-SC-23:** Verify security question password recovery flow.

### L. Error Handling Scenarios
* **AUTH-SC-24:** Verify error codes (`RATE_LIMITED`, `401 Unauthorized`, `403 Forbidden`) and ensure no database leakages or stack traces are present in response JSONs.

---

## 3. Open Testing Questions

* **Question:** Should client type (`X-Client-Type`) header be trusted without signature check?
  * **Why it matters:** An attacker could send `X-Client-Type: mobile` to bypass login attendance clock-in triggers while still accessing desktop web APIs, or conversely, fake being a web client to bypass mobile mutating blocks.
  * **Relevant code:** [auth.ts:L61-70](file:///c:/Users/siddharth/Desktop/Repos/Mayzax/backend/src/middleware/auth.ts#L61-70)

* **Question:** Is there a session limit per user, or can an infinite number of refresh tokens coexist?
  * **Why it matters:** Left unchecked, token accumulation could cause database bloat or open session hijacking risks.
  * **Relevant code:** [auth.service.ts:L117-128](file:///c:/Users/siddharth/Desktop/Repos/Mayzax/backend/src/modules/auth/auth.service.ts#L117-128)

---

## 4. Test Coverage Summary

| Area | Scenarios | Test Cases | Priority |
| :--- | :---: | :---: | :--- |
| Login | 4 | 7 | Critical |
| Input Validation | 2 | 4 | High |
| Access Token | 2 | 4 | Critical |
| Refresh Token | 3 | 5 | Critical |
| Logout | 2 | 3 | High |
| Protected Routes | 2 | 4 | Critical |
| Authorization | 2 | 4 | Critical |
| Client Type | 2 | 3 | High |
| Cookies | 1 | 2 | High |
| Rate Limiting | 1 | 2 | High |
| Security | 2 | 4 | Critical |
| Error Handling | 1 | 2 | High |

---

## 5. Requirements Traceability

* **REQ-AUTH-01 (Stateless Auth):** Verified by `AUTH-SC-07`, `AUTH-SC-08`.
* **REQ-AUTH-02 (Token Rotation):** Verified by `AUTH-SC-10`, `AUTH-SC-11`.
* **REQ-AUTH-03 (Client Restrictions):** Verified by `AUTH-SC-15`, `AUTH-SC-18`.
* **REQ-AUTH-04 (Role Security):** Verified by `AUTH-SC-16`, `AUTH-SC-17`.
