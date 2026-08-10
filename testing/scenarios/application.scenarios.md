# Mayzax Job Application Submission & Verification Testing Scenarios

This document outlines the testing scenarios for the Job Application Submission, duplicate prevention constraints, and extension-based verification assertions in the Mayzax ATS.

---

## 1. Discovered Applications Architecture

```text
Recruiter Action (Submit Job Link)
  ↓
Normalize Link (`normalizeJobLink`):
- Strips URL tracking parameters, trailing slashes, casing, etc.
- Detects the Job Portal from the domain (e.g. LinkedIn, Indeed).
  ↓
Create Application (`POST /api/v1/applications`):
- Permission Boundary: Recruiters can only submit links for profiles assigned to them or their managed team members.
- Duplicate Pre-check: If this `(profileId, normalizedJobLink)` combination already exists, immediately returns a `409 Conflict`.
- DB-Level Constraint: Unique index `(profile_id, normalized_job_link)` acts as a race-condition guard.
  ↓
Enterprise v1 Verification (`verificationHash`):
- Hash verification: Checks `verificationLog` in database.
- Validity Boundaries:
  * Ownership: Must belong to calling recruiter.
  * TTL: Must not exceed verification hash TTL limit (e.g. 15 mins).
  * URL Match: Hash normalized link must match target normalized link.
  * Replay Protection: Prevents reusing used verification hashes.
```

---

## 2. High-Level Test Scenarios

### A. Application Submission & Duplicates Scenarios
* **APP-SC-01:** Submit a new job application successfully (generates business date, detects portal, normalized link).
* **APP-SC-02:** Retrieve error when submitting duplicate application (pre-check path returns `409 Conflict`).
* **APP-SC-03:** Enforce permission boundaries (recruiters cannot submit links for unassigned profiles).

### B. Extension Verification Scenarios
* **APP-SC-04:** Register verified application with high-confidence extension hash successfully.
* **APP-SC-05:** Block application submission if verification hash is expired (TTL checks).
* **APP-SC-06:** Block submission if verification hash is reused (replay attack prevention).
