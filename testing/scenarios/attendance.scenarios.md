# Mayzax Attendance Read Service Testing Scenarios

This document outlines the testing scenarios for the Mobile-friendly Attendance aggregation and summary endpoints in the Mayzax ATS.

---

## 1. Discovered Attendance Read Architecture

```text
User Device request
  ↓
Today's Summary (`GET /api/v1/attendance/today`):
- Restriction: Authenticated user.
- Actions:
  * Resolves user metadata and active manager details.
  * Calls `computeAttendanceDay` to get absolute worked seconds, productive seconds, and break durations.
  * Calls `getCurrentStatus` to check if user has an active break.
  * Combines these details to compute allowed/used/remaining break seconds and remaining work hours.
  ↓
Historical Logs (`GET /api/v1/attendance/history`):
- Action: Returns paginated attendance days for the requester or team members.
  ↓
Monthly Summary (`GET /api/v1/attendance/month-summary`):
- Action: Aggregates total present days, late count, and total penalty minutes for the current calendar month.
```

---

## 2. High-Level Test Scenarios

### A. Today's Summary DTO compiler Scenarios
* **ATT-SC-01:** Retrieve today's attendance summary while working (active status, computes worked hours).
* **ATT-SC-02:** Retrieve today's attendance summary while on break (calculates remaining break seconds and expiry).

### B. History & Month Rollups Scenarios
* **ATT-SC-03:** Fetch paginated attendance history lists.
* **ATT-SC-04:** Retrieve monthly attendance rollups (counts for present, absent, half-days, and total penalties).
