# Mayzax Analytics Testing Cases - Daily Trend Counts

This file documents the test cases for daily application submission statistics.

---

### Test Case ID: ANA-TREND-001
Scenario ID: ANA-SC-06
Module: Analytics
Title: Fetch daily trend counts with recruiter filter
Priority: High
Severity: Medium
Type: Positive
Platform: Web

Preconditions:
- Recruiter A has applications submitted on 2026-08-01 (3 submissions) and 2026-08-02 (5 submissions).

Test Data:
Query: `?recruiterId=:recruiter_a_id&from=2026-08-01&to=2026-08-03`

Steps:
1. Send `GET /api/v1/analytics/daily-counts?recruiterId=:recruiter_a_id&from=2026-08-01&to=2026-08-03` as Admin.

Expected Result:
- Status Code: `200 OK`.
- Response contains an array:
   ```json
   [
     { "businessDate": "2026-08-01", "count": 3 },
     { "businessDate": "2026-08-02", "count": 5 }
   ]
   ```

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:
Uses raw database query grouping by businessDate.
