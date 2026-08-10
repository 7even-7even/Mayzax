# Mayzax Session Management & Heartbeats Testing Scenarios

This document outlines the testing scenarios for the Session Management (Token Lifetimes, Rotation, Revocation) and periodic Activity Heartbeats (Inactivity Auto-Closing) modules of the Mayzax ATS.

---

## 1. Discovered Session & Heartbeat Architecture

```text
Session Lifecycle (Web, Mobile, Extension)
  ↓
Token Issuance:
- Access Token (JWT, 15-minute lifespan): Contains client properties (`clientType`, `role`, `email`, `sub`).
- Refresh Token (JWT, 7-day lifespan): Persistent session identifier stored in database (`refresh_tokens` table) as SHA-256 hash.
  ↓
Session Maintenance:
- Heartbeat requests (`POST /api/v1/activity/heartbeat`) periodically sent from browser client every few minutes.
- Updates `lastHeartbeatAt` and `lastActiveAt` fields in the `users` table.
- Detects stale session: If no heartbeat is received for more than 40 minutes while in `ACTIVE` status, the server auto-terminates the active session and creates an `OFFLINE` record starting at the last known heartbeat timestamp.
  ↓
Session Refresh & Rotation:
- Rotate: If the refresh token has less than 24 hours of remaining lifetime, a new token pair is generated (revoking the old one).
- Reuse: If more than 24 hours remain, a new access token is signed using the same refresh token.
  ↓
Session Revocation (Logout / Password Change):
- Explicit Logout: Revokes the specific refresh token.
- Password Reset/Change: Mass-revokes ALL active refresh tokens/sessions for the user in the database.
```

---

## 2. High-Level Test Scenarios

### A. Session Management Scenarios
* **SESS-SC-01:** Verify generation and storage of token pairs upon authentication.
* **SESS-SC-02:** Verify single session revocation (explicit logout) clears active tokens.
* **SESS-SC-03:** Verify multi-device session handling (ensuring multiple active refresh tokens can coexist).
* **SESS-SC-04:** Verify cascade revocation of all active sessions upon password change or security answer reset.
* **SESS-SC-05:** Verify reuse detection and instant invalidation of all user sessions when a previously rotated refresh token is re-submitted.

### B. Heartbeat & Inactivity Scenarios
* **SESS-SC-06:** Verify periodic heartbeat registration updates user active timestamps.
* **SESS-SC-07:** Verify auto-close triggers when a heartbeat is missing for > 40 minutes while working (`ACTIVE`).
* **SESS-SC-08:** Verify page reloads or short network blips (< 40 minutes) do not close the session or disrupt status tracking.

---

## 3. Open Testing Questions
* **Question:** Is there a maximum limit on the total number of concurrent active sessions allowed per user?
  * **Why it matters:** An attacker could generate unlimited sessions, causing session accumulation and database bloat.
  * **Relevant code:** [auth.service.ts:L117-128](file:///c:/Users/siddharth/Desktop/Repos/Mayzax/backend/src/modules/auth/auth.service.ts#L117-128)

---

## 4. Test Coverage Summary

| Area | Scenarios | Test Cases | Priority |
| :--- | :---: | :---: | :--- |
| Session Lifecycles | 5 | 7 | Critical |
| Heartbeat & Inactivity | 3 | 4 | Critical |
