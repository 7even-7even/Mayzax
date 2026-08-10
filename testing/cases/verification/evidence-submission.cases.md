# Mayzax Verification Testing Cases - Evidence Submission

This file documents the detailed test cases for validating evidence schemas and calculating scores.

---

### Test Case ID: VER-SUB-001
Scenario ID: VER-SC-01
Module: Verifications
Title: Submit valid Chrome Extension evidence successfully
Priority: Critical
Severity: Critical
Type: Positive
Platform: Web

Preconditions:
- None.

Test Data:
Body:
```json
{
  "evidence": {
    "hostname": "linkedin.com",
    "pathname": "/jobs/view/12345",
    "fullUrl": "https://www.linkedin.com/jobs/view/12345",
    "portal": "LINKEDIN",
    "verificationTimestamp": "2026-08-10T12:00:00.000Z",
    "applicationReference": "REF-999-ABC",
    "htmlContent": "<html><body>Your application has been submitted successfully</body></html>",
    "evidenceVersion": "2.0"
  }
}
```

Steps:
1. Send `POST /api/v1/verifications/verify-evidence` with the given parameters.

Expected Result:
- Status Code: `200 OK`.
- Response contains:
  * `verified` = `true`.
  * `score` >= `40`.
  * `confidence` level resolved.
  * A 64-char `verificationHash` generated from the evidence elements.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: VER-SUB-002
Scenario ID: VER-SC-02
Module: Verifications
Title: Block evidence submission with invalid parameters (e.g. missing URL)
Priority: High
Severity: Medium
Type: Negative
Platform: Web

Test Data:
Body:
```json
{
  "evidence": {
    "hostname": "",
    "pathname": "/jobs/view/12345",
    "verificationTimestamp": "2026-08-10T12:00:00.000Z"
  }
}
```

Steps:
1. Send `POST /api/v1/verifications/verify-evidence` with the invalid parameters.

Expected Result:
- Status Code: `400 Bad Request`.
- Response contains validation error message details.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:
