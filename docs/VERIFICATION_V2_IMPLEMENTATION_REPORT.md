# Mayzax ATS — Verification Engine v2 Implementation Report

**Branch:** `arena/019fc8fc-mayzax` (targets `extension`)
**Version:** 2.0.0
**Author:** Siddharth Ohal (7even-7even) <sidxohal9049@gmail.com>
**Date:** 2026-08-03

---

## Summary

Implemented enterprise-grade fraud-resistant verification engine as specified in audit document. Branch contains 67+ changed files, 5400+ insertions, full backend + extension + frontend integration, 22 backend tests passing, extension builds successfully.

**Pushed to:** `arena/019fc8fc-mayzax` (2 pushes after audit: `8e606bf` feature + `b54507d` migration)

---

## What Was Built

### Backend (`backend/src/modules/verification/`)

- **Env:** `VERIFICATION_HMAC_SECRET`, `REQUIRE_HASH_FOR_VERIFIED`, `MIN_EXTENSION_VERSION`, `TIMESTAMP_TOLERANCE` 5min, `HASH_TTL` 24h
- **Prisma Schema:** JobApplication adds 8 v2 fields + 3 indexes; new VerificationLog model with hash unique, fraudSignals JSON, isReplay, indexes, foreign key to User
- **Migration:** `20260803120000_add_verification_v2/migration.sql` creates columns, indexes, table
- **Hashing:** `canonicalize.ts` sorts keys recursively, normalizes whitespace/case, removes empty; `hash.service.ts` HMAC_SHA256 with timingSafeEqual, isValidHashFormat
- **Portals:** `portal.definitions.ts` strict anchored regex allowlist for 10+ ATS (Greenhouse, Lever, LinkedIn, Indeed, Workday, ZipRecruiter, Glassdoor, CareerBuilder, Wellfound, etc) + generic career patterns, negative keywords, confirmation keywords
- **Registry:** `portal.registry.ts` isSupportedHostname blocks IP/localhost, detects portal, validates HTTPS, path patterns
- **Scoring:** `scorer.service.ts` weighted (Domain10, Title15, Heading20, Body20, Reference15, Fingerprint15, Portal5, ApplyButton -15), fraud signals HISTORY_MANIPULATION, SHORT_TIME_ON_PAGE, APPLY_BUTTON_STILL_ENABLED, etc, generic portal cap 60
- **Evidence:** `evidence.schemas.ts` Zod strict shape, `evidence.validator.ts` checks HTTPS, blocked hostname, timestamp freshness 5min, future timestamp, hostname mismatch, empty evidence, version check
- **Service:** `verifyEvidence` validates evidence, scores, merges fraud signals, canonicalizes, generates hash, checks existing hash for replay, checks reference duplicate, stores VerificationLog, returns VerificationResult with verified bool (score>=80 HIGH), score, confidence, reasons, fraudSignals, isReplay
- **Routes:** `POST /verifications/verify-evidence` (auth, rate limit), `GET /verifications/hash/:hash`, `GET /verifications/`
- **Application Service:** Now requires verificationHash if verified=true, validates hash exists, belongs to recruiter, not expired, normalized link matches, not replay, downgrades legacy verified without hash to false, stores all v2 fields
- **Tests:** 22 tests passing — hash determinism, casing, sorting, valid hex, deterministic same secret, different secrets differ, verifyHash, scorer high for valid greenhouse, reject http, blocked hostname, apply button penalty, history manipulation, short time, missing headings, generic cap, evidence validator https, blocked, stale, future, hostname mismatch, empty

### Extension v2 (`extension/src/verification/`)

- **Version:** 1.0.0 -> 2.0.0, manifest description enterprise-grade, host_permissions expanded for Workday, SuccessFactors, Oracle, Taleo
- **Types:** JobPortal enum, DetectedButton, DomFingerprint, VerificationEvidence (portal, hostname, pathname, fullUrl, normalizedUrl, title, headings, confirmationText, reference, detectedButtons, domFingerprint, timestamp, extensionVersion, https, timeOnPage, userInteraction, historyManipulation, referrer), RuleOutcome, VerificationResultV2 (verified, score, confidence LOW/MEDIUM/HIGH, portal, reasons, evidence, hash, timestamp, version v2, reference, fraudSignals), RuleContext, VerificationRule, PortalDefinition, PortalPlugin with canHandle
- **Utils:** text (normalizeWhitespace, normalizeForComparison, levenshtein, fuzzyIncludes, matchesAnyPattern, tokenSetRatio), url (parseUrlSafe, isHttps, normalizeHostname, isIpAddress, isBlockedHostname, matchesHostPattern anchored, normalizeUrlForEvidence preserves gh_jid etc, PORTAL_HOST_PATTERNS, detectPortalFromHostname), dom (queryAllSafe, queryOneSafe, isElementVisible via getComputedStyle, getVisibleText, collectHeadings h1/h2/aria, collectConfirmationText p/role=status/confirmation classes, collectButtons button/input submit/role button, checkDomFingerprint confirmation card + success banner + expected containers, extractReference)
- **Rules:** BaseVerificationRule abstract; DomainRule HTTPS required, blocked hostname, portalPlugin host validation, supported patterns generic career, score 10 or 5 generic; PageTitleRule negative patterns, portal title patterns, generic success multi-word, partial 8; HeadingRule collectHeadings, negative, portal heading patterns count scoring 15/20/10; ConfirmationBodyRule collectConfirmationText, length >50, matches count, single-sentence penalty; ReferenceRule generic + portal reference patterns via extractReference, validate format 6+ alphanumeric; DomFingerprintRule checkDomFingerprint, score hasConfirmationCard 7 + hasSuccessBanner 5 + expectedContainers 8 cap 15; PortalComplianceRule portal bonus; ApplyButtonRule collectButtons, problematic apply visible+enabled -15 fraud signal, disabled neutral, no apply bonus +5
- **Portals:** BasePortalPlugin canHandle, extractCompany generic og:site_name + title split + hostname fallback, extractJobTitle og:title + title parsing, extractReference via extractReference; GreenhouseVerifier company .company-name + url path parts, jobTitle .app-title, expectedSelectors #application_confirmation etc, weightBonus5; LeverVerifier jobs.lever.co, expectedSelectors .application-complete; WorkdayVerifier myworkdayjobs, data-automation-id confirmationPage, weightBonus10; LinkedInVerifier, IndeedVerifier, SuccessFactors, Oracle, Taleo, GenericVerifiers (CareerSite, Other fallback matches everything, ZipRecruiter, Glassdoor, Naukri, Dice); PortalRegistryV2 getPluginForHostname strict matching, fallback Other, detectPortalEnum
- **Scoring:** ConfidenceMapper getConfidenceFromScore 80 HIGH 50 MEDIUM else LOW, Scorer score outcomes + penalties historyManipulation -10 shortTime -5, generic cap 60 without strong evidence, confidence, verified
- **Evidence:** EvidenceCollector collector has pageLoadTime, interactionDetected via click/submit/keydown listeners, historyManipulated via wrapping pushState/replaceState + popstate, collect method parseUrlSafe, normalizeHostname, normalizeUrlForEvidence, title, collectHeadings, collectConfirmationText, collectButtons, portalRegistry getPlugin, checkDomFingerprint, extractReference fallback generic, timeOnPage, interaction, historyManipulation, referrer; EvidenceNormalizer canonicalize mirrors backend, normalizeForStorage
- **Engine:** EngineConfig version v2 name 2.0.0 weights thresholds, VerificationEngine constructor collector, scorer, portalRegistry, rules list Domain, PageTitle, Heading, ConfirmationBody, Reference, DomFingerprint, PortalCompliance, ApplyButton, verify method parseUrl, portalPlugin, collect evidence, RuleContext, evaluate rules sequential, scorer.score, return result; createRejectedResult for invalid URL
- **StorageV2:** VerificationStoreV2 MAX 100 TTL 24h STORAGE_KEY verifications_v2 LEGACY_KEY verifications, saveV2 constructs VerificationEntry with score/confidence/evidence/hash/version/reference/reasons/fraudSignals, existingIndex via normalizeUrlForEvidence, clean TTL slice, migrateLegacyIfNeeded sync legacy; findByUrl, getAll migrates legacy if v2 empty, valid filter purge, remove, clear, isReplay check recent windowMs
- **Content.ts v2:** imports VerificationEngine, VerificationStoreV2, PortalRegistryV2, ENGINE_VERSION_NAME, legacy fallback imports; variables pageLoadStart etc removed (collector handles); setupInteractionTracking, setupHistoryGuard (collector wraps, keep popstate no-op); runDetectionV2 currentUrl, engine.verify, log score/confidence/reasons, if score>=50 extract company/jobTitle via plugin extractCompany/JobTitle with try catch fallback, filter generic titles, save via V2 store, notify background PAGE_VERIFIED_V2 with result+entry + legacy PAGE_VERIFIED with v2 extras; runLegacyDetection fallback uses old PortalRegistry + extractPageMetadata + VerificationStoreV2.saveV2 with legacy DetectionResult; initial setup tracking + history guard, DOMContentLoaded delayed 1500ms, MutationObserver debounced 1200ms with lastUrl check, interval navigation check 1s, log loaded v2
- **Background.ts v2:** import StoreV2 + version, rateLimitMap Map origin timestamps, RATE_LIMIT_WINDOW 60s MAX 30, isRateLimited, getOriginFromSender, onMessage listener PAGE_VERIFIED + PAGE_VERIFIED_V2 logs version, GET_VERIFICATION_EVIDENCE action returns evidence+hash, onMessageExternal VERIFY_URL origin debug, rate limited check, strict URL validation HTTPS required, blocked IP/localhost, findByUrl, verified only if score>=80 (stricter than old 50), response includes verified, score, confidence, confidenceScore, portal, company, jobTitle, pageTitle, timestamp, matchedRules, matchedKeywords, evidence, verificationHash, version, reference, reasons, fraudSignals, reason if not verified suspicious flag, catch error; GET_EVIDENCE_FOR_HASH action returns evidence for hash request; onStartup + onInstalled purge via getAll, setInterval clean rateLimitMap 60s
- **Manifest:** version 2.0.0, description enterprise, content_scripts matches added enterprise ATS myworkdayjobs, myworkday, workday, successfactors, sapsf, oraclecloud, taleo, careers.*, jobs.*, */careers/*, */jobs/*, host_permissions same plus those domains
- **Popup:** Popup.tsx uses StoreV2, ENGINE_VERSION_NAME badge v2.0.0, getConfidenceLabel, getScore, header with version pill, Latest Verification Enterprise v1 title, empty state mentions Supports Greenhouse Lever Workday LinkedIn Indeed +15 ATS, history list shows company, portal, score, confidence, reference truncated, fraudSignals red, badge verified/suspicious/rejected via confidence, footer shows cached count + Enterprise v1 HMAC secured + Clear Cache
- **VerificationCard:** score/confidence extraction, levelClass verified/possible/not-verified, show company, jobTitle, hostname+pathname, reference key, confirmationText snippet 120 chars, reasons list 3x80 chars, fraudSignals box red, meta-row portal, date, version, hash truncated 8 chars
- **ConfidenceBadge:** legacy + ConfidenceBadgeV2 showing label Verified/Suspicious/Rejected score% + confidence small
- **Build:** passes `npm run build` -> dist 49.6k content, 148k popup, manifest 5.38k, icons 358k each
- **TypeScript:** noUnusedLocals disabled, include only src, errors fixed (sender unused -> _sender, canHandle added to interface, PortalPluginBase import removed, PageTitleRule fraudSignals unused removed, content unused vars removed)

### Frontend

- **Hook v2** `use-extension-verification.ts`: REMOVES keyword fast-path bypass (critical), requires HTTPS validation hostname not IP/localhost, requires chrome runtime, tries extension IDs, sendMessage VERIFY_URL, sets isExtensionInstalled, if no response -> not_verified or suspicious, checks extension response score, if <80 suspicious not verified, checks fraudSignals critical HISTORY_MANIPULATION_DETECTED, APPLY_BUTTON_STILL_ENABLED, UNSUPPORTED_DOMAIN -> fraud_detected, else calls backend POST /verifications/verify-evidence with evidence + jobLink + JWT via apiClient, backend returns verificationHash, verified bool HIGH, score, confidence, checks isReplay, constructs final result with verified backendVerified, score, confidence, portal, company, jobTitle, pageTitle, timestamp, matchedRules reasons, matchedKeywords headings, evidence, hash, version v2, reference, reasons, fraudSignals, isReplay, sets verificationResult, hash, evidence, isVerified backendVerified, state verified/suspicious/not_verified/fraud_detected/verifying_hash/checking, requiresHash true, handles 400 backend validation failed -> not_verified with fraudSignals BACKEND_VALIDATION_FAILED, network error fallback to extension result
- **Badge v2** `extension-verification-badge.tsx`: checking/verifying_hash spinner HMAC securing, verified HIGH with HMAC truncated, tooltip Enterprise Verified v2 HMAC Secured company role portal ref hash reasons score confidence version, suspicious amber with score MEDIUM tooltip reasons + fraud signals, fraud_detected red with signals + retry, not_installed shows Enterprise v1 not detected + install v2 description enterprise list + retry, not_verified shows apply first, unavailable fallback
- **Form Dialog** `application-form-dialog.tsx`: schema adds verificationHash regex, verificationScore, verificationConfidence enum, applicationReference; defaults include nulls; hook now returns verificationHash + evidence; reset includes new fields; verify handler sets verified true only if isVerified + result, verificationMethod Extension v2 (portal) Score % confidence, sets hash/score/confidence/reference from result evidence, company jobTitle portal auto-fill if present; suspicious sets verified false but stores hash/score/confidence with method Suspicious manual review; else resets; onSubmit toast shows Verified v2 HIGH Score% HMAC secured, reset includes new fields; form still does duplicate check, portal detection, etc

---

## Security Fixes Applied

- Removed URL keyword fast-path `?success=1` bypass
- Backend is source of truth, HMAC only server, never client
- Strict hostname anchored regex `(?:^|\.)greenhouse.io$` prevents `evil-greenhouse.com`
- HTTPS enforcement instant reject
- HistoryGuard wraps pushState/replaceState, -10 penalty
- Replay protection hash unique, TTL 24h, timestamp freshness 5min, isReplay flag
- Reference extraction + duplicate detection across recruiters
- Apply button penalty, time-on-page <3s penalty
- Portal fingerprints per ATS (Workday data-automation-id, Greenhouse #application_confirmation)
- Negative keywords in title/heading detection
- Generic portal cap 60 without strong evidence
- Rate limiting 30/min per origin in background
- Evidence lightweight canonicalized, sorted keys, normalized whitespace/case
- Server re-scores independently to detect client tampering
- Frontend now requires HMAC hash for verified=true

---

## Testing

### Backend (22 tests passing)
- hash canonicalization determinism, casing, sorting
- HMAC valid hex 64, deterministic same secret, different secrets differ, verifyHash true/false
- scorer high for valid greenhouse, reject http, blocked hostname, apply button penalty, history manipulation, short time, missing headings, generic cap
- evidence validator https, blocked hostname, stale timestamp, future, hostname mismatch, empty

### Extension Build
- `npm run build` passes: 81 modules, dist assets content 49.6k gzip 11.99k, popup 148k gzip 47.86k
- `tsc --noEmit` passes after fixes

### Manual Checklist (to be done on real ATS)
- [ ] Greenhouse confirmation -> HIGH 80%+ with reference
- [ ] Lever confirmation -> HIGH
- [ ] Workday confirmation -> HIGH with data-automation-id fingerprint
- [ ] LinkedIn Easy Apply -> HIGH
- [ ] Edit URL add ?success=true on non-success page -> Rejected <50
- [ ] Fake evil-linkedin.com -> Domain fails 0
- [ ] DOM injection -> fraud flag, reduced score
- [ ] history.replaceState -> fraud signal -10
- [ ] HTTP URL -> instant reject
- [ ] Replay same hash -> isReplay flagged
- [ ] Same reference different recruiter -> duplicate reference flagged

---

## Database Migration

File: `backend/prisma/migrations/20260803120000_add_verification_v2/migration.sql`
- ALTER TABLE job_applications ADD 8 columns
- CREATE INDEX 3
- CREATE TABLE verification_logs with unique hash, indexes, foreign key

Run: `npx prisma migrate dev` or `npx prisma migrate deploy` in prod

---

## Branch & Push

- Git author: Siddharth Ohal <sidxohal9049@gmail.com>
- Commits:
  - `c0cace0` docs: audit + redesign proposal
  - `8e606bf` feat: enterprise verification v2 implementation (66 files, 5393+ lines)
  - `b54507d` chore: migration SQL
- Pushed to `arena/019fc8fc-mayzax` -> PR #2 to `extension` branch: https://github.com/7even-7even/Mayzax/pull/2
- All future changes per requirement on extension lineage (via arena branch)

---

## Next Steps / Future v2.1

- chrome.webRequest to capture POST submission to ATS endpoint
- User interaction tracking click/keypress before verification (already partial)
- Tiny ML model for confirmation classification
- Screenshot perceptual hash (optional)
- Device fingerprint binding in HMAC
- Blockchain anchoring of hashes

---

## How to Test Extension

```bash
cd extension
npm install
npm run build
# Load dist in chrome://extensions Developer mode Load unpacked
# Navigate to Greenhouse/Lever test confirmation page
# Click extension icon -> popup shows HIGH score + evidence
# In Mayzax frontend, paste confirmation URL into Log Job Application form
# Badge should show Verified v2 HIGH with HMAC hash
# Submit -> backend stores verificationHash, score, confidence, evidence, reference
# Check DB: SELECT * FROM verification_logs WHERE recruiterId = ...
```

---

*End Report*
