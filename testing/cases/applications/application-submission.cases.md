# Mayzax Applications Testing Cases - Submission

This file documents the detailed test cases for application creations, normalization rules, and duplicate filters.

---

### Test Case ID: APP-SUB-001
Scenario ID: APP-SC-01
Module: Applications
Title: Submit application successfully with link normalization
Priority: Critical
Severity: Critical
Type: Positive
Platform: Web

Preconditions:
- Profile exists and is assigned to the recruiter.

Test Data:
Body:
```json
{
  "profileId": "profile-uuid-123",
  "jobLink": "https://www.linkedin.com/jobs/view/12345/?refId=abc&trackingId=xyz",
  "companyName": "Tech Corp",
  "jobTitle": "Node Developer",
  "applicationCompleted": true
}
```

Steps:
1. Send `POST /api/v1/applications` authenticated as Recruiter.

Expected Result:
- Status Code: `200 OK` (or `201 Created`).
- Response contains:
  * `normalizedJobLink` = `"https://linkedin.com/jobs/view/12345"` (tracking params removed).
  * `jobPortal` = `"LINKEDIN"` (detected automatically).
  * `businessDate` calculated correctly.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: APP-SUB-002
Scenario ID: APP-SC-02
Module: Applications
Title: Block duplicate application submission (Pre-check)
Priority: Critical
Severity: Critical
Type: Negative
Platform: Web

Preconditions:
- Profile has already applied to `"https://linkedin.com/jobs/view/12345"`.

Test Data:
Body:
```json
{
  "profileId": "profile-uuid-123",
  "jobLink": "https://www.linkedin.com/jobs/view/12345/?refId=different",
  "companyName": "Tech Corp",
  "jobTitle": "Node Developer",
  "applicationCompleted": true
}
```

Steps:
1. Send `POST /api/v1/applications` as Recruiter.

Expected Result:
- Status Code: `409 Conflict`.
- Response JSON details:
   ```json
   {
     "success": false,
     "error": {
       "message": "This profile has already applied to this job. Duplicate submissions for the same profile are not allowed."
     }
   }
   ```

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: APP-SUB-003
Scenario ID: APP-SC-03
Module: Applications
Title: Recruiter cannot submit applications for unassigned profiles
Priority: High
Severity: High
Type: Negative
Platform: Web

Preconditions:
- Profile belongs to Recruiter B.
- Requesting user is Recruiter A.

Steps:
1. Send `POST /api/v1/applications` as Recruiter A for B's profile.

Expected Result:
- Status Code: `404 Not Found` (returning profile not found due to permission scope).

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:
Checks data leakage protection boundaries.
