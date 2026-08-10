# Mayzax Client Profiles Testing Scenarios

This document outlines the testing scenarios for the Client Profiles Creation, Recruiter assignment syncs, and ownership validation boundaries in the Mayzax ATS.

---

## 1. Discovered Profiles Architecture

```text
Team Leader / Admin Action
  ↓
Create Profile (`POST /api/v1/profiles`):
- Restriction: Admin & Team Leader only. Recruiters and Resume Assist roles are blocked.
- Recruiter Verification (`assertRecruitersExist`):
  * Checks assigned recruiter IDs count is between 1 and 5.
  * Checks that recruiters exist and are active.
  * Team Leader restriction: Assigned recruiters must belong to the TL's team.
- Duplicate Filters:
  * Rejects if email (case-insensitive) or phone number already matches another active profile.
  ↓
Update Profile (`PATCH /api/v1/profiles/:id`):
- Ownership check: Recruiters can only modify details for profiles assigned to them.
- Name protection: Recruiters are forbidden from modifying candidate names.
  ↓
Assign Recruiter (`PATCH /api/v1/profiles/:id/assign`):
- Restriction: Admin & Team Leader only.
- Action: Synchronizes secondary recruiter assignments.
```

---

## 2. High-Level Test Scenarios

### A. Profile Creation Scenarios
* **PROF-SC-01:** Create a new client profile successfully with assigned recruiters.
* **PROF-SC-02:** Block profile creation if duplicate email or phone number is provided.
* **PROF-SC-03:** Restrict recruiter roles from creating client profiles.
* **PROF-SC-04:** Restrict Team Leader from assigning recruiters outside their managed team.

### B. Profile Updates Scenarios
* **PROF-SC-05:** Block recruiter from updating details of unassigned profiles.
* **PROF-SC-06:** Block recruiter from editing candidate name (restricted parameter update check).
