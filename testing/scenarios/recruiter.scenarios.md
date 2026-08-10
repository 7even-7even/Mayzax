# Mayzax Recruiter & User Management Testing Scenarios

This document outlines the testing scenarios for the Recruiter and User Management module of the Mayzax ATS.

---

## 1. Discovered Recruiter Management Architecture

```text
User Actions (Web Portal Only)
  ↓
Create User (`POST /api/v1/recruiters`):
- Restriction: Admin role only.
- Validation: Zod `createRecruiterSchema` (name, email, password strength, default role = RECRUITER).
- Action: Checks for duplicate email, hashes password, saves record, and logs action `RECRUITER_CREATED`.
  ↓
Update User (`PATCH /api/v1/recruiters/:id`):
- Restriction: Admin role only.
- Demotion trigger: If a TEAM_LEADER is demoted to RECRUITER, all team-managed recruiters have their `createdById` cleared (set to null) and `teamName` is set to null.
  ↓
Toggle Active Status (`PATCH /api/v1/recruiters/:id/status`):
- Restriction: Admin role only.
- Protection: Users cannot deactivate their own accounts.
  ↓
Soft Delete User (`DELETE /api/v1/recruiters/:id`):
- Restriction: Admin role only.
- Cleanup: Clears `assignedRecruiterId` (sets to null) on all assigned client profiles to allow workload reassignment, deletes assignments in `client_profile_assignments`, and soft deletes user.
  ↓
Team Name Update (`PATCH /api/v1/recruiters/me/team-name`):
- Restriction: Team Leader role only.
- Action: Updates the `teamName` field.
  ↓
Recruiter Stats (`GET /api/v1/recruiters/:id/stats`):
- Restriction: Admin can view all; Team Leader can only view stats of recruiters they manage (where `createdById === TL.id`).
```

---

## 2. High-Level Test Scenarios

### A. User Lifecycle Scenarios
* **REC-SC-01:** Create a new user with various roles (`RECRUITER`, `TEAM_LEADER`, `CLIENT`, etc.) and ensure passwords are hashed.
* **REC-SC-02:** Attempt duplicate email registration.
* **REC-SC-03:** Update user information (changing role, email, and handling demotions).
* **REC-SC-04:** Toggle active status (deactivating and reactivating accounts, self-deactivation protection).
* **REC-SC-05:** Soft-delete user and verify active profile assignments are cleared.

### B. Team Management Scenarios
* **REC-SC-06:** Update team name for Team Leaders and verify rejection for other roles.
* **REC-SC-07:** Verify list pagination, search queries, and role/active filtering.

### C. Statistics Scenarios
* **REC-SC-08:** Retrieve recruiter productivity metrics and check access permissions.

---

## 3. Test Coverage Summary

| Area | Scenarios | Test Cases | Priority |
| :--- | :---: | :---: | :--- |
| Creation & Registration | 2 | 3 | Critical |
| Updates & Demotions | 2 | 4 | Critical |
| Deactivations & Deletes | 2 | 3 | Critical |
| Team & Lists | 2 | 3 | High |
| Statistics | 1 | 2 | High |
