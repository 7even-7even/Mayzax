# Mayzax Applications Testing Cases - Extension Verification

This file documents the detailed test cases for extension-based job submission verification and replay protections.

---

### Test Case ID: APP-VER-001
Scenario ID: APP-SC-04
Module: Applications
Title: Register verified application using valid extension hash
Priority: Critical
Severity: High
Type: Positive
Platform: Web

Preconditions:
- Valid `verificationLog` exists in DB with `confidence = "HIGH"` and `score = 90`.

Test Data:
Body:
```json
{
  "profileId": "profile-uuid-123",
  "jobLink": "https://linkedin.com/jobs/view/12345",
  "verificationHash": "valid-hash-64-chars-long-string-etc-etc-etc-etc-etc-etc-etc-etc-etc-etc-",
  "applicationCompleted": true
}
```

Steps:
1. Send `POST /api/v1/applications` containing the `verificationHash`.

Expected Result:
- Status Code: `200 OK`.
- Response contains:
  * `verified` = `true`.
  * `verificationMethod` matches expected extension string.
  * `verificationScore` = `90`.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: APP-VER-002
Scenario ID: APP-SC-05
Module: Applications
Title: Block submission using expired verification hash (TTL check)
Priority: High
Severity: Medium
Type: Negative
Platform: Web

Preconditions:
- `verificationLog` exists but was created 20 minutes ago (TTL limit = 15 minutes).

Steps:
1. Send `POST /api/v1/applications` with the expired hash.

Expected Result:
- Status Code: `400 Bad Request`.
- Response contains message: `"Verification hash expired — please re-verify via extension"`.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: APP-VER-003
Scenario ID: APP-SC-06
Module: Applications
Title: Block submission using already used verification hash (Replay Protection)
Priority: Critical
Severity: High
Type: Negative
Platform: Web

Preconditions:
- `verificationLog` has `isReplay = true` (or was already marked as used).

Steps:
1. Send `POST /api/v1/applications` using the replayed hash.

Expected Result:
- Status Code: `400 Bad Request`.
- Response contains details indicating a possible replay attack.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:
Prevents recruiters from reuse-submitting verified tags for random links.
