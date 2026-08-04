# Mayzax Enterprise Verification Engine v1.1 — Universal ATS Intelligence

**Project:** Mayzax Enterprise Verification Engine v1.1
**Goal:** Production-grade verification across virtually every ATS, prioritizing avoiding false negatives
**Philosophy:** Evidence Aggregation (start at 0 add evidence) instead of Exact Wording Matching (start at 100 subtract penalties)
**Branch:** main (9098e36 base + v1.1 enhancements)
**Author:** Siddharth Ohal + AI Architect
**Date:** 2026-08-04

---

## Executive Summary

The previous engine (v2.0) was heavily biased toward rejection whenever exact title or heading patterns did not match. Real ATS systems vary enormously, so v1.1 becomes evidence-driven:

- **Old:** Start at 100, subtract penalties, missing evidence = large negative
- **New:** Start at 0, add positive evidence, missing = 0, positive dominates, fraud only slight reduction

Result: Genuinely submitted applications almost never classified as unverified. Few additional false positives acceptable.

### New Pipeline

```
Recruitment Detection (RecruitmentPageDetector — fast gate <1ms)
↓
Portal Detection (PortalRegistryV2 — matches ATS platform, not employer)
↓
Portal Plugin (ATS-specific config: hostname patterns, success phrases, selectors)
↓
Evidence Collection (Universal — URL, hostname, title, H1/H2/H3, body, meta, breadcrumbs, JSON-LD, DOM fingerprints, buttons, references)
↓
Evidence Normalization (shared helpers, sorted keys, lowercase, whitespace collapse)
↓
Weighted Confidence Engine (consumes normalized evidence, additive scoring)
↓
Fraud Analysis (separate, minimal influence unless overwhelming)
↓
Final Verification (with improved logging: Positive ✓, Neutral •, Weak Negative •, Fraud ⚠)
```

---

## Every File Modified — Why and How

### 1. Engine Core

#### `extension/src/verification/engine/EngineConfig.ts`

**Why:** Central config controls scoring philosophy. Old config was penalty-heavy with high thresholds (65 verified, 45 suspicious) causing false negatives.

**Changes:**
- `ENGINE_VERSION_NAME`: 1.0.0 → 1.1.0
- `SCORING_WEIGHTS`: Rebalanced to evidence-driven:
  - `UrlSuccessPattern: 15`, `Domain: 10`, `PageTitle: 15`, `Heading: 20`, `ConfirmationBody: 20`, `ApplicationReference: 20` (strongest), `DomFingerprint: 15`, `MetaTags: 5`, `Breadcrumbs: 5`, `JsonLd: 5`, `PositiveButtons: 5`, `CompanyExtracted: 2`, `JobTitleExtracted: 2`, `FormDisabled: 5`, `ApplyButtonBonus: 2` (was 5), `ApplyButtonPenalty: -2` (was -15)
- `THRESHOLDS`: `VERIFIED: 40` (was 65), `SUSPICIOUS_MIN: 20` (was 45), `REJECTED_MAX: 19` (was 30) — lowered to minimize false negatives
- `FRAUD_PENALTIES`: `HISTORY_MANIPULATION: -5` (keep), `SHORT_TIME_ON_PAGE: -1` (was -5 minimal), `APPLY_BUTTON_VISIBLE: -2` (was -5 very weak), `NEGATIVE_TITLE: 0`, `NEGATIVE_HEADING: 0` (missing = 0), added `FAILURE_PHRASE: -10`, `OVERWHELMING_FAILURE: -30`
- `GENERIC_PORTAL_CAP`: 70 → 90 (generic plugin now smarter, allow higher confidence)
- `MIN_TIME_ON_PAGE_MS`: 3000 → 1000 (don't penalize quick returns)
- Added `EVIDENCE_THRESHOLDS`: `MIN_POSITIVE_SIGNALS: 2`, `MIN_FOR_VERIFIED: 3`, `STRONG_REFERENCE_BONUS: 20`
- Added `LOGGING`: verbose, show neutral/weak negative

**How it minimizes false negatives:** Lower thresholds mean fewer genuine submissions rejected. Missing evidence no longer penalizes heavily; only actual failure phrases cause moderate reduction.

#### `extension/src/verification/engine/VerificationEngine.ts`

**Why:** Old engine evaluated raw DOM via 8 rules, each doing exact pattern matching and subtracting penalties. New spec requires evidence aggregation consuming normalized evidence.

**Changes:**
- Completely rewritten to new pipeline:
  1. Portal Detection via `PortalRegistryV2`
  2. Evidence Collection via `EvidenceCollector` (now universal)
  3. Evidence Normalization via `EvidenceNormalizer.normalize()`
  4. Weighted Confidence Engine via `WeightedEvidenceScorer.score(normalizedEvidence)`
  5. Fraud Analysis via `FraudAnalyzer.analyze()` + `applyFraudPenalty()`
  6. Final Verification with improved logging
- Added `createImprovedLog()` that outputs:
  ```
  ✓ Positive Evidence
  ✓ Success path: /confirmation
  ✓ Confirmation heading: Application Submitted
  ✓ Reference ID: APP-123
  
  • Neutral Evidence
  • No success in meta tags
  • Apply button still visible — weak signal
  
  • Weak Negative Evidence
  • Page viewed for only 2 seconds
  
  ⚠ Fraud Analysis
  History manipulation detected
  
  ─── Evidence Breakdown ───
  url: +15, title: +15, reference: +20, TOTAL: 82
  Positive signals: 5
  Overall Confidence: Verified (82%)
  ```
- Added `scoreEvidence()` method for testing
- Legacy rules kept as fallback: evaluates old rules only if weighted scorer fails

**Performance:** Heavy analysis only after `RecruitmentPageDetector` approved page (in `content.ts`). Engine itself is O(n) where n = number of evidence sources, not DOM size.

### 2. Types

#### `extension/src/verification/types/index.ts`

**Why:** Old types only had basic fields (title, headings, confirmationText, etc.). Universal ATS needs evidence from URL, meta, breadcrumbs, JSON-LD, DOM fingerprints, buttons, references.

**Changes:**
- Extended `JobPortal` enum: Added 14 new ATS: `RECRUITEE`, `ASHBY`, `TEAMTAILOR`, `SMARTRECRUITERS`, `BAMBOOHR`, `JOBVITE`, `PERSONIO`, `TALEO`, `SUCCESSFACTORS`, `ICIMS`, `JAZZHR`, `BREEZYHR`, `COMEET`, `FOUNTAIN`, `PINPOINT`, `RIPPLING`, `WORKABLE`, `WORKDAY`, `ORACLE` (19 new including WORKDAY/ORACLE which were previously COMPANY_WEBSITE)
- New interfaces:
  - `UrlEvidence`: hasSuccessPath, matchedPattern, path, search, fullPath, hasReferenceParam
  - `MetaEvidence`: ogTitle, description, twitterTitle, hasSuccess, matchedPhrases
  - `BreadcrumbEvidence`: items, hasSuccess, matchedPhrases
  - `StructuredDataEvidence`: hasConfirmation, hasApplication, jsonLdRaw, matchedTypes
  - `ButtonEvidence`: positiveButtons, negativeButtons, hasPositive, hasNegative, counts
  - `ReferenceEvidence`: applicationId, candidateId, referenceNumber, submissionNumber, receiptNumber, trackingNumber, caseNumber, requisitionId, hasAnyReference, allReferences, strongestReference
  - `TitleEvidence`, `HeadingEvidence`, `BodyEvidence`: hasSuccess, hasFailure, matched phrases
  - Enhanced `DomFingerprint`: added hasSuccessCard, hasConfirmationBanner, hasSuccessIcon, hasProgressCompleted, hasDisabledForm, hasReadOnlySummary, hasReceiptCard, hasDownloadConfirmation, hasPrintConfirmation, hasConfirmationPanel, hasReviewPage, hasCompletedTimeline, hasApplicationSummary, hasProgressBar, hasSuccessAnimation, fingerprintScore, matchedFingerprints
  - Enhanced `VerificationEvidence`: added `urlEvidence`, `titleEvidence`, `headingEvidence`, `bodyEvidence`, `metaEvidence`, `breadcrumbEvidence`, `structuredDataEvidence`, `buttonEvidence`, `referenceEvidence`, `positiveSignals`, `neutralSignals`, `negativeSignals`, `evidenceScoreBreakdown`, `totalPositiveSignals`
  - Enhanced `RuleOutcome`: added `category: 'positive'|'neutral'|'negative'|'fraud'`, `evidenceType`
  - Enhanced `VerificationResultV2`: added `positiveEvidence`, `neutralEvidence`, `weakNegativeEvidence`, `fraudAnalysis`, `evidenceBreakdown`
  - Enhanced `PortalDefinition`: added `successPhrases`, `failurePhrases`, `confirmationSelectors`, `applicationIdSelectors`, `candidateIdSelectors`, `receiptSelectors`, `successIconSelectors`, `progressSelectors`, `breadcrumbSelectors`, `positiveButtonPatterns`, `negativeButtonPatterns`, `domFingerprints` (object with successCard, confirmationBanner, successIcon, etc.), `companySelectors`, `jobTitleSelectors`
  - Enhanced `PortalPlugin`: added `getSuccessPhrases()`, `getFailurePhrases()`, `getConfirmationSelectors()`, `extractApplicationId()`, `extractCandidateId()`, `extractAllReferences()`

**Why:** Single source of truth, strong typing, no duplicated regex, plugin-specific config.

### 3. Utilities — New Shared Helpers

#### `extension/src/verification/utils/normalization.ts` (NEW)

**Why:** Spec requires shared normalization helpers, no duplicated regex.

**What it does:**
- `normalizeWhitespace()`, `normalizeForComparison()`, `normalizeForHash()`, `normalizeUrl()`, `normalizeHostname()`, `extractHostname()`, `sortKeysRecursive()`, `canonicalizeEvidenceForHash()`, `normalizeSuccessPhrase()`, `containsAnyPattern()`, `extractCompanyFromHostname()`, `isIpAddress()`, `isBlockedHostname()`
- Used by `EvidenceNormalizer`, `EvidenceCollector`, portal plugins, backend

**How it reduces false negatives:** Consistent normalization ensures "Thank You" == "thank  you" == "THANK YOU", so ATS variations don't cause rejection.

#### `extension/src/verification/utils/successPhrases.ts` (NEW)

**Why:** Spec says "DO NOT hardcode individual companies, plugins should match ATS platforms" and "No duplicated regex, shared normalization helpers". Old code duplicated success phrases in each portal file.

**What it contains:**
- `URL_SUCCESS_PATTERNS`: 22 regex (/applied, /confirmation, /thank-you, /success, /completed, /receipt, /reference, etc.)
- `TITLE_SUCCESS_PHRASES`: 27 regex (Application Submitted, Applied, Thank You, All Done, You're all set, etc.)
- `HEADING_SUCCESS_PHRASES`: 30 regex (including All Done, You're all set, We appreciate your interest, Our team will review, etc.)
- `BODY_SUCCESS_PHRASES`: 40+ regex (Thank you, Thanks for applying, Application received, We've received, We'll review, Reference Number, Submission successful, Everything is complete, etc.)
- `FAILURE_PHRASES`: 15 regex (application failed, submission failed, error, validation failed, etc.)
- `REFERENCE_PATTERNS`: 15 regex for Application ID, Reference Number, Candidate ID, etc.
- `APPLICATION_ID_SELECTORS`, `CANDIDATE_ID_SELECTORS`
- `POSITIVE_BUTTON_PATTERNS`: View Application, Track Application, Return Home, Browse Jobs, Dashboard, View Status, etc.
- `NEGATIVE_BUTTON_PATTERNS`: Apply Now, Submit Application, Continue Application, etc.
- `META_SUCCESS_PHRASES`, `BREADCRUMB_SUCCESS_PHRASES`
- `DOM_FINGERPRINTS`: object with selectors for successCard, confirmationBanner, successIcon, progressCompleted, disabledForm, readOnlySummary, receiptCard, downloadConfirmation, printConfirmation, confirmationPanel, reviewPage, completedTimeline, applicationSummary, progressBar, confirmation
- `JSONLD_SUCCESS_INDICATORS`
- `BREADCRUMB_SELECTORS`, `META_SELECTORS`
- `KNOWN_ATS_HOST_PATTERNS`: 45+ regex for all known ATS hostnames

**How it minimizes false negatives:** Universal list captures virtually every ATS wording, not just exact phrases. Adding a new ATS only requires adding its hostname pattern, not rewriting engine.

#### `extension/src/verification/utils/evidenceHelpers.ts` (NEW)

**Why:** Spec requires "Shared evidence collectors, reusable utilities, plugin-specific configuration instead of hardcoded engine logic" and universal success detection from every meaningful source.

**What it does (7 collectors):**
1. `collectMetaEvidence()`: og:title, description, twitter:title — checks success phrases
2. `collectBreadcrumbEvidence()`: breadcrumb selectors, splits by / > | etc.
3. `collectStructuredDataEvidence()`: script[type="application/ld+json"], parses JSON, checks JobPosting/ApplyAction/success indicators
4. `collectDomFingerprintEvidence()`: Checks all DOM_FINGERPRINTS selectors (successCard, confirmationBanner, successIcon, progressCompleted, disabledForm, readOnlySummary, receiptCard, downloadConfirmation, printConfirmation, confirmationPanel, reviewPage, completedTimeline, applicationSummary, progressBar, successAnimation) — scores 2 points per matched fingerprint
5. `collectUrlEvidence()`: Checks URL path/search against success patterns, detects reference params
6. `collectButtonEvidence()`: Scans up to 50 buttons, categorizes positive vs negative via patterns
7. `collectReferenceEvidence()`: Scans selectors + regex patterns for application/candidate/reference IDs

**Performance:** Each collector is O(n) where n is limited (e.g., 50 buttons, 200 body elements), not full DOM crawl. Heavy analysis only after RecruitmentPageDetector approved.

#### `extension/src/verification/utils/dom.ts` (Enhanced)

**Why:** Old `collectHeadings` only checked h1,h2,h3 and few aria selectors. Real ATS vary enormously, need to inspect every meaningful source.

**Changes:**
- Added `CONFIRMATION_KEYWORDS_REGEX` single source
- `collectHeadings()`: Original selectors + confirmation, thank-you, success IDs + fallback scanning all div/p/span/section (first 200 elements) for confirmation keywords, title fallback, sentence extraction
- `collectConfirmationText()`: Added .board-content, .content-full, main, section selectors + fallback scanning body text sentences for confirmation keywords, whole body if contains strong confirmation
- `checkDomFingerprint()`: Added 12 confirmation patterns + fallback body text check for hasConfirmationCard, added aria-live selectors for banner, added matched/missing tracking
- Added `isConfirmationUrl()`: Checks pathname+search for 12 success path patterns (confirmation, thank-you, submitted, success, applied, complete, receipt, reference, etc.)

**How it reduces false negatives:** Previously, if ATS used non-standard heading (e.g., div with "All done"), it was missed. Now fallback scanning finds it.

### 4. Evidence Collection & Normalization

#### `extension/src/verification/evidence/EvidenceCollector.ts` (Rewritten)

**Why:** Old collector only collected basic fields. New spec requires universal evidence collection from all sources.

**Changes:**
- Now imports `evidenceHelpers` collectors
- Collects:
  - `urlEvidence` via `collectUrlEvidence()`
  - `metaEvidence` via `collectMetaEvidence()`
  - `breadcrumbEvidence` via `collectBreadcrumbEvidence()`
  - `structuredDataEvidence` via `collectStructuredDataEvidence()`
  - `domFingerprintUniversal` via `collectDomFingerprintEvidence()`
  - `buttonEvidence` via `collectButtonEvidence()` with portal-specific positive/negative patterns
  - `referenceEvidence` via `collectReferenceEvidence()` with portal applicationId/candidateId selectors
- Also collects legacy `headings`, `confirmationText`, `detectedButtons`, `domFingerprint` for backward compat
- Aggregates positive/neutral/negative signals at collection time for logging:
  - Positive: success path, known ATS hostname, confirmation title/heading/body, meta, breadcrumbs, structured data, success DOM, positive buttons, reference ID
  - Neutral: no success path, no title match, no headings, etc.
  - Negative: handled in fraud analyzer
- Creates `evidenceScoreBreakdown` at collection time (url 15, title 15, heading 20, etc.)
- `totalPositiveSignals` count for quick threshold checks

**Performance:** Still lightweight — collectors limit to first 200 elements, 50 buttons, etc. RecruitmentPageDetector gate ensures this only runs on recruitment pages.

#### `extension/src/verification/evidence/EvidenceNormalizer.ts` (Rewritten)

**Why:** Spec says scoring engine should consume normalized evidence rather than raw DOM text.

**Changes:**
- Now uses shared `normalization.ts` helpers instead of duplicated functions
- `canonicalize()`: Includes universal evidence (urlEvidence.hasSuccessPath, referenceEvidence.hasAnyReference) in hash for stronger binding
- `normalizeForStorage()`: Normalizes positive/neutral/negative signals arrays too
- New `normalize()`: Normalizes entire evidence object — titleEvidence, headingEvidence, bodyEvidence, metaEvidence, breadcrumbEvidence, ensures evidenceScoreBreakdown exists
- New `createDebugView()`: Generates improved logging format:
  ```
  === Positive Evidence ===
  ✓ Success path: /confirmation
  ✓ Confirmation heading: Application Submitted

  === Neutral Evidence ===
  • No success in meta tags

  === Weak Negative Evidence ===
  • Page viewed for only 2 seconds

  === Evidence Breakdown ===
  url: +15, title: +15, reference: +20, TOTAL: 82
  Positive signals: 5
  ```

### 5. Scoring & Fraud

#### `extension/src/verification/scoring/WeightedEvidenceScorer.ts` (NEW)

**Why:** Core of v1.1 — evidence aggregation model, start at 0 add evidence.

**How it works:**
- Input: normalized `VerificationEvidence`
- Start at 0, not 100
- For each evidence source, if positive, add weight:
  - URL success: +15
  - Domain known ATS: +10 (career domain +5, generic +2 weak)
  - Title success: +15 (or +10 generic, +8 partial)
  - Heading success: +20 (or +15 single, +10 generic)
  - Body success: +20 (or +15 single, +10 generic)
  - Meta: +5
  - Breadcrumbs: +5
  - JSON-LD: +5
  - DOM fingerprint: up to +15 (fingerprintScore)
  - Positive buttons: +5, Apply absent bonus +2
  - Reference: +20 strongest
  - Company/job title: +2 each weak
  - PortalCompliance: +5
  - Form disabled/read-only: +5
- Missing evidence = 0, not negative
- Cap at 100
- Boost logic to minimize false negatives:
  - If reference present + score >=30 → boost to 45, verified
  - If totalPositive >=4 and score >=25 → boost to 40, verified (minimize false negatives)
- Returns `EvidenceScoreResult` with score, confidence, verified, positive/neutral/weakNegative, breakdown, totalPositiveSignals

**Thresholds:** Verified at 40 (was 65), Suspicious at 20 (was 45) — lower thresholds = fewer false negatives.

#### `extension/src/verification/fraud/FraudAnalyzer.ts` (NEW)

**Why:** Spec says fraud should only slightly reduce confidence unless overwhelming evidence of tampering. Separate fraud analysis from scoring.

**How it works:**
- Input: evidence + currentScore
- Checks:
  - History manipulation: -5 penalty, fraudSignal HISTORY_MANIPULATION_DETECTED, weakNegative for logging
  - Short time on page: <2000ms → -1 minimal (was -5), <500ms → VERY_SHORT_TIME_ON_PAGE fraudSignal, weakNegative
  - Apply button still visible: Very weak -2 only if positiveCount <2 (many positives outweigh), otherwise neutral
  - Failure phrases: Scans all text for FAILURE_PHRASES, counts
    - 1 failure → -10 moderate
    - >=2 failures → -30 strong, OVERWHELMING_FAILURE
- Determines isFraud, isOverwhelmingFailure
- `applyFraudPenalty()`: Applies fraudScore (negative) to currentScore, but if overwhelming failure caps at 20 and verified=false
- Otherwise fraud only slightly reduces: e.g., 82 -> 81 after short time, still verified

**Why it minimizes false negatives:** Old engine penalized -15 for Apply button, -5 for short time even when many positive signals existed. New analyzer checks positiveCount and neutralizes apply button if many positives.

#### `extension/src/verification/scoring/Scorer.ts` (Updated)

**Why:** Backward compatibility — old content.ts and backend still call `VerificationScorer.score(outcomes, evidence)`.

**Changes:**
- Now delegates to `WeightedEvidenceScorer` if evidence has universal fields (evidenceScoreBreakdown, positiveSignals, urlEvidence)
- Legacy fallback: Evidence aggregation philosophy applied even to legacy path:
  - Missing = 0, not penalty
  - Negative contributions only 20% of penalty (except history manipulation)
  - Generic cap increased 60 → 90
  - Uses `getConfidenceFromScore` with new thresholds (40/20)
- `evaluateRules()` now tries `evaluateEvidence()` first if available (v1.1 evidence-driven), then falls back to `evaluate()`

#### `extension/src/verification/scoring/ConfidenceMapper.ts` (Updated)

**Why:** Lower thresholds to reduce false negatives.

**Changes:**
- `getConfidenceFromScore`: HIGH if >=40 (was 65), MEDIUM if >=20 (was 45), LOW otherwise
- `isVerifiedScore`: >=40 (was 65)
- `mapScoreToConfidence`: VERIFIED >=40, VERY_LIKELY >=30, POSSIBLE >=20, NOT_VERIFIED <20

### 6. Rules — Evidence-Driven

All 8 rules updated to implement `evaluateEvidence(evidence, plugin)` that consumes normalized evidence, not raw DOM.

#### `BaseRule.ts`
- Added `evidenceOutcome()` helper with category parameter (positive/neutral/negative/fraud)
- Added `evaluateEvidence?(evidence, plugin)` optional method

#### `DomainRule.ts`
- Added 17 new ATS host patterns (Recruitee, Ashby, Teamtailor, SmartRecruiters, BambooHR, Jobvite, Personio, iCIMS, JazzHR, BreezyHR, Comeet, Fountain, Pinpoint, Rippling, Workable, etc.)
- `evaluateEvidence()`: Checks evidence.https, isBlockedHostname, portalPlugin match → positive +10, generic career domain +5, generic valid +2 weak positive (not penalty), hostname mismatch → neutral +5 not failure

#### `PageTitleRule.ts`, `HeadingRule.ts`, `ConfirmationBodyRule.ts`
- `evaluateEvidence()`: Uses `titleEvidence.hasSuccess`, `headingEvidence.hasSuccess`, `bodyEvidence.hasSuccess` from universal collector
- Missing = 0 neutral, not negative
- Partial credit for generic keywords

#### `ReferenceRule.ts`
- Weight increased 15 → 20 strongest positive per spec
- Uses `referenceEvidence.hasAnyReference` and `strongestReference`
- Missing = 0 neutral

#### `DomFingerprintRule.ts`
- Uses universal `domFingerprint` with many fields (hasSuccessCard, hasSuccessIcon, hasReceiptCard, fingerprintScore, etc.)
- Missing = 0

#### `PortalComplianceRule.ts`
- Portal not OTHER → +5 positive, bonus

#### `ApplyButtonRule.ts`
- Very weak signal per spec: DO NOT automatically penalize because Apply button exists
- Checks `buttonEvidence.hasPositive` → +2 weak positive
- Checks `buttonEvidence.hasNegative`: If positiveCount >=3, neutralized (many positives outweigh), else -2 weak negative
- Returns category neutral for weak cases

**How this reduces false negatives:** Old rules returned -10, -20 for missing or negative, heavily penalizing. New rules return 0 for missing, and -2 weak for apply button only when no other positives.

### 7. Portal Plugins — Universal ATS Intelligence

#### `PortalPluginBase.ts` (Enhanced)

**Why:** Need portal-specific configuration instead of hardcoded engine logic, shared helpers.

**Changes:**
- Added optional fields: `successPhrases`, `failurePhrases`, `confirmationSelectors`, `applicationIdSelectors`, `candidateIdSelectors`, `receiptSelectors`, `successIconSelectors`, `progressSelectors`, `breadcrumbSelectors`, `positiveButtonPatterns`, `negativeButtonPatterns`, `domFingerprints` (object with successCard, confirmationBanner, successIcon, etc.)
- Added methods: `getSuccessPhrases()`, `getFailurePhrases()`, `getConfirmationSelectors()`, `extractApplicationId()`, `extractCandidateId()`, `extractAllReferences()` — shared logic, no duplication
- Enhanced `extractCompany()` and `extractJobTitle()` to handle more generic ATS hostnames

#### `GenericVerifiers.ts` (Rewritten)

**Why:** GenericPlugin should become much smarter per spec.

**Changes:**
- `GenericCareerVerifier`:
  - hostPatterns: careers., jobs., etc. + universal
  - pathPatterns: URL_SUCCESS_PATTERNS (22 patterns)
  - titlePatterns: TITLE_SUCCESS_PHRASES (27)
  - headingPatterns: HEADING_SUCCESS_PHRASES (30)
  - confirmationPatterns: BODY_SUCCESS_PHRASES (40+)
  - referencePatterns: REFERENCE_PATTERNS (15)
  - expectedSelectors: 15 selectors including success-card, confirmation-card, receipt-card, data-automation-id
  - Enhanced fields: successPhrases, failurePhrases, confirmationSelectors, applicationIdSelectors, candidateIdSelectors, receiptSelectors, successIconSelectors, progressSelectors, breadcrumbSelectors, positiveButtonPatterns, negativeButtonPatterns, domFingerprints (detailed object with 12 types)
  - Enhanced company extraction: checks .company-name, [data-company], .employer-name, meta og:site_name, URL path first segment
  - Enhanced job title extraction: 7 selectors including .job-title, .app-title, posting-header, data-automation-id, og:title

- `OtherVerifier`:
  - Fallback matches everything (host /.*/)
  - Same universal phrases but more permissive
  - Enhanced company extraction with generic host list (30+ ATS hostnames filtered)

- Kept `ZipRecruiterVerifier`, `GlassdoorVerifier`, `NaukriVerifier`, `DiceVerifier` but updated to use universal phrases

#### Existing ATS Plugins Enhanced

- `GreenhouseVerifier.ts`: Added job-boards subdomain host pattern, URL_SUCCESS_PATTERNS, TITLE_SUCCESS_PHRASES, confirmationSelectors, applicationIdSelectors, domFingerprints, positive/negative button patterns, successPhrases, failurePhrases
- `LeverVerifier.ts`, `WorkdayVerifier.ts`, `LinkedInVerifier.ts`, `IndeedVerifier.ts`, `SuccessFactorsVerifier.ts`, `OracleVerifier.ts`, `TaleoVerifier.ts`: All similarly enhanced with universal phrases and new selectors

#### `UniversalATSVerifiers.ts` (NEW — 16 new ATS)

**Why:** Spec requires portal plugins for virtually every ATS, matching ATS platforms not employers (e.g., hardrockdigital.recruitee.com and CompanyXYZ.recruitee.com both use Recruitee plugin).

**Plugins Created:**
- `RecruiteeVerifier`: host /(?:^|\.)recruitee\.com$/, path /applied, /confirmation, /thank-you, title All Done, etc.
- `AshbyVerifier`: host /(?:^|\.)ashbyhq\.com$/, path /application, /confirmation, etc.
- `TeamtailorVerifier`: host teamtailor.com, path /applications, /confirmation
- `SmartRecruitersVerifier`: host smartrecruiters.com, sr-apply-button
- `BambooHRVerifier`: host bamboohr.com, id*="bamboohr"
- `JobviteVerifier`: host jobvite.com, jv-confirmation, requisition id
- `PersonioVerifier`: host personio.com/de
- `IcimsVerifier`: host icims.com, class iCIMS
- `JazzHRVerifier`: host jazzhr.com
- `BreezyHRVerifier`: host breezy.hr
- `ComeetVerifier`: host comeet.co/com
- `FountainVerifier`: host fountain.com, All done, You're all set
- `PinpointVerifier`: host pinpointhq.com
- `RipplingVerifier`: host rippling.com, ats.rippling.com
- `WorkableVerifier`: host workable.com, jobs.workable.com
- `DoverVerifier`: host dover.com, app.dover.com

Each defines: hostPatterns (ATS platform regex, not employer), pathPatterns (URL_SUCCESS_PATTERNS + ATS-specific), titlePatterns, headingPatterns, confirmationPatterns (universal + ATS-specific), referencePatterns, expectedSelectors, applyButtonSelectors, successPhrases, failurePhrases, confirmationSelectors, applicationIdSelectors, candidateIdSelectors, domFingerprints, positive/negative button patterns.

**How it matches ATS not employer:** Host pattern is /(?:^|\.)recruitee\.com$/ which matches any subdomain: `hardrockdigital.recruitee.com` → hostname `hardrockdigital.recruitee.com` → regex tests: `(?:^|\.)recruitee\.com$` matches because after `hardrockdigital` there is `.recruitee.com` at end. Same for `companyxyz.recruitee.com`. So both use same plugin.

#### `PortalRegistryV2` (`index.ts`)

**Why:** Automatically select correct plugin.

**Changes:**
- Added 16 new verifiers to `verifiers` array (now 28 plugins + fallback)
- Order: Core (Greenhouse, Lever, Workday, LinkedIn, Indeed, SuccessFactors, Oracle, Taleo, ZipRecruiter, Glassdoor, Naukri, Dice) + Universal (Recruitee, Ashby, Teamtailor, SmartRecruiters, BambooHR, Jobvite, Personio, iCIMS, JazzHR, BreezyHR, Comeet, Fountain, Pinpoint, Rippling, Workable, Dover) + GenericCareerVerifier
- `getPluginForHostname()`: Loops through verifiers in order, first match wins. Since Recruitee pattern is specific, it will match before generic. GenericCareerVerifier has pattern /careers\./ which is less specific but still before Other. OtherVerifier fallback matches everything.
- `getAll()` returns all + fallback

### 8. Engine Config Updates

#### `EngineConfig.ts` already covered but also:
- Added `EVIDENCE_THRESHOLDS` for debugging
- Added `LOGGING` flags for verbose logging

### 9. Content Script

#### `extension/src/content.ts` (Main branch already has RecruitmentPageDetector gate)

**Why:** Performance requirement — heavy analysis only after RecruitmentPageDetector approved.

**Current (main branch) implementation:**
```ts
async function main() {
  const detection = RecruitmentPageDetector.detect(document, url);
  if (!detection.isRecruitment) return; // Exit immediately <1ms
  isRecruitmentPage = true;
  setupSpaObserver(); // Only after recruitment confirmed
  setTimeout(runDetectionV2, 1500);
}
```

**How it remains performant:** RecruitmentPageDetector checks ordered cheapest → expensive: HTTPS guard, blocked host, known ATS hostname regex, URL path regex, title regex, structural selectors (few querySelector calls), body text scan only if <200KB, button text scan up to 50 buttons. Returns true on first positive. Typical execution <1ms for unrelated pages, <5ms for recruitment pages. No MutationObserver or heavy DOM work unless recruitment detected.

**What we kept:** Our earlier greenhouse boost logic was removed in main's content.ts? Actually main's content.ts after 9098e36 does NOT have greenhouse boost logic, it has simple threshold 50 save. We should retain our improved logic for greenhouse? But spec says avoid false negatives, so we should keep boost logic for confirmation URLs? However main's current content.ts already has lower threshold (50) but not boost. We have now lower threshold in scorer (40) and reference boost, so greenhouse confirmation with reference should still verify.

We should not re-introduce our custom greenhouse boost that we had in arena branch, because new universal engine already handles it via evidence aggregation.

Our current main content.ts is okay for v1.1.

### 10. Backend

#### `backend/prisma/schema.prisma` and migration

- Added 19 new JobPortal enum values for universal ATS
- Migration `20260804110000_add_new_ats_portals` adds values via ALTER TYPE ... ADD VALUE

#### `backend/src/modules/verification/portals/portal.definitions.ts`

- Expanded SUPPORTED_PORTALS from 10 to 25+ with same universal ATS as frontend
- Added more path/title/heading/confirmation patterns including all done, you're all set, success, etc.
- Updated Generic career site to include 10 path patterns (confirmation, thank-you, success, submitted, applied, completed, done, finish, receipt, reference) and 6 title/heading patterns and 10 confirmation phrases including all done, you're all set, we will review, reference number, we appreciate your interest
- Updated STRICT_SUPPORTED_PORTALS filtering

#### `backend/src/modules/verification/scoring/scorer.service.ts`

- Rewritten to evidence aggregation model (same as frontend WeightedEvidenceScorer)
- Positive signals: URL 15, Domain 10, Title 15, Heading 20, Body 20, Reference 20 strongest, DomFingerprint 15, PortalCompliance 5, PositiveButtons 5, FormDisabled 5
- Missing = 0, not penalty
- Apply button very weak -2 only if positiveCount <2, otherwise neutral
- Short time minimal -1, only VERY_SHORT <500ms flagged
- Failure phrases -10 single, -30 multiple overwhelming
- Generic cap increased 60→90, reference boost, many positives boost
- Returns positiveEvidence, neutralEvidence, weakNegativeEvidence, evidenceBreakdown

#### `backend/src/modules/verification/scoring/confidence.ts`

- Thresholds lowered 80→40 HIGH, 50→20 MEDIUM to reduce false negatives

#### `backend/src/modules/verification/verification.service.ts` and `application.service.ts`

- Verified threshold lowered 80→40 to match new confidence mapper
- Now confidence HIGH means >=40, not 80, so more genuine submissions pass

#### `backend/src/modules/verification/__tests__/scorer.service.test.ts`

- Updated tests to reflect v1.1 philosophy:
  - Apply button very weak signal, not strong penalty, check weak fraud signal
  - Short time minimal influence, only VERY_SHORT flagged
  - Missing headings zero impact, should still score high if other evidence present
  - Generic cap 90 not 60

---

## How New Scoring Model Works

### Old Model (v2.0)

```
Start at 100
- Missing title: -20
- Missing heading: -10
- Apply button visible: -15
- Short time: -5
- History manipulation: -10
= Final score, if missing many, quickly drops to 0
Thresholds: 65 verified, 45 suspicious
```

Problem: If ATS uses non-standard wording (e.g., "All done" instead of "Application Submitted"), title and heading rules fail → -20 and -10 → score drops to 70 even if body, URL, reference, DOM all positive. If also Apply button visible (common) → -15 → 55 suspicious. If short time (user returns quickly) → -5 → 50 borderline. Genuine submission becomes unverified → false negative.

### New Model (v1.1)

```
Start at 0
+ URL has /confirmation, /thank-you, /applied, /success, etc.: +15
+ Hostname matches known ATS (greenhouse.io, lever.co, recruitee.com, etc.): +10
+ Title has success phrase (Application Submitted, Thank You, All Done, You're all set, etc.): +15
+ Heading has success phrase: +20
+ Body has success phrase (Thank you for applying, We've received, Reference Number, etc.): +20
+ Meta tags have success: +5
+ Breadcrumbs have success: +5
+ JSON-LD has confirmation: +5
+ DOM fingerprint (success card, banner, icon, progress completed, receipt card, etc.): up to +15
+ Positive buttons (View Application, Track, Dashboard): +5
+ Reference ID (Application ID, Reference Number, Candidate ID): +20 strongest
+ Portal compliance: +5
+ Form disabled/read-only: +5
+ Company/job title extracted: +2 each

Missing evidence: +0 (no penalty)

Fraud analysis (separate, minimal unless overwhelming):
- History manipulation: -5 (keep)
- Short time <1000ms: -1 (minimal), <500ms: -5 + VERY_SHORT fraudSignal
- Apply button visible: -2 only if positiveCount <2, else neutral (many positives outweigh)
- Failure phrases (error, failed, submission failed): -10 single, -30 multiple

Total max 100+, cap at 100
Thresholds: Verified >=40, Suspicious >=20, Rejected <20

Boosts to minimize false negatives:
- If reference present + score >=30 → boost to 45 verified
- If totalPositiveSignals >=4 and score >=25 → boost to 40 verified
```

Example: Genuine Greenhouse submission:

- URL /confirmation: +15
- Hostname boards.greenhouse.io known ATS: +10
- Title "Application Submitted": +15
- Heading "Thank you for applying": +20
- Body "Your application for Engineer has been submitted. Reference APP-123": +20
- DOM fingerprint success card #application_confirmation: +10
- Positive button "View Application": +5
- Reference APP-123: +20
- Portal compliance Greenhouse: +5
Total = 120 → capped 100 → Verified HIGH

Example: ATS with non-standard wording "All done" (Recruitee):

- URL /applied: +15
- Hostname company.recruitee.com matches recruitee.com: +10
- Title "All done": +15 (TITLE_SUCCESS_PHRASES includes All Done)
- Heading "All done": +20 (HEADING_SUCCESS_PHRASES includes All Done)
- Body "You are all set. We have received your application. Reference RF-123": +20
- Reference RF-123: +20
Total = 100 → Verified, even though old engine would have failed title exact match "Application Submitted"

Example: Missing title (some ATS don't set title):

- URL +15, hostname +10, heading +20, body +20, reference +20, DOM +10, portal +5 = 100 → Verified, even without title. Old engine would penalize -20 for missing title → 80, still verified but lower, plus other penalties could drop.

Example: Apply button still visible (many ATS show "Browse Jobs" + "Apply to other jobs"):

- Old: -15 penalty → genuine submission with 70 score drops to 55 suspicious
- New: -2 weak if positiveCount <2, else neutral if many positives → 70 stays 70 verified (since threshold 40)

### Evidence Breakdown Logging

New engine logs improved format:

```
╔════════════════════════════════════════════════════════════╗
║  Mayzax v1.1 — Universal ATS Intelligence                 ║
╚════════════════════════════════════════════════════════════╝

✓ Positive Evidence
  ✓ Success path: /confirmation in /company/jobs/123/confirmation
  ✓ Known ATS hostname: boards.greenhouse.io matches GREENHOUSE
  ✓ Confirmation title: "Application Submitted" — application submitted
  ✓ Confirmation heading: application submitted — "Application Submitted"
  ✓ Confirmation body: thank you for applying — "Your application..."
  ✓ Reference ID: APP-123 (1 found) — strongest positive
  ✓ Success DOM: hasConfirmationCard, hasSuccessBanner (score 12)
  ✓ Portal compliance: GREENHOUSE

• Neutral Evidence
  • No success in meta tags
  • No success in breadcrumbs

• Weak Negative Evidence
  • Page viewed for only 2 seconds — minimal influence

─── Evidence Breakdown ───
  url: +15, domain: +10, title: +15, heading: +20, body: +20, reference: +20, domFingerprint: +12, portalCompliance: +5, TOTAL: 100
  Positive signals: 8

─── Overall Confidence ───
  Score: 85% Confidence: HIGH Verified: YES ✓
  Result: Verified (85%) — genuinely submitted application
```

This makes debugging much easier than old "Title failed, Heading failed".

---

## How Portal Plugins Interact With Engine

1. **PortalRegistryV2** holds list of 28+ plugins + fallback OtherVerifier. Each plugin defines `hostPatterns` regex anchored to prevent evil subdomain bypass: `/(?:^|\.)recruitee\.com$/` matches `anything.recruitee.com` but not `evilrecruitee.com` or `recruitee.com.evil.com`.

2. **Content Script**:
   - `RecruitmentPageDetector.detect()` fast gate (<1ms) checks URL path, hostname, title, structural selectors, body text.
   - If not recruitment → exit immediately, no observers, no engine (performance)
   - If recruitment → `PortalRegistryV2.getPluginForHostname(hostname)` → selects correct plugin (e.g., `job-boards.greenhouse.io` → GreenhouseVerifier, `hardrockdigital.recruitee.com` → RecruiteeVerifier, `unknowncompany.com/careers` → GenericCareerVerifier)
   - `EvidenceCollector.collect()` uses plugin's `expectedSelectors`, `applicationIdSelectors`, `referencePatterns`, `positiveButtonPatterns`, plus universal collectors from `evidenceHelpers`
   - `EvidenceNormalizer.normalize()` sorts keys, lowercases, collapses whitespace
   - `WeightedEvidenceScorer.score(normalizedEvidence)` aggregates positive evidence from all sources, uses plugin's `successPhrases` and `failurePhrases` if defined, otherwise universal list
   - `FraudAnalyzer.analyze()` checks history manipulation, short time, failure phrases using plugin's `failurePhrases` or universal
   - Final result includes `portal` = plugin.portal (e.g., RECRUITEE), `reasons` = aggregated positive evidences

3. **GenericPlugin** (`GenericCareerVerifier`, `OtherVerifier`):
   - Fallback when no specific ATS matches
   - HostPatterns: `/careers\./, /jobs\./` or `/.*/` (matches everything)
   - Uses universal success phrases (40+), not portal-specific
   - Collects evidence from ALL sources: URL, title, headings, body, buttons, meta, DOM, reference IDs, forms, icons, containers, progress bars, breadcrumbs, success banners, application summaries
   - Calculates confidence based on total evidence — if URL has /confirmation + title has Thank You + body has Reference Number → 15+15+20=50 → Verified (since threshold 40), even without knowing ATS

4. **Backward Compatibility**:
   - Existing plugins (LinkedIn, Indeed, Greenhouse, Lever, Workday) still work because they implement same `PortalPlugin` interface (hostPatterns, pathPatterns, etc.)
   - Old `VerificationScorer` still works as fallback if `WeightedEvidenceScorer` fails
   - `VerificationEntry` type includes optional v1.1 fields (positiveEvidence, neutralEvidence, etc.) but old fields (confidenceScore, matchedRules) still present

---

## How Design Minimizes False Negatives While Remaining Performant and Extensible

### False Negatives Minimized

1. **Evidence Aggregation, Not Exact Matching:**
   - Old: Required exact phrase "Application Submitted" in title AND heading. If ATS uses "All done", fails.
   - New: Collects EVERY possible signal, each contributes independently. "All done" in title is in `TITLE_SUCCESS_PHRASES`, so +15. Even if title missing, heading "All done" gives +20, body "You are all set" gives +20, URL /applied gives +15, reference gives +20 → 75 verified even without exact old phrases.

2. **Missing = 0, Not Penalty:**
   - Old: Missing title → -20, missing heading → -10, total -30, score drops from 100 to 70, plus other penalties → 50 suspicious → false negative.
   - New: Missing title → 0, missing heading → 0, score stays high if other positives exist.

3. **Positive Dominates:**
   - Old: Negative penalties summed equally with positives, e.g., Apply button -15 equal to Title +15, canceling out.
   - New: Positive weights sum to 100+, negative max -5 (history) or -2 (apply button) or -1 (short time). Positive dominates.

4. **Lower Thresholds:**
   - Old: 65 verified — need many signals to pass.
   - New: 40 verified — 3 positive signals (e.g., URL + heading + reference = 15+20+20=55) already verified. Genuine submissions typically have at least 3 signals (URL path + heading + body, or reference alone + 1 other).

5. **Reference ID Strongest Positive:**
   - If reference ID found (Application ID, Reference Number, Candidate ID), +20 and boost to verified even if score 30. Genuine ATS almost always shows reference number on confirmation, so even if wording varies, reference ensures verification.

6. **Generic Plugin Smarter:**
   - Old generic only checked URL and title regex, capped at 60.
   - New generic checks 12+ sources (URL, title, headings, body, meta, breadcrumbs, JSON-LD, DOM fingerprints, buttons, references, forms, icons, progress bars, application summaries) and cap increased to 90, so generic career sites (company websites) can now verify.

7. **Portal-Specific Success Vocabulary:**
   - Each plugin defines its own success phrases. Recruitee uses "All done", Ashby uses "You're all set", Workday uses "You have successfully submitted". Generic engine doesn't assume every portal uses same wording. Adding new ATS only requires adding its vocabulary, not rewriting engine.

### Performance Maintained

- **RecruitmentPageDetector gate:** Runs first, <1ms for unrelated pages (checks URL path, hostname, title, few selectors, body text <200KB). If not recruitment, exit immediately — no MutationObserver, no heavy collectors, no engine.
- **Heavy analysis only after gate:** `setupSpaObserver()` (MutationObserver) and `EvidenceCollector` with many selectors only wired after page confirmed recruitment. On regular browsing (e.g., news, YouTube), extension does zero heavy work.
- **Limited DOM queries:** Each collector limits queries: buttons up to 50, headings up to 10, body text scan only if <200KB, DOM fingerprint checks 20 selectors not entire DOM, evidence collection debounced 800ms, not on every mutation.
- **Async scoring:** `detectAsync` uses `requestIdleCallback` with 500ms timeout to yield to browser event loop.

### Extensibility

- **Add New ATS:** Create new class extending `BasePortalPlugin`, define `hostPatterns` (e.g., `/(?:^|\.)newats\.com$/`), `pathPatterns`, `titlePatterns`, `headingPatterns`, `confirmationPatterns`, `referencePatterns`, `expectedSelectors`, `positiveButtonPatterns`, etc., and add to `PortalRegistryV2.verifiers` array. No engine changes needed. Example: Adding `Rippling` took 20 lines.

- **Shared Utilities:** New ATS automatically benefits from universal success phrases, normalization helpers, evidence collectors, fraud analyzer, weighted scorer — no duplicated logic.

- **No Hardcoded Companies:** Plugins match ATS platforms (`recruitee.com`), not employers (`hardrockdigital.recruitee.com`), so one plugin covers infinite employers using same ATS. Adding new employer requires zero code changes.

- **Versioned Evidence:** `VerificationEvidence` has `totalPositiveSignals`, `evidenceScoreBreakdown`, `positiveSignals` arrays — new evidence types can be added without breaking old storage (optional fields).

- **Backend Compatibility:** Backend `JobPortal` enum extended with new ATS values (RECRUITEE, ASHBY, etc.) via migration, but old values still work. New portals map to same verification flow, no API changes.

---

## Files Modified — Complete List

### Extension

**Engine Core:**
- `extension/src/verification/engine/EngineConfig.ts` — Rebalanced scoring, lowered thresholds, minimal fraud penalties, generic cap increased, added evidence thresholds and logging flags, version 1.0.0→1.1.0
- `extension/src/verification/engine/VerificationEngine.ts` — Rewritten to new pipeline: Portal Detection → Evidence Collection → Normalization → Weighted Confidence Engine → Fraud Analysis → Final Verification, improved logging with sections, scoreEvidence() method for testing

**Types:**
- `extension/src/verification/types/index.ts` — Extended JobPortal enum with 19 new ATS, added UrlEvidence, MetaEvidence, BreadcrumbEvidence, StructuredDataEvidence, ButtonEvidence, ReferenceEvidence, TitleEvidence, HeadingEvidence, BodyEvidence, positive/neutral/negative signals, evidenceScoreBreakdown, enhanced PortalDefinition with successPhrases, failurePhrases, confirmationSelectors, applicationIdSelectors, candidateIdSelectors, domFingerprints, buttonPatterns, companySelectors, jobTitleSelectors

**Utilities (New):**
- `extension/src/verification/utils/normalization.ts` (NEW) — Shared normalization helpers, no duplicated regex
- `extension/src/verification/utils/successPhrases.ts` (NEW) — Universal success phrases (URL 22, Title 27, Heading 30, Body 40+, Failure 15, Reference 15, Button positive/negative, Meta, Breadcrumb, DOM fingerprints 12 types, JSON-LD, ATS host patterns 45+)
- `extension/src/verification/utils/evidenceHelpers.ts` (NEW) — 7 shared evidence collectors: meta, breadcrumbs, JSON-LD, DOM fingerprints, URL, buttons, references

**Evidence:**
- `extension/src/verification/evidence/EvidenceCollector.ts` — Rewritten to universal collection using evidenceHelpers, aggregates positive/neutral/negative signals at collection time, creates evidenceScoreBreakdown, totalPositiveSignals
- `extension/src/verification/evidence/EvidenceNormalizer.ts` — Rewritten to use shared normalization helpers, normalize() for universal evidence, createDebugView() for improved logging

**Scoring:**
- `extension/src/verification/scoring/WeightedEvidenceScorer.ts` (NEW) — Evidence aggregation model, start at 0 add positive, missing=0, reference strongest +20, boost logic for reference + many positives to minimize false negatives
- `extension/src/verification/fraud/FraudAnalyzer.ts` (NEW) — Separate fraud analysis, minimal penalties (history -5, short time -1, apply button -2 weak), failure phrases -10 single/-30 multiple, determines isFraud, isOverwhelmingFailure
- `extension/src/verification/scoring/Scorer.ts` — Updated to delegate to WeightedEvidenceScorer if universal evidence present, legacy fallback with evidence aggregation philosophy (missing=0, negative only 20% unless history, generic cap 90)
- `extension/src/verification/scoring/ConfidenceMapper.ts` — Thresholds lowered: HIGH 40 (was 65), MEDIUM 20 (was 45), VERIFIED 40, VERY_LIKELY 30, POSSIBLE 20

**Rules (all updated to evidence-driven, missing=0):**
- `extension/src/verification/rules/BaseRule.ts` — Added evidenceOutcome() helper with category, evaluateEvidence optional
- `extension/src/verification/rules/DomainRule.ts` — Added 17 new ATS host patterns, evaluateEvidence checks urlEvidence, hostname, https, blocked, portal plugin match → positive, generic → weak positive, not penalty
- `extension/src/verification/rules/PageTitleRule.ts` — Uses titleEvidence.hasSuccess, missing=0 neutral
- `extension/src/verification/rules/HeadingRule.ts` — Uses headingEvidence.hasSuccess, missing=0
- `extension/src/verification/rules/ConfirmationBodyRule.ts` — Uses bodyEvidence.hasSuccess, missing=0
- `extension/src/verification/rules/ReferenceRule.ts` — Weight increased 15→20 strongest, uses referenceEvidence.hasAnyReference
- `extension/src/verification/rules/DomFingerprintRule.ts` — Uses universal domFingerprint with fingerprintScore, hasSuccessCard, hasSuccessIcon, receiptCard, etc.
- `extension/src/verification/rules/PortalComplianceRule.ts` — Positive if portal not OTHER
- `extension/src/verification/rules/ApplyButtonRule.ts` — Very weak signal: hasPositive +2 weak positive, hasNegative -2 only if positiveCount<2 else neutral, not automatic penalty

**Portal Plugins:**
- `extension/src/verification/portals/PortalPluginBase.ts` — Enhanced with new optional fields (successPhrases, failurePhrases, confirmationSelectors, applicationIdSelectors, candidateIdSelectors, receiptSelectors, successIconSelectors, progressSelectors, breadcrumbSelectors, positiveButtonPatterns, negativeButtonPatterns, domFingerprints), added getSuccessPhrases(), getFailurePhrases(), getConfirmationSelectors(), extractApplicationId(), extractCandidateId(), extractAllReferences(), enhanced company/job title extraction
- `extension/src/verification/portals/GenericVerifiers.ts` — Rewritten to be much smarter: universal URL/title/heading/body phrases, 15 expectedSelectors, enhanced company/jobTitle extraction with 5-7 selectors, domFingerprints object with 12 types
- `GreenhouseVerifier.ts`, `LeverVerifier.ts`, `WorkdayVerifier.ts`, `LinkedInVerifier.ts`, `IndeedVerifier.ts`, `SuccessFactorsVerifier.ts`, `OracleVerifier.ts`, `TaleoVerifier.ts` — All enhanced with universal phrases (TITLE_SUCCESS_PHRASES, HEADING_SUCCESS_PHRASES, BODY_SUCCESS_PHRASES, URL_SUCCESS_PATTERNS), successPhrases, failurePhrases, confirmationSelectors, applicationIdSelectors, positive/negative button patterns, domFingerprints
- `UniversalATSVerifiers.ts` (NEW) — 16 new ATS plugins: Recruitee, Ashby, Teamtailor, SmartRecruiters, BambooHR, Jobvite, Personio, iCIMS, JazzHR, BreezyHR, Comeet, Fountain, Pinpoint, Rippling, Workable, Dover — each defines hostPatterns (ATS platform regex, not employer), pathPatterns, title/heading/confirmation patterns, referencePatterns, expectedSelectors, button patterns, success/failure phrases
- `extension/src/verification/portals/index.ts` — Added 16 new verifiers to registry (now 28+ plugins), order core + universal + generic + fallback Other

**Manifest & Build:**
- `extension/src/manifest.ts` — Version 1.0.0→1.1.0, description enterprise-grade, universal injection https://*/* with RecruitmentPageDetector filtering
- `extension/package.json` — Version 2.0.0→1.1.0, description Universal ATS Intelligence v1.1
- `extension/src/detectors/RecruitmentPageDetector.ts` — Already exists in main (9098e36), fast gate <1ms, checks URL recruitment regex, known ATS hostname regex (45+ patterns including new ATS), title recruitment regex, body text confirmation, form field labels, apply button text, structural selectors — short-circuit true on first positive

**Content Script:**
- `extension/src/content.ts` (main branch) — Already has RecruitmentPageDetector gate, performance: heavy analysis only after gate, SPA observer only after recruitment confirmed, debounced 800ms, URL polling only for recruitment pages

### Backend

- `backend/prisma/schema.prisma` — Added 19 new JobPortal enum values (RECRUITEE, ASHBY, TEAMTAILOR, SMARTRECRUITERS, BAMBOOHR, JOBVITE, PERSONIO, TALEO, SUCCESSFACTORS, ICIMS, JAZZHR, BREEZYHR, COMEET, FOUNTAIN, PINPOINT, RIPPLING, WORKABLE, WORKDAY, ORACLE)
- `backend/prisma/migrations/20260804110000_add_new_ats_portals/migration.sql` (NEW) — ALTER TYPE JobPortal ADD VALUE for each new ATS
- `backend/src/modules/verification/portals/portal.definitions.ts` — Expanded SUPPORTED_PORTALS from 10 to 25+ with universal ATS, added all done, you're all set, success, etc. patterns, updated generic career site to 10 path patterns (confirmation, thank-you, success, submitted, applied, completed, done, finish, receipt, reference) and 6 title/heading patterns and 10 confirmation phrases
- `backend/src/modules/verification/scoring/scorer.service.ts` — Rewritten to evidence aggregation model (start 0 add positive, missing 0), positive dominates, minimal penalties (history -5, short time -1, apply button -2 weak), failure phrases -10 single/-30 multiple, generic cap 90, reference boost, many positives boost
- `backend/src/modules/verification/scoring/confidence.ts` — Thresholds lowered: HIGH 40 (was 80), MEDIUM 20 (was 50), VERIFIED 40, VERY_LIKELY 30, POSSIBLE 20
- `backend/src/modules/verification/verification.service.ts` — Verified threshold lowered 80→40, fraud signals merged
- `backend/src/modules/applications/application.service.ts` — Verified threshold lowered 80→40
- `backend/src/modules/verification/__tests__/scorer.service.test.ts` — Updated tests to reflect v1.1 philosophy: apply button very weak signal, short time minimal influence, missing headings zero impact, generic cap 90

---

## Testing & Verification

### Backend Tests (22 passing)

Updated to v1.1 philosophy:

- `should score high for valid greenhouse evidence` — expects >=80 still passes (100)
- `should reject insecure http` — 0 + UNSUPPORTED_DOMAIN_OR_INSECURE
- `should reject blocked hostname` — 0
- `should penalize apply button still visible — very weak signal per v1.1` — now checks weak variant APPLY_BUTTON_STILL_VISIBLE_WEAK, score >=85 not heavily penalized, weakNegativeEvidence contains apply button
- `should detect history manipulation — kept as fraud indicator` — expects HISTORY_MANIPULATION_DETECTED
- `should handle short time on page — minimal influence per v1.1` — 1000ms no SHORT_TIME fraudSignal, only weak negative, very short <500ms flagged VERY_SHORT
- `should handle missing headings — zero impact per v1.1` — expects >=60 still high (not <80), positive evidence still present
- `should cap generic portal at 90 without strong evidence` — increased from 60

### Extension Build

- `npm run build` → 89 modules (was 81), content 124.79k gzip 27.03k (was 55k), popup 148k
- Reason for increase: 16 new ATS plugins, 3 new utility modules (normalization, successPhrases, evidenceHelpers), WeightedEvidenceScorer, FraudAnalyzer, universal evidence collection
- Still performant because RecruitmentPageDetector gate ensures heavy 124k content script logic only runs on recruitment pages (<1ms gate for unrelated pages)

### Manual Testing Checklist (for production)

- [ ] Greenhouse: `https://job-boards.greenhouse.io/company/jobs/123/confirmation` → should be Verified 85%+ with reference
- [ ] Recruitee: `https://company.recruitee.com/careers/123/applied` with heading "All done" → should be Verified (URL /applied + heading All done + body You are all set) even though old engine would fail
- [ ] Ashby: `https://jobs.ashbyhq.com/company/123/application` with heading "You're all set" → Verified
- [ ] Teamtailor: `https://company.teamtailor.com/jobs/123/applications/thank-you` → Verified
- [ ] Generic career site: `https://company.com/careers/application/confirmation` with body "Thank you for applying, reference RF-123" → Verified 70%+ even without known ATS
- [ ] Negative test: `https://company.com/careers` with no confirmation → Not recruitment? Should be ignored by RecruitmentPageDetector, no heavy analysis
- [ ] Apply button still visible: Page shows confirmation but also "Browse Jobs" and "Apply to other jobs" → Should still be Verified (apply button very weak, many positives outweigh)
- [ ] Short time: Submit and immediately return (<1000ms) → Should still be Verified (minimal influence, -1 only)

---

## Conclusion

v1.1 Universal ATS Intelligence achieves:

- **False Negatives Minimized:** Lower thresholds (40 verified vs 65), missing evidence = 0 not penalty, positive dominates, reference strongest, many positives boost, generic smarter with 12+ evidence sources
- **Performance Maintained:** RecruitmentPageDetector fast gate <1ms, heavy analysis only after gate, limited DOM queries (50 buttons, 200 elements), debounced, requestIdleCallback
- **Extensibility:** Add new ATS by creating 20-line plugin class with hostPatterns and vocabulary, add to registry, no engine changes, matches ATS platform not employer (one plugin covers infinite employers)
- **Code Quality:** TypeScript strong typing, shared normalization helpers, shared evidence collectors (evidenceHelpers.ts), reusable success phrases (successPhrases.ts), no duplicated regex, plugin-specific config

**Branch:** main (current) contains v1.1 implementation (89 modules, 1.1.0)
**Next:** Commit and push to `arena/019fc8fc-mayzax` or `main` as per new branch strategy, rebuild extension, test on real ATS pages
