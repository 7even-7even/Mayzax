# Mayzax Updates Testing Cases - Retrievals

This file documents the detailed test cases for retrieving system updates and target role filtering.

---

### Test Case ID: UPD-GET-001
Scenario ID: UPD-SC-01
Module: Updates
Title: Recruiter retrieves updates list (filters by role)
Priority: High
Severity: Medium
Type: Positive
Platform: Web / Mobile

Preconditions:
- DB contains 3 system updates:
  * Update A: Targets `"CLIENT"` roles.
  * Update B: Targets `"RECRUITER"` roles.
  * Update C: Targets all roles (`roles = []`).

Steps:
1. Send `GET /api/v1/updates` authenticated as Recruiter.

Expected Result:
- Status Code: `200 OK`.
- Response contains:
  * `updates` array includes Update B and Update C (Update A is filtered out).
  * `unreadCount` calculated based on read logs mapping.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: UPD-GET-002
Scenario ID: UPD-SC-02
Module: Updates
Title: Admin creates a system update with Google Drive attachment
Priority: Medium
Severity: Low
Type: Positive
Platform: Web

Preconditions:
- Authenticated user has Admin role.

Test Data:
Body:
```json
{
  "title": "New Portal Launch",
  "description": "We have launched the new companion app.",
  "pdfUrl": "https://drive.google.com/file/d/123/view",
  "roles": ["RECRUITER"]
}
```

Steps:
1. Send `POST /api/v1/updates` with the given parameters.

Expected Result:
- Status Code: `200 OK` (or `201 Created`).
- Database Verification:
  * A new `SystemUpdate` is created.
  * `pdfOriginalName` is automatically resolved to `"Google Drive Document"`.
  * Creator user automatically has a `UserUpdateRead` record created.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:
Tests fallback name resolution logic for external document URLs.
