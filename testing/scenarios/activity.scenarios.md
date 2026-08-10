# Mayzax Login Hours & Activity Testing Scenarios

This document outlines the testing scenarios for the Login Hours, Activity Logs, and Heartbeat tracking modules of the Mayzax ATS.

---

## 1. Discovered Activity & Login Hours Architecture

```text
User Actions (Web Portal Only)
  ↓
Status Mutations (`POST /api/v1/activity/status`):
- Accepts `status` (UserStatus Enum) and `optionalNote`.
- Validation: Verifies actor role is trackable (RECRUITER, TEAM_LEADER, RESUME_ASSIST, SALES_EXEC).
- Action: Closes previous active `ActivityLog` (updates `endedAt` to now), creates new `ActivityLog` with `startedAt = now` and `endedAt = null` (unless OFFLINE).
- Side Effect: Schedules mobile reminders if starting breaks or returning to ACTIVE.
  ↓
Periodic Heartbeats (`POST /api/v1/activity/heartbeat`):
- Triggered by web app every few minutes to prove activity.
- Auto-Close Logic: If current status is ACTIVE and `lastHeartbeatAt` is older than 40 minutes, auto-closes the active log at `lastHeartbeatAt` and creates a new OFFLINE log starting at that time (with note "Disconnected due to inactivity").
- Updates: Refreshes `lastHeartbeatAt` and `lastActiveAt` to `now`.
  ↓
Read Endpoints:
- `GET /api/v1/activity/current`: Fetches logged-in user's active status and current duration.
- `GET /api/v1/activity/today`: Returns complete breakdown of today's login time, productive time, break times (short break, dinner break, briefing, meeting, system issue), first login time, and last logout time.
- `GET /api/v1/activity/live-status` (Admin/TL only): Live grid of currently online users and active states.
```

---

## 2. High-Level Test Scenarios

### A. Status Transition Scenarios
* **ACT-SC-01:** Verify default start status (ACTIVE) upon successful web login.
* **ACT-SC-02:** Transition successfully from ACTIVE to various break statuses (e.g. `SHORT_BREAK`, `DINNER_BREAK`, `MEETING`) and verify old log is closed.
* **ACT-SC-03:** Transition to `OFFLINE` (logout) and verify all logs are closed.
* **ACT-SC-04:** Attempt to change status for untracked roles (e.g. `ADMIN` or `CLIENT`) and verify rejection.

### B. Heartbeat & Inactivity Auto-Close Scenarios
* **ACT-SC-05:** Verify successful heartbeat updates `lastActiveAt` and `lastHeartbeatAt` timestamps.
* **ACT-SC-06:** Verify inactivity auto-close (no heartbeat for > 40 minutes) terminates the active log at the last heartbeat timestamp and opens an OFFLINE log.

### C. Time Calculation & Daily Summary Scenarios
* **ACT-SC-07:** Verify correctness of daily login hours, productive hours, and detailed break seconds breakdown inside `GET /today`.
* **ACT-SC-08:** Verify page refreshes do not disrupt or reset an active in-progress status timer.

### D. Monitoring & Authorization Scenarios
* **ACT-SC-09:** Verify Admin/TL access to `live-status` report.
* **ACT-SC-10:** Verify non-Admin/TL role access is blocked on `live-status` and `attendance` reports.

---

## 3. Open Testing Questions
* **Question:** Is there a max limit on individual break durations (e.g. does the system auto-offline a user if they stay on `SHORT_BREAK` for 5 hours)?
  * **Why it matters:** If not, a user could remain on break indefinitely without triggering auto-close.
  * **Relevant code:** [activity.service.ts:L215-239](file:///c:/Users/siddharth/Desktop/Repos/Mayzax/backend/src/modules/activity/activity.service.ts#L215-239)

---

## 4. Test Coverage Summary

| Area | Scenarios | Test Cases | Priority |
| :--- | :---: | :---: | :--- |
| Status Changes | 4 | 5 | Critical |
| Heartbeat & Inactivity | 2 | 3 | Critical |
| Hours Calculation | 2 | 3 | High |
| Admin Reports | 2 | 3 | High |
