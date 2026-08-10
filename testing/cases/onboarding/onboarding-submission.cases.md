# Mayzax Onboarding Testing Cases - Submissions

This file documents the detailed test cases for public onboarding form submissions and duplicate detection guards.

---

### Test Case ID: ONB-SUB-001
Scenario ID: ONB-SC-01
Module: Onboarding
Title: New applicant submits onboarding form successfully
Priority: Critical
Severity: Critical
Type: Positive
Platform: Web

Preconditions:
- No existing ClientProfile or PENDING onboarding with matching email/phone.

Test Data:
Body:
```json
{
  "fullName": "Jane Smith",
  "email": "jane.smith@example.com",
  "phone": "+12025550100",
  "technology": "Python/Django",
  "skills": "Python, Django, REST APIs",
  "planSelected": "Gold",
  "amountPaid": 2500,
  "paymentRef": "TXN-ABC-001",
  "declared": true,
  "dateOfBirth": "1995-06-15",
  "gender": "Female",
  "visaStatus": "H1B",
  "currentLocation": "New York, NY",
  "education": [{ "qualification": "B.Sc", "fieldOfStudy": "CS", "specialization": "Software", "instituteName": "NYU", "startDate": "2013", "currentlyOngoing": false, "endDate": "2017" }],
  "addressHistory": [{ "state": "NY", "country": "USA", "fromDate": "2018", "toDate": "present" }],
  "hasExperience": true,
  "experienceDetails": "3 years backend development"
}
```

Steps:
1. Send `POST /api/v1/onboarding` (no auth) with the given body.

Expected Result:
- Status Code: `200 OK` (or `201 Created`).
- Database Verification:
  * A new `ClientOnboarding` row is created.
  * `status` = `"PENDING"`.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: ONB-SUB-002
Scenario ID: ONB-SC-02
Module: Onboarding
Title: Block submission if active ClientProfile already exists with same email
Priority: Critical
Severity: Critical
Type: Negative
Platform: Web

Preconditions:
- Active `ClientProfile` with email `"jane.smith@example.com"` exists.

Steps:
1. Send `POST /api/v1/onboarding` with the same email.

Expected Result:
- Status Code: `400 Bad Request`.
- Response contains message: `"A client profile with this Email or Phone Number already exists."`.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: ONB-SUB-003
Scenario ID: ONB-SC-03
Module: Onboarding
Title: Block submission if PENDING onboarding already exists with same phone
Priority: High
Severity: High
Type: Negative
Platform: Web

Preconditions:
- PENDING `ClientOnboarding` with phone `"+12025550100"` already exists.

Steps:
1. Send `POST /api/v1/onboarding` with the same phone.

Expected Result:
- Status Code: `400 Bad Request`.
- Response contains message: `"An onboarding application with this Email or Phone Number is already pending review."`.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:
