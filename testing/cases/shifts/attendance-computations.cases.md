# Mayzax Shift Testing Cases - Attendance Computations

This file documents the detailed test cases for daily attendance calculations, lateness grace boundaries, and penalty tracking.

---

### Test Case ID: SH-ATT-001
Module: Shifts
Title: Punctual check-in triggers no lateness penalty
Priority: High
Severity: Medium
Type: Positive
Platform: Web

Preconditions:
- Shift starts at 18:00 (Grace minutes = 15).
- User logs in at 18:10.

Steps:
1. Run `computeAttendanceDay` or evaluate calculations.

Expected Result:
- Lateness = 0 minutes.
- Penalty minutes = 0.
- Status is set to `PRESENT`.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: SH-ATT-002
Module: Shifts
Title: Late check-in exceeding grace limit triggers penalty minutes
Priority: Critical
Severity: High
Type: Negative
Platform: Web

Preconditions:
- Shift starts at 18:00 (Grace minutes = 15).
- User logs in at 18:25 (25 minutes late).
- Penalty per late minute = 1.0.

Steps:
1. Run `computeAttendanceDay` or evaluate calculations.

Expected Result:
- Lateness = 25 minutes (exceeds 15 grace limit).
- Penalty minutes = 25 minutes.
- Remarks include "Late arrival".

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:
Tests boundary thresholds where check-in latency exceeds grace intervals.
