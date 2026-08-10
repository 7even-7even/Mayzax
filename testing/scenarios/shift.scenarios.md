# Mayzax Shift Configurations & Attendance Computations Testing Scenarios

This document outlines the testing scenarios for the User Shift Configurations and daily Attendance Rollups (expected hours, break times, and lateness penalties) in the Mayzax ATS.

---

## 1. Discovered Shift & Attendance Architecture

```text
Shift Resolution Lifecycle
  ↓
Fetch Configuration (`GET /api/v1/shifts/me`):
- Active User check.
- Resolution logic (`resolveUserShiftConfig`): Looks up assigned `shiftConfig`. If none exists or config is inactive, falls back to `getDefaultShiftConfig` (system default row or environment fallback variables).
  ↓
Shift Window Calculations (`getShiftWindowForDate`):
- Resolves calendar day ranges for shifts.
- Night Shift handling: If a shift spans midnight (start hour > end hour), the end UTC instant is automatically pushed to the following calendar day.
  ↓
Attendance Rollup Calculations (`computeAttendanceDay`):
- Rollup variables: total logged in time, productive time, detailed break times, status changes.
- Grace Thresholds: Computes lateness comparing first login time against shift start time (allowing grace minute buffers).
- Penalties: Calculates penalty minutes if arrival exceeds grace threshold.
```

---

## 2. High-Level Test Scenarios

### A. Shift Configuration Scenarios
* **SH-SC-01:** Resolve custom active shift config assigned to user.
* **SH-SC-02:** Fall back to environment configurations when no database configurations exist.
* **SH-SC-03:** Map shift window for standard day shift.
* **SH-SC-04:** Map shift window for night shift spanning midnight (+1 calendar day logic).

### B. Attendance rollup Scenarios
* **SH-SC-05:** Calculate attendance logs for punctual check-in (lateness = 0, penalty = 0).
* **SH-SC-06:** Calculate attendance logs for late check-in (exceeding grace minutes triggers lateness penalty).
* **SH-SC-07:** Calculate break breakdowns matching allowed limits.

---

## 3. Test Coverage Summary

| Area | Scenarios | Test Cases | Priority |
| :--- | :---: | :---: | :--- |
| Shift Configurations | 4 | 4 | Critical |
| Attendance Math | 3 | 4 | High |
