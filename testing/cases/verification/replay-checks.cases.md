# Mayzax Verification Testing Cases - Replay Checks

This file documents the detailed test cases for duplicate detection, hash collisions, and reference ID fraud monitoring.

---

### Test Case ID: VER-REP-001
Scenario ID: VER-SC-03
Module: Verifications
Title: Re-submitting identical evidence by same recruiter returns isReplay true
Priority: Critical
Severity: High
Type: Positive
Platform: Web

Preconditions:
- Recruiter has already verified evidence A (generates verification hash `"mock-hash-123"`).

Steps:
1. Re-send identical evidence A authenticated as the same recruiter.

Expected Result:
- Status Code: `200 OK` (returns the original result log).
- Response contains:
  * `isReplay` = `true`.
  * `fraudSignals` contains `"REPLAY_DETECTED"`.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:

---

### Test Case ID: VER-REP-002
Scenario ID: VER-SC-04
Module: Verifications
Title: Flag duplicate application reference codes submitted by different recruiters
Priority: High
Severity: Medium
Type: Negative
Platform: Web

Preconditions:
- Recruiter A has verified evidence with reference code `"REF-ABC-XYZ"`.

Steps:
1. Recruiter B submits evidence containing the identical reference code `"REF-ABC-XYZ"`.

Expected Result:
- Status Code: `200 OK` (or accepted with warning).
- Response contains:
  * `fraudSignals` contains `"DUPLICATE_REFERENCE_DIFFERENT_RECRUITER"`.
  * `reasons` list explains that the reference code was already used by another recruiter.

Actual Result:
[To be filled during execution]

Status:
NOT_EXECUTED

Notes:
Identifies collusion where recruiters share verification parameters to fake applications count.
