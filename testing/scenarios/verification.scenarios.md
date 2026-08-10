# Mayzax Submission Verification Testing Scenarios

This document outlines the testing scenarios for the Chrome Extension Evidence Submission and server-side scoring verification in the Mayzax ATS.

---

## 1. Discovered Verification Architecture

```text
Extension (Submits raw HTML / session details)
  ↓
Verify Evidence (`POST /api/v1/verifications/verify-evidence`):
- Restriction: Authenticated user.
- Evidence Validation (`EvidenceValidator`): Checks schema parameters, domain hostname mapping, and matches timestamps.
- Service Scoring (`VerificationScorer`): Calculates verification score based on HTML indicators.
  * Score >= 40: Verified = true.
  * Confidence: LOW, MEDIUM, or HIGH based on score threshold.
- Replay Protection: Checks if verification hash already exists.
  * Same Recruiter: Returns result with `isReplay: true`.
  * Different Recruiter: Notes `HASH_COLLISION_DIFFERENT_RECRUITER` fraud signals.
- Reference Checking: Checks if the application reference code has been reused across other recruiters.
- Database Logging: Stores `VerificationLog` in the database.
```

---

## 2. High-Level Test Scenarios

### A. Evidence Validation & Scoring Scenarios
* **VER-SC-01:** Submit valid evidence successfully (returns score, confidence, and generated hash).
* **VER-SC-02:** Block evidence submission containing invalid schemas (e.g. future timestamps or missing domain hostnames).

### B. Replay & Reference Fraud Scenarios
* **VER-SC-03:** Verify same recruiter replay return blocks.
* **VER-SC-04:** Flag duplicate application reference codes submitted by different recruiters.
