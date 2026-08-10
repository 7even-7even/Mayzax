# Mayzax Profile Changes Testing Cases - Submissions

This file documents the detailed test cases for profile change request submissions, field validation, and ownership constraints.

---

### Test Case ID: PR-SUB-001
Scenario ID: PR-CHG-01
Module: Profile Changes
Title: Client submits change request with allowed and unallowed fields
Priority: High
Severity: Medium
Type: Positive
Platform: Web

Preconditions:
- Authenticated client user is linked to profile ID `"profile-uuid-123"`.

Test Data:
Body:
```json
{
  "changes": {
    "candidateName": "John Candidate Updated",
    "phone": "+1999999999",
    "currentSalary": "120000"
  }
}
```

Steps:
1. Send `POST /api/v1/profile-changes/profiles/profile-uuid-123` with the payload.

Expected Result:
- Status Code: `200 OK`.
- Database Verification:
  * A new `ClientProfileChangeRequest` row is created with status `PENDING`.
  * The `changes` JSON contains `"candidateName"` and `"phone"`.
  * The unallowed field `"currentSalary"` is successfully stripped out.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: PR-SUB-002
Scenario ID: PR-CHG-02
Module: Profile Changes
Title: Block user from submitting change requests for other profiles
Priority: High
Severity: High
Type: Negative
Platform: Web

Preconditions:
- User is linked to profile ID `"profile-uuid-123"`.
- Target profile ID is `"profile-uuid-other"`.

Steps:
1. Send `POST /api/v1/profile-changes/profiles/profile-uuid-other` with changes payload.

Expected Result:
- Status Code: `403 Forbidden`.
- Response contains message: `"You can only submit change requests for your own profile"`.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:
