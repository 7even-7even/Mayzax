# Mayzax Analytics Testing Scenarios

This document outlines the testing scenarios for the Job Application Analytics, Dashboards, Trend Charts, and Global summary calculations in the Mayzax ATS.

---

## 1. Discovered Analytics Architecture

```text
User Actions (Web / Dashboard Portal)
  ↓
Job Portal Analytics (`GET /api/v1/analytics/job-portals`):
- Restriction: All roles.
- Scoping: Scoped by recruiter (Recruiter role only sees their own; Team Leader sees their own + direct team members; Admin sees all).
- Query Options: `scope` ('all' | 'currentShift' | 'custom'), `from`/`to` filters.
  ↓
Dashboard Overview (`GET /api/v1/analytics/dashboard`):
- Restriction: Admin & Team Leader only.
- Scoping: Scoped by TL managing relationship if actor is TEAM_LEADER.
- Output: List of recruiters with total applications, current shift applications, and assigned profile count.
  ↓
Recruiter Breakdown (`GET /api/v1/analytics/dashboard/:id/breakdown`):
- Restriction: Admin & Team Leader only.
- Protection: Team Leader can only view breakdown for recruiters on their own team.
  ↓
Daily Trend Counts (`GET /api/v1/analytics/daily-counts`):
- Restriction: Admin & Team Leader only.
- Action: Employs raw SQL group-by logic by `businessDate` to calculate daily trend lines.
  ↓
Global Summary (`GET /api/v1/analytics/summary`):
- Restriction: All roles.
- Output: Role breakdown stats, active/break status counts, top performer calculations.
```

---

## 2. High-Level Test Scenarios

### A. Job Portal Analytics Scenarios
* **ANA-SC-01:** Retrieve job portal analytics with recruiter scope (returns only self submissions).
* **ANA-SC-02:** Retrieve job portal analytics with custom date range filters.

### B. Dashboard Overview Scenarios
* **ANA-SC-03:** Retrieve dashboard overview as Admin (returns all recruiters).
* **ANA-SC-04:** Retrieve dashboard overview as Team Leader (returns only team-managed recruiters).
* **ANA-SC-05:** Retrieve recruiter breakdown with authorization check (non-managing TL is blocked).

### C. Daily Trend Counts Scenarios
* **ANA-SC-06:** Retrieve daily trend counts with recruiter filter.

### D. Global Summary Scenarios
* **ANA-SC-07:** Retrieve global summary as Recruiter (returns personal counts only, global counts zeroed).
* **ANA-SC-08:** Retrieve global summary as Admin (calculates team lists, active status rollups, and top performer).
