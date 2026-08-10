# Mayzax Shift Testing Cases - Shift Configurations

This file documents the detailed test cases for shift configurations, defaults, and boundary mapping calculations.

---

### Test Case ID: SH-CONFIG-001
Module: Shifts
Title: Resolve user custom active shift config
Priority: Critical
Severity: High
Type: Positive
Platform: Web

Preconditions:
- User has an active custom `shiftConfig` assigned (e.g. US Shift, startHour=18, startMinute=30).

Steps:
1. Trigger `resolveUserShiftConfig` for the user ID.

Expected Result:
- Returns resolved configuration object matching the custom database record.
- Attributes match the custom values (timezone, break allowed seconds).

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: SH-CONFIG-002
Module: Shifts
Title: Fallback to environment variables when no configuration exists
Priority: High
Severity: Medium
Type: Positive
Platform: Web

Preconditions:
- No database `shiftConfig` records exist.

Steps:
1. Trigger `resolveUserShiftConfig` for a user without custom settings.

Expected Result:
- Returns resolved default configuration mapping values from environment variables (`BUSINESS_SHIFT_START_HOUR`, etc.).

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: SH-CONFIG-003
Module: Shifts
Title: Shift window calculation for day shift
Priority: High
Severity: Medium
Type: Positive
Platform: Web

Preconditions:
- Day Shift configuration (startHour = 9, endHour = 17).

Steps:
1. Run `getShiftWindowForDate` for business date `"2026-08-10"`.

Expected Result:
- Start UTC Date: `2026-08-10T03:30:00.000Z` (9:00 AM IST in UTC).
- End UTC Date: `2026-08-10T11:30:59.999Z` (5:00 PM IST in UTC).

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: SH-CONFIG-004
Module: Shifts
Title: Shift window calculation for night shift (crossing midnight)
Priority: Critical
Severity: High
Type: Positive
Platform: Web

Preconditions:
- Night Shift configuration (startHour = 18, endHour = 9).

Steps:
1. Run `getShiftWindowForDate` for business date `"2026-08-10"`.

Expected Result:
- Start UTC Date: `2026-08-10T12:30:00.000Z` (6:00 PM IST on 10th in UTC).
- End UTC Date: `2026-08-11T03:30:59.999Z` (9:00 AM IST on 11th in UTC).
- The end instant is successfully pushed to the next calendar date.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:
