# Mayzax ATS — Enterprise Verification Engine Audit & Redesign

**Author:** Siddharth Ohal (7even-7even) <sidxohal9049@gmail.com>
**Date:** 2026-08-03 UTC
**Branch Context:** `arena/019fc8fc-mayzax` branched from `extension@a686887`
**Status:** PHASE 1 Complete — Awaiting approval for PHASE 2-10 implementation
**Version:** Design v2.0

---

## Table of Contents

1. [Repository Audit](#1-repository-audit)
2. [Existing Verification Logic Map](#2-existing-verification-logic-map)
3. [Weakness Report](#3-weakness-report)
4. [Proposed Architecture v2](#4-proposed-architecture-v2)
5. [Verification Engine Design](#5-verification-engine-design)
6. [Scoring Model](#6-scoring-model)
7. [Evidence & Hashing](#7-evidence--hashing)
8. [Threat Model](#8-threat-model--fraud-resistance)
9. [Database Changes](#9-database-changes)
10. [API Changes](#10-api-changes)
11. [File-by-File Implementation Plan](#11-file-by-file-implementation-plan)
12. [Migration Strategy & Backward Compatibility](#12-migration-strategy--backward-compatibility)
13. [Testing Strategy](#13-testing-strategy)
14. [Implementation Roadmap](#14-implementation-roadmap)

---

## 1. Repository Audit

### 1.1 Top-Level Layout

```
Mayzax/
├── backend/     Express + Prisma + PG (Neon)
├── frontend/    React CPTS CRM Dashboard (Vite)
├── extension/   Chrome MV3 Extension (CRXJS + Vite)
├── mobile/      Expo Companion (read-only)
├── docs/
├── package.json (root workspace ref)
└── render.yaml
```

### 1.2 Extension Architecture

**Manifest:** `extension/src/manifest.ts` (MV3, `@crxjs/vite-plugin` `defineManifest`)

- `manifest_version: 3`
- `name: Mayzax CRM — Application Verifier`
- `action.default_popup: src/popup/popup.html`
- `background.service_worker: src/background.ts` module
- `content_scripts.matches`: ~22 portal patterns (LinkedIn, Indeed, Glassdoor, Jobright, Simplify, SimplyHired, Wellfound, Handshake, Naukri, Dice, Monster, ZipRecruiter, CareerBuilder, Lever, Greenhouse, SpeedyApply, TheMuse, YCombinator, etc)
- `permissions: ['storage','tabs','activeTab','scripting']`
- `host_permissions`: mirrors matches
- `externally_connectable.matches`: `mayzax.app`, `mayzax.vercel.app`, `localhost:*`

**Popup:**

- `src/popup/popup.html` -> `main.tsx` -> `Popup.tsx`
- Components: `VerificationCard.tsx`, `ConfidenceBadge.tsx`
- Logic: loads `VerificationStore.getAll()`, shows latest + history, clear cache.
- No form, no backend call. Pure storage viewer.

**Background Service Worker:** `src/background.ts` (59 lines)

- `chrome.runtime.onMessage` listener for `PAGE_VERIFIED` -> logs, responds success.
- `chrome.runtime.onMessageExternal` listener for `VERIFY_URL` from web app -> calls `VerificationStore.findByUrl(targetUrl)` and returns verified + metadata.
- `onStartup` triggers TTL purge via `getAll()`.

**Content Script:** `src/content.ts` (62 lines)

- Instantiates `PortalRegistry.getInstance()`, `getDetector(currentUrl)`
- Calls `detector.detectSuccess(document, currentUrl)`
- If `success && confidenceScore >=50`, extracts metadata via `extractPageMetadata`, builds `verificationPayload` (portal, company, jobTitle, url, pageTitle, verified, confidenceScore, matchedRules, matchedKeywords, timestamp), saves via `VerificationStore.save()`, then `chrome.runtime.sendMessage({action:'PAGE_VERIFIED', payload})`
- Initial run on DOMContentLoaded / interactive / complete
- MutationObserver on `document.body childList subtree` debounced 1000ms to handle SPA navigation.

**Storage:** `src/storage/VerificationStore.ts` (77 lines)

- `chrome.storage.local` key: `verifications` — array of `VerificationEntry`
- MAX_ENTRIES 100, TTL 24h, `normalizeUrl` for dedup, `crypto.randomUUID()`, auto eviction on read/write.
- Methods: `save`, `findByUrl`, `getAll`, `remove`, `clear`

**Detectors:**

- `src/detectors/BaseDetector.ts` (57 lines): abstract `portal`, composes 8 rules (HeadingContains, UrlContains, SuccessBanner, ButtonChanged, Toast, Mutation, AriaAlert, PageTitle), sums scores, caps 100, success if >=50. No portal-specific overrides.
- `src/detectors/PortalRegistry.ts` (73 lines): singleton registry, list of 20 detectors, `getDetector(url)` linear search `canHandle`, fallback `OtherDetector`.
- `src/detectors/Portals.ts` (112 lines): 19 concrete detectors, each only implements `canHandle(url)` via `includes`. `CompanyWebsiteDetector` and `CareerSiteDetector` have brittle heuristics. No portal-specific rules.
- `src/detectors/LinkedInDetector.ts`: trivial wrapper.

**Rules:** `src/rules/*` (8 files)

- `BaseRule.ts`: abstract `name`, `weight`, `evaluate(doc, url): RuleResult`
- `HeadingContainsRule.ts` weight 30: queries `h1,h2,h3`, negative check, positive keywords substring includes, case-insensitive lower.
- `UrlContainsRule.ts` weight 20: checks `pathname+search` lower includes `URL_PATTERNS` (submitted, confirmation, success, completed, etc)
- `SuccessBannerRule.ts` weight 20: queries `[role=alert], .alert-success, ...`, keyword search.
- `ButtonChangedRule.ts` weight 10: queries `button,input[type=submit],[role=button]`, checks disabled + text includes target keywords applied/submitted/completed/done/success
- `PageTitleRule.ts` weight 10: checks title lower includes POSITIVE_KEYWORDS
- `MutationRule.ts` weight 10: checks existence of `#root, #__next, [data-reactroot], body` + confirmation selectors `[class*=Confirmation], [class*=Success], [id*=confirmation] ...`
- `ToastRule.ts` weight 5: queries `.toast, .snackbar, .notification...`, keyword search
- `AriaAlertRule.ts` weight 5: queries `[aria-live], [role=status], [role=alert]...`, keyword search

**Types:** `src/types/index.ts` (78 lines)
- `JobPortal` enum 21 values (mirrors backend)
- `ConfidenceLevel = VERIFIED|VERY_LIKELY|POSSIBLE|NOT_VERIFIED` (different from spec LOW|MEDIUM|HIGH)
- `VerificationEntry`: id, portal, company, jobTitle, url, pageTitle, verified bool, confidenceScore number, matchedRules, matchedKeywords, timestamp
- `RuleResult`: ruleName, passed, score, matchedKeywords?
- `DetectionResult`: success, confidenceScore, matchedRules, matchedKeywords
- `ExtractedMetadata`: company, jobTitle, pageTitle, portal

**Utils:**

- `keywords.ts` (75 lines): `POSITIVE_KEYWORDS` 33 entries including overly generic 'completed','complete','done','finished','accepted','received','confirmed','submitted','you are all set' — huge false positive risk. `NEGATIVE_KEYWORDS` 16 entries. `URL_PATTERNS` 14 entries including 'status','done','applied' etc (very generic).
- `metadata.ts` (143 lines): portal-specific for LINKEDIN, GREENHOUSE, LEVER only (DOM selectors), fallback to `og:site_name`, `og:title`, title split at ` at `, ` - `, ` | `, ` @ `, hostname first label extraction. Filters genericTitles but still brittle.
- `url.ts` (45 lines): `normalizeUrl` strips hash + utm_, fbclid, gclid, _hsenc, ref query params. `extractHostname`.
- `confidence.ts` (8 lines): `>=90 VERIFIED, >=70 VERY_LIKELY, >=50 POSSIBLE, else NOT_VERIFIED`

**Build:** `package.json` scripts: `dev: vite build --watch`, `build: vite build`, `crxjs`. No tests in extension.

### 1.3 Backend Audit

**Config:** `backend/src/config/env.ts` — validates env, no `VERIFICATION_HMAC_SECRET` currently.

**JobApplication Model** `prisma/schema.prisma`:

```prisma
model JobApplication {
  id String @id @default(uuid())
  profileId String
  profile ClientProfile @relation
  recruiterId String
  recruiter User @relation
  jobLink String
  normalizedJobLink String
  companyName String
  jobTitle String
  jobPortal JobPortal @default(OTHER)
  status ApplicationStatus @default(APPLIED)
  appliedAt DateTime @default(now())
  businessDate DateTime @db.Date
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  verified Boolean @default(false)
  verificationMethod String?
  @@unique([profileId, normalizedJobLink], name:"unique_profile_joblink")
  @@index([recruiterId]) etc
}
```

No fields for verificationHash, verificationVersion, evidence, score, confidence, referenceId, hostname/pathname, verificationTimestamp, etc.

**Duplicate Prevention:** defense-in-depth both app-level pre-check `findByProfileAndNormalizedLink` + DB unique constraint. Good.

**Normalization:** `utils/normalizeJobLink.ts` (83 lines) — thorough: lowercases scheme+host, strips www, trailing slash, tracking params (utm_, gh_src, gh_referrer, ref, refid, referrer, trk, trackingid, src, source, session*, gclid, fbclid, mc_, originalsubdomain), preserves JOB_ID_PARAMS (gh_jid, job_id, jid, jk, reqid...), sorts params, removes fragments. More robust than extension's `normalizeUrl`.

**Portal Detection:** `utils/detectJobPortal.ts` (35 lines) — hostname includes mapping, returns OTHER fallback. No path validation, no HTTPS enforcement.

**Validation:** `application.validation.ts` — `createApplicationSchema` with `profileId uuid`, `jobLink url max 2048`, `companyName`, `jobTitle`, `jobPortal Enum default OTHER`, `applicationCompleted` preprocess (must be true literal), `status default APPLIED`, `verified boolean default false`, `verificationMethod string nullable`. Placeholder URL detection: blocks example.com, localhost, placeholder/dummy keywords. No verification证据 validation.

**Service:** `application.service.ts` (239 lines) — creates application, detects portal if OTHER, normalizes, duplicate pre-check, creates. No verification hash handling. No evidence storage.

**Controller/Routes:** standard CRUD + `check-duplicate` query endpoint with Zod. `GET /applications`, `POST /`, etc. No verification endpoint.

### 1.4 Frontend Audit

**Hook:** `frontend/src/hooks/use-extension-verification.ts` (209 lines)

- `DEFAULT_EXTENSION_ID = nmbkoelklehokgbdakioefnikogeakpc` (hardcoded)
- `CHROME_WEBSTORE_URL = https://chrome.google.com/webstore` placeholder
- `VERIFICATION_KEYWORDS` includes 'completed','finish','thankyou', etc — same generic issue.
- Fast-path: if lowercaseUrl includes any verification keyword, immediately returns verified 100% with `matchedRules: ['URL_KEYWORD_MATCH']`, bypassing extension check entirely. This is a critical bypass.
- Otherwise, checks `chrome.runtime.sendMessage` externally to extension IDs (primary + fallback). Sets states: idle, checking, verified, not_verified, not_installed, unavailable.
- Returns `isVerified`, `isChecking`, `verificationResult`, etc.

**Badge Component:** `frontend/src/components/shared/extension-verification-badge.tsx` (167 lines) — UI for states, shows confidence, company, role, portal, matchedRules.

**Form Dialog:** `application-form-dialog.tsx` (315 lines)

- `detectJobPortal(url)` duplicate client-side logic.
- Zod schema: profileId uuid, jobLink url, companyName, jobTitle, jobPortal enum, verified bool default false, verificationMethod nullable.
- Uses `useExtensionVerification(debouncedLink 500ms)` — if verified, auto-sets form `verified=true`, `verificationMethod` = 'Keyword Match' or 'Browser Extension', and overrides company/jobTitle/portal from extension result.
- Duplicate check hook `useCheckDuplicate` — shows duplicate badge.
- On submit, sends `verified` flag to backend directly, trusting client. No hash, no evidence.

**Data Flow End-to-End:**

Extension content.ts detects success -> storage.local -> background exposes via external message -> frontend hook reads via `chrome.runtime.sendMessage(extensionId, {action:'VERIFY_URL', url})` -> if verified, form auto-fills and sets verified=true -> POST to `/applications` with verified bool.

All verification is client-originated, with no cryptographic proof.

---

## 2. Existing Verification Logic Map

| Location | File | Function / Class | Responsibility | Current Weaknesses |
|---|---|---|---|---|
| Extension Content | `src/content.ts` | `runDetection()` | Orchestrate detection, metadata extraction, storage, notify background | Runs on every mutation, no throttling beyond 1s, no verification of real navigation, no anti-tamper |
| Detector Base | `src/detectors/BaseDetector.ts` | `detectSuccess(doc,url)` | Sum rule scores, cap 100, success>=50 | Same 8 rules for all portals, no portal specialization, no weighting tuning |
| Registry | `src/detectors/PortalRegistry.ts` | `getDetector(url)` | URL contains matching -> detector | Linear includes matching, no hostname validation, no HTTPS, path pattern ignored, trivial to spoof |
| Portal detectors | `src/detectors/Portals.ts` | `canHandle(url)` | Portal identity | brittle includes, e.g. `linkedin.com` matches `evil-linkedin.com`? Actually includes but not subdomain validation |
| Rules | `src/rules/HeadingContainsRule.ts` | `evaluate(doc)` | h1,h2,h3 keyword includes | Generic keywords like 'done','completed' will trigger on almost any page |
|  | `src/rules/UrlContainsRule.ts` | `evaluate` | pathname+search includes URL_PATTERNS | Very generic: 'status','done','applied','success' matches many non-success pages; attacker can add `?submitted=true` |
|  | `SuccessBannerRule` | `evaluate` | alert selectors + keywords | Selector list incomplete, keyword generic, DOM text can be injected by attacker via console |
|  | `ButtonChangedRule` | `evaluate` | disabled button text | Weak signal, also can be faked via DOM edit |
|  | `PageTitleRule` | `evaluate` | title keyword | Trivial to set `document.title='Application Submitted'` via console |
|  | `MutationRule` | `evaluate` | existence of #root + confirmation selectors | Selector `[class*=Success]` extremely broad, also present on many pages |
|  | `ToastRule`, `AriaAlertRule` | `evaluate` | toast/aria-live keywords | Easily faked |
| Keywords | `src/utils/keywords.ts` | constants | positive/negative/URL patterns | Overly broad, includes single words like 'done','received' |
| Metadata | `src/utils/metadata.ts` | `extractPageMetadata` | company/jobTitle extraction | Only 3 portals special-cased, generic fallback can be spoofed, no validation |
| URL util | `src/utils/url.ts` | `normalizeUrl` | strip tracking | weaker than backend, doesn't preserve job IDs correctly, doesn't sort params, allows injection |
| Storage | `src/storage/VerificationStore.ts` | `save`, `findByUrl` | persistence | stores unverified client data, no signature, TTL 24h but no anti-replay, normalizeUrl mismatch between ext and backend leads to bypass |
| Background | `src/background.ts` | `onMessageExternal VERIFY_URL` | Respond to frontend | No origin validation beyond externally_connectable, no authentication, no rate limit, returns stored entry based solely on URL normalization match — attacker can pre-populate storage by calling VerificationStore.save manually via devtools |
| Frontend hook | `use-extension-verification.ts` | `useExtensionVerification` | Verify via extension + keyword fast-path | Critical: URL keyword fast-path `VERIFICATION_KEYWORDS` matches many URLs and instantly marks verified without extension at all; if extension not installed, any URL with 'success' etc passes |
| Form dialog | `application-form-dialog.tsx` | `useEffect isVerified` | Auto-fill verified flag | Trusts frontend hook result, sets backend `verified` bool via client input, no evidence attached |
| Backend validation | `application.validation.ts` | `createApplicationSchema` | Validate application create | `verified` boolean accepted from client without proof; no verificationHash required |
| Backend normalization | `normalizeJobLink.ts` | `normalizeJobLink` | Canonicalize for dedup | Good but disconnected from extension normalization -> inconsistency exploited for duplicate bypass |
| Backend portal detect | `detectJobPortal.ts` | `detectJobPortalFromUrl` | Detect portal | Hostname includes only, no path validation, no HTTPS check, no unsupported rejection |

---

## 3. Weakness Report

### 3.1 Critical Vulnerabilities

**C1 — URL Keyword Bypass (Frontend):**
`use-extension-verification.ts` fast-path: if URL contains `completed`, `success`, `submitted`, etc, marks verified 100% with `URL_KEYWORD_MATCH` without involving extension. Recruiter can craft URL like `https://example.com/jobs/123?submitted=true` and pass verification. Severity: CRITICAL.

**C2 — Client-Controlled `verified` Flag:**
Backend accepts `verified: boolean` directly from client request body. No server-side evidence check. Attacker can intercept POST request and set `verified:true` manually, even without extension. Severity: CRITICAL.

**C3 — DOM Manipulation via DevTools:**
All rules inspect `document` live, but content script can be tricked by attacker opening console and doing `document.body.innerHTML = '<h1>Application Submitted</h1>'` then `document.title='Application Submitted'` then navigating URL via `history.replaceState({}, '', '/success?submitted=1')`. The MutationObserver will re-run detection and store fake verification. No integrity check. Severity: HIGH.

**C4 — No HTTPS / Domain Validation:**
`canHandle` uses `url.includes('linkedin.com')` — attacker can host `https://evil-linkedin.com/jobs?success=1` and it will match LinkedIn detector, but hostname is not validated as exact subdomain of linkedin.com. Also HTTP allowed. Severity: HIGH.

**C5 — Storage Tampering:**
`chrome.storage.local` is writable by any extension script, but also by content script via `VerificationStore.save` which uses `crypto.randomUUID()` without authentication. Attacker can open extension's content script context and call `VerificationStore.save({portal:..., url: 'https://fake.com/success', ...})` manually. Or directly write to chrome.storage via extension devtools. No cryptographic binding.

**C6 — History API Spoofing:**
Content script uses `window.location.href` but does not listen for `history.pushState/replaceState` trapping. Attacker can apply to a real job, then via console call `history.replaceState({},'', '/application-submitted-success')`, mutation observer may trigger verification on mismatched URL.

**C7 — Replay Attacks & No Nonce:**
Same verification entry can be reused infinitely. No timestamp freshness check beyond TTL, no nonce, no one-time use. Recruiter can verify once legitimately, then reuse same URL for all future submissions (duplicate prevention is per profile+link, but same link for different profile could be reused). More importantly, extension's stored entry keyed only by normalized URL, so same link always verified.

**C8 — No Application Reference Extraction / Duplicate Evidence Check:**
No extraction of Application ID / Reference Number. Two different users applying to same job link will both be marked verified with same evidence, but no way to detect if reference numbers collide or are missing.

**C9 — Backend Normalization Mismatch:**
Extension `normalizeUrl` vs Backend `normalizeJobLink` produce different canonical forms (backend sorts params, preserves job IDs, strips www, lowercases path; extension only strips some params and doesn't sort). This can cause duplicate bypass (same job different URL forms) or verification mismatch.

**C10 — No Server-Side Hash / HMAC:**
No cryptographic proof that evidence was collected by genuine extension instance on a genuine portal. No `verificationHash`.

### 3.2 Medium / Low

- **M1:** Generic keywords cause false positives (e.g., page saying "Complete your profile" triggers verification)
- **M2:** Negative keywords only checked in headings, not overall page.
- **M3:** No rate limiting on `VERIFY_URL` external message — can be brute forced.
- **M4:** Extension ID hardcoded + fallback default, but `externally_connectable` matches only mayzax domains, yet `chrome.runtime.sendMessage` can be called from any page if extension ID known? Actually external messaging requires sender origin to match externally_connectable, good — but still frontend origin can be spoofed via CORS? Not major.
- **M5:** No portal-specific DOM fingerprints (Workday expected sections, Greenhouse confirmation card id, etc)
- **M6:** Metadata extraction limited to 3 portals, unreliable for others.
- **M7:** No support for Workday, SuccessFactors, Oracle Cloud, Taleo — major ATS missing.
- **M8:** No evidence collection object — only company, jobTitle, pageTitle stored, not headings, confirmationText, buttons, hostname/pathname, extension version, verification timestamp etc.
- **M9:** Confidence calculation `getConfidenceLevel` uses thresholds 90/70/50 but rules sum weights up to 130+ (30+20+20+10+10+10+5+5=110) capped to 100, but no negative scoring for contradictory signals (e.g., Apply button still visible should reduce score significantly)
- **M10:** No tests in extension. Backend has vitest config but no verification-specific tests.
- **M11:** `CompanyWebsiteDetector` logic buggy: `!hostname.includes('.') || (!url.includes('careers.') && !url.includes('jobs.'))` — first condition never true for valid hostname, second condition flawed, could cause ALL unmatched URLs to go to CompanyWebsite instead of CareerSite.
- **M12:** No CSP nonce or integrity for extension assets, but MV3 handles.

### 3.3 Threats Not Covered

As per spec, currently none of these mitigations exist:
- URL editing
- history.replaceState/pushState
- DOM manipulation after page load
- fake success pages
- browser refresh tricks
- repeated submission of identical evidence
- replay attacks
- duplicated application references
- duplicate verification hashes
- unsupported ATS handling

---

## 4. Proposed Architecture v2

### 4.1 Guiding Principles

- Clean architecture, SOLID, modular, independently testable
- NEVER trust client alone; server is source of truth for hash & verification decision
- Weighted scoring with positive and negative signals
- Portal plugin architecture for extensibility
- Lightweight evidence, no screenshots, structured JSON
- HMAC_SHA256 only on backend with SERVER_SECRET
- Backward compatible: existing popup, storage, messaging, backend endpoints remain, new fields optional initially
- Fraud resistance by design: anti-DOM-tamper fingerprinting, navigation integrity, replay protection

### 4.2 High-Level Layers

```
Extension (Client)
-------------------
content.ts (orchestrator v2)
  -> verification/engine/VerificationEngine.ts
     -> verification/rules/* (Rule interface)
        DomainRule (10)
        HttpsRule (part of Domain)
        PageTitleRule (15)
        HeadingRule (20)
        ConfirmationBodyRule (20)
        ApplyButtonAbsenceRule (-15 if still present) -> negative weight
        ApplicationReferenceRule (15)
        DomFingerprintRule (15)
        PortalSpecificRule (5 + portal bonus)
     -> verification/portals/* (PortalPlugin interface)
        WorkdayVerifier, GreenhouseVerifier, LeverVerifier, LinkedInVerifier, IndeedVerifier, etc
     -> verification/evidence/EvidenceCollector.ts
     -> verification/scoring/Scorer.ts
     -> Types: VerificationResult { verified, score, confidence LOW|MEDIUM|HIGH, portal, reasons[], evidence{}, version }
  -> storage/VerificationStore (v2 with evidence + hash placeholder)
  -> background.ts (adds rate limiting, origin validation, adds verificationHash request to backend)

Frontend
--------
use-extension-verification v2:
  - removes URL keyword fast-path
  - requires extension verified + backend hash validation
  - calls new backend endpoint /applications/verify-evidence for pre-validation

Backend
-------
New module: verification/
  engine/
  rules/ (mirror client rules but server-side re-validation)
  portals/
  scoring/
  hashing/HashService.ts (HMAC_SHA256)
  evidence/EvidenceValidator.ts
  types/

New endpoints:
  POST /applications/verify-evidence -> accepts evidence, returns VerificationResult with hash
  POST /applications still accepts evidenceHash + validation

Updated Prisma:
  JobApplication adds verificationHash, verificationVersion, verificationScore, verificationConfidence, verificationEvidence Json?, verificationPortal, verificationTimestamp, applicationReference
  New model VerificationLog for audit: id, recruiterId, profileId?, jobLink, evidence Json, score, confidence, hash, portal, hostname, reference, createdAt, isReplay boolean, fraudSignals Json?

```

### 4.3 Directory Structure v2 (Extension)

```
extension/src/
├── background.ts
├── content.ts
├── manifest.ts
├── detectors/      (to be deprecated, kept for backward compat, eventually removed)
├── verification/
│   ├── engine/
│   │   ├── VerificationEngine.ts          // main orchestrator, runs rules in order
│   │   ├── RuleRegistry.ts                // registers rules, portal plugins
│   │   └── EngineConfig.ts                // weights, thresholds
│   ├── types/
│   │   ├── VerificationResult.ts
│   │   ├── Evidence.ts
│   │   ├── Portal.ts
│   │   ├── Rule.ts
│   │   └── Scoring.ts
│   ├── rules/
│   │   ├── BaseRule.ts                    // interface: id, weight, evaluate(context): RuleOutcome
│   │   ├── DomainRule.ts
│   │   ├── PageTitleRule.ts
│   │   ├── HeadingRule.ts
│   │   ├── ConfirmationBodyRule.ts
│   │   ├── ApplyButtonRule.ts             // checks Apply still visible => penalty
│   │   ├── ReferenceRule.ts
│   │   ├── DomFingerprintRule.ts
│   │   └── PortalComplianceRule.ts
│   ├── portals/
│   │   ├── PortalPlugin.ts                // interface
│   │   ├── WorkdayVerifier.ts
│   │   ├── GreenhouseVerifier.ts
│   │   ├── LeverVerifier.ts
│   │   ├── LinkedInVerifier.ts
│   │   ├── IndeedVerifier.ts
│   │   ├── SuccessFactorsVerifier.ts
│   │   ├── OracleVerifier.ts
│   │   ├── TaleoVerifier.ts
│   │   ├── ZipRecruiterVerifier.ts
│   │   ├── GlassdoorVerifier.ts
│   │   └── index.ts
│   ├── scoring/
│   │   ├── Scorer.ts                      // weighted sum + penalty logic + thresholds
│   │   └── ConfidenceMapper.ts            // score -> LOW/MEDIUM/HIGH + VERIFIED flag
│   ├── evidence/
│   │   ├── EvidenceCollector.ts           // collects structured evidence object
│   │   ├── EvidenceNormalizer.ts          // canonicalize fields, sort keys, normalize whitespace/casing
│   │   └── EvidenceValidator.ts           // client-side sanity checks
│   ├── hashing/
│   │   └── HashClient.ts                  // does NOT generate hash, but requests hash from backend, stores hash placeholder
│   └── utils/
│       ├── dom.ts                         // semantic DOM helpers, safe query, avoid brittle selectors
│       ├── text.ts                        // fuzzy matching, Levenshtein, normalization
│       ├── url.ts                         // strict hostname validation, HTTPS, path patterns
│       └── fingerprint.ts                 // DOM structural fingerprinting
├── storage/
│   ├── VerificationStore.ts               // v2 will store evidence + result
│   └── ReplayGuard.ts                     // prevents same URL reused within time window without refresh?
├── utils/ (legacy, will be moved)
│   ├── confidence.ts
│   ├── keywords.ts (deprecated, replaced by portal dictionaries)
│   ├── metadata.ts
│   └── url.ts
└── popup/
    ├── Popup.tsx (will display new fields: score, confidence LOW/MEDIUM/HIGH, hash short, reference)
    ├── components/
    └── main.tsx
```

### 4.4 Backend Structure v2

```
backend/src/modules/verification/
├── verification.controller.ts
├── verification.routes.ts
├── verification.service.ts
├── verification.validation.ts
├── hashing/
│   ├── hash.service.ts        // HMAC_SHA256 canonicalEvidence + SERVER_SECRET
│   └── canonicalize.ts        // sort keys, normalize whitespace, lowercasing rules per field
├── evidence/
│   ├── evidence.validator.ts  // validates evidence shape, rejects unsupported domains, checks required fields
│   └── evidence.schemas.ts
├── scoring/
│   ├── scorer.service.ts      // server-side re-scoring for defense in depth
│   └── confidence.ts
├── portals/
│   ├── portal.registry.ts
│   └── portal.definitions.ts  // supported ATS list, expected hostnames, path regexes, HTTPS required true
└── types/
    └── verification.types.ts
```

---

## 5. Verification Engine Design

### 5.1 Verification Result Object (v2 spec)

```typescript
interface VerificationResult {
  verified: boolean;                 // final decision
  score: number;                     // 0-100
  confidence: "LOW" | "MEDIUM" | "HIGH"; // mapped from score
  portal: JobPortal;                 // detected portal enum
  reasons: string[];                 // human readable e.g. "Domain validated: greenhouse.io", "Heading matched: Application Submitted"
  evidence: VerificationEvidence;    // structured evidence
  verificationHash?: string;         // HMAC from backend, only after backend validation
  verificationTimestamp: number;     // epoch ms
  version: "v2";                     // engine version
  applicationReference?: string | null;
}

interface VerificationEvidence {
  portal: JobPortal;
  hostname: string;                  // e.g. boards.greenhouse.io
  pathname: string;                  // e.g. /mycompany/jobs/12345
  fullUrl: string;                   // original URL (normalized? store both raw and normalized)
  normalizedUrl: string;             // backend-compatible normalized
  title: string;
  headings: string[];                // collected h1,h2, aria headings texts
  confirmationText: string;          // aggregated confirmation paragraphs
  applicationReference: string | null;
  detectedButtons: { text: string; disabled: boolean; visible: boolean }[];
  domFingerprint: {
    hasConfirmationCard: boolean;
    hasSuccessBanner: boolean;
    expectedContainersFound: number;
    unexpectedApplyButtonPresent: boolean;
  };
  verificationTimestamp: number;     // when collected
  extensionVersion: string;          // from manifest
  pageLanguage?: string;
  https: boolean;
}
```

### 5.2 Rule Interface

```typescript
interface RuleContext {
  document: Document;
  url: URL;
  portalPlugin?: PortalPlugin;
  evidenceBuilder: EvidenceBuilder;
}

interface RuleOutcome {
  ruleId: string;                    // e.g. "DomainValidation"
  passed: boolean;
  scoreContribution: number;         // positive or negative
  confidence?: "LOW"|"MEDIUM"|"HIGH";
  reasons: string[];
  evidence?: Partial<VerificationEvidence>;
  metadata?: Record<string, any>;
}

interface VerificationRule {
  id: string;
  defaultWeight: number;
  evaluate(ctx: RuleContext): RuleOutcome;
}
```

### 5.3 Rules Detailed

#### 1. DomainRule (weight 10)
- Validates: supported ATS list, expected hostname patterns, HTTPS true, expected path regex.
- Logic:
  - Parse URL via `new URL()`. If fails -> reject.
  - Check `protocol === 'https:'` else fail, reasons "Insecure protocol".
  - Hostname extraction, lowercased, strip www.
  - Against `SUPPORTED_PORTALS` dict: each portal has `hostPatterns: RegExp[]` like `/\.greenhouse\.io$/`, `/^boards\.greenhouse\.io$/`, etc, `pathPatterns: RegExp[]` e.g. `/\/jobs\/|\/applications\/submitted/`, etc. If no match -> REJECT, unsupported.
  - Also check punycode, length, not IP, not localhost.
- Fraud mitigation: MUST NOT rely on `includes`, must use anchored regex for subdomain validation: `(?:^|\.)greenhouse\.io$` .

#### 2. PageTitleRule (weight 15)
- Portal-specific dictionaries: e.g. Greenhouse titles: `/application submitted|thank you|job application|confirmation/i`, Lever: `/you have applied|application submitted/`, Workday: `/submission successful|you have successfully submitted|your application/i`. Allow fuzzy: Levenshtein distance <=2 or case-insensitive includes.
- Negative titles: `/error|failed|draft|incomplete|continue application/i` -> immediate -20 penalty.
- NOT exact equality. Use patterns list.

#### 3. HeadingRule (weight 20)
- Inspect `h1,h2,[role=heading][aria-level], [aria-label*=success]`
- Portal dictionaries for headings: Workday: "You have successfully submitted", "Application Submitted", Greenhouse: "Application Submitted", "Thank you", Lever: "Application submitted", LinkedIn: "Application submitted" etc.
- Fuzzy matching threshold 0.85 via token set ratio or simple includes.
- Collect all headings texts for evidence.

#### 4. ConfirmationBodyRule (weight 20)
- Search `p, [data-qa=confirmation], .confirmation-message, .success-message, [role=status], [aria-live=polite]`
- Search for confirmation paragraphs: length >20 chars, contains confirmation keywords but not just single word.
- Must find at least 2 semantic confirmations to pass full weight? Design: score proportional to matches.
- Avoid relying on single sentence.

#### 5. ApplyButtonRule (negative weight)
- Search DOM for buttons where text matches `/apply|submit application|continue application|quick apply/i`.
- If any such button is visible AND enabled (not disabled, not aria-disabled, offsetParent != null, not hidden) -> strong fraud signal.
  - Reduces confidence by -15 to -25.
  - Reason: "Apply button still present and enabled suggests application not completed".
- Do not depend solely on absence; if absent, +5 bonus; if present disabled, neutral.

#### 6. ReferenceRule (weight 15)
- Attempt to locate Application ID patterns via regex:
  - `/Application\s*(ID|Reference|Number)\s*[:#]?\s*([A-Z0-9-]{6,})/i`
  - `/Reference\s*Number\s*[:#]?\s*([A-Z0-9-]+)/i`
  - `/JR\s*ID\s*[:#]?\s*(\d+)/i`
  - `/Candidate\s*Number\s*[:#]?\s*([A-Z0-9-]+)/i`
  - `/Submission\s*Number\s*[:#]?\s*([A-Z0-9-]+)/i`
  - etc.
- Search textContent of main container, not entire body.
- Store detected values for evidence.
- If found, increases confidence, as presence of real reference is strong proof.
- If same reference already exists in backend verification log (duplicate), flag as duplicate for fraud.

#### 7. DomFingerprintRule (weight 15)
- For each portal, define structural fingerprint: expected sections/containers/labels.
Example Workday:
  - Expected: `data-automation-id="candidateApplicationConfirmation"`, `[data-automation-id=confirmationPage]`, `section` with heading.
  - Greenhouse: `.application-submitted`, `#application_confirmation`, `.thank-you`
  - Lever: `.application-complete`, `.posting-apply-success`
  - LinkedIn: `.artdeco-inline-feedback--success`, `h2` with "Application submitted"
- Avoid brittle selectors: prefer semantic `data-automation-id`, `data-qa`, ARIA roles, not `.css-12345`.
- Score based on number of expected containers found.

#### 8. PortalComplianceRule (weight 5 + bonus)
- Portal plugin defines titlePatterns, confirmationPatterns, DOM expectations, reference extraction, page fingerprints.
- Validates if portal-specific rules pass, add bonus.

### 5.4 Portal Plugin Interface

```typescript
interface PortalPlugin {
  portal: JobPortal;
  displayName: string;
  hostPatterns: RegExp[];
  pathPatterns: RegExp[]; // allowed paths for success pages
  titlePatterns: RegExp[];
  headingPatterns: RegExp[];
  confirmationPatterns: RegExp[];
  referencePatterns: RegExp[];
  expectedSelectors: string[]; // fingerprint selectors
  applyButtonSelectors: string[]; // to check if still present
  weightBonus?: number; // e.g. LinkedIn +5 if matches well
  extractCompany(doc: Document, url: URL): string | null;
  extractJobTitle(doc: Document, url: URL): string | null;
  extractReference(doc: Document): string | null;
}
```

Example implementations: WorkdayVerifier, GreenhouseVerifier, LeverVerifier, LinkedInVerifier, IndeedVerifier, SuccessFactorsVerifier, OracleVerifier, TaleoVerifier.

Each plugin independently testable.

---

## 6. Scoring Model

### 6.1 Weights (Proposed, tunable after audit)

| Rule | Weight | Negative Penalty |
|---|---|---|
| Domain Validation | 10 | -100 if unsupported / non-HTTPS (instant reject) |
| Page Title | 15 | -20 if error/draft title |
| Confirmation Heading | 20 |  |
| Confirmation Body | 20 |  |
| Application Reference | 15 |  |
| DOM Fingerprint | 15 |  |
| Portal Compliance | 5 |  |
| Apply Button Check | 0 base, +5 if absent | -15 if visible+enabled Apply button |
| **Total Possible** | **100 + bonuses** |  |

**Penalty Logic:**

- If Domain fails -> immediate 0, verified false, reason "Unsupported domain or insecure".
- If ApplyButtonRule finds enabled Apply -> score -= 15
- If negative keywords in title/heading/body -> score -= 20
- If unsupported ATS but still has success keywords -> cap at 30 max.

### 6.2 Thresholds

- **0-49 => Rejected** (verified false, confidence LOW)
- **50-79 => Suspicious** (verified false, but evidence stored, confidence MEDIUM, requires manual review)
- **80-100 => Verified** (verified true, confidence HIGH, 90+ would be HIGH with extra hash)

We will produce both `verified: boolean` (true only if >=80) and `confidence: LOW|MEDIUM|HIGH` mapping:

- 0-49 LOW
- 50-79 MEDIUM
- 80-100 HIGH

### 6.3 Reasons Array

Each rule produces human readable reasons pushed to final result.

---

## 7. Evidence & Hashing

### 7.1 Evidence Collection

Lightweight, no screenshots. JSON.

```json
{
  "portal": "GREENHOUSE",
  "hostname": "boards.greenhouse.io",
  "pathname": "/company/jobs/12345/confirmation",
  "fullUrl": "https://boards.greenhouse.io/company/jobs/12345/confirmation?gh_jid=6789",
  "normalizedUrl": "boards.greenhouse.io/company/jobs/12345/confirmation?gh_jid=6789",
  "title": "Application Submitted - Company",
  "headings": ["Application Submitted", "Thank you for applying"],
  "confirmationText": "Your application for Software Engineer has been submitted. Your application ID is APP-123456",
  "applicationReference": "APP-123456",
  "detectedButtons": [
    {"text": "View Jobs", "disabled": false, "visible": true}
  ],
  "domFingerprint": {
    "hasConfirmationCard": true,
    "hasSuccessBanner": true,
    "expectedContainersFound": 2,
    "unexpectedApplyButtonPresent": false
  },
  "verificationTimestamp": 1722700000000,
  "extensionVersion": "2.0.0",
  "https": true
}
```

### 7.2 Canonicalization (Backend only)

Steps before hashing:

1. Sort keys alphabetically (recursive)
2. Normalize whitespace: trim, collapse multiple spaces to single, remove \n\r\t -> space
3. Normalize casing: hostname lowercase, pathname lowercase? Keep case for title/headings but trim. For hashing, case-insensitive for headings? We'll define: hostname+pathname lowercased, title/confirmation lowercased trimmed, but preserve original in evidence storage separately.
4. Remove empty/null fields.
5. JSON.stringify canonical form.

### 7.3 HMAC_SHA256

```typescript
// Backend only
import crypto from 'crypto';
function generateVerificationHash(canonicalEvidence: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(canonicalEvidence).digest('hex');
}
```

- `SERVER_SECRET = process.env.VERIFICATION_HMAC_SECRET` (must be long random, min 32 chars, added to env.ts)
- Hash stored in DB and returned to extension as proof.
- Client NEVER generates hash; requests hash via `/verify-evidence` endpoint after evidence collection.
- Future: include recruiterId + timestamp in HMAC additional data to prevent cross-user replay? Could include `recruiterId` and `businessDate` in canonical payload as additional authenticated fields.

### 7.4 Storage of Evidence

- Backend: `VerificationLog` table stores raw evidence JSON, hash, score, portal, reference, hostname, fraudSignals.
- `JobApplication` references hash, but also stores evidence snapshot? Maybe store `verificationEvidence` JSON in JobApplication for quick access.
- Extension local storage stores evidence but not hash (hash only after backend call).

---

## 8. Threat Model & Fraud Resistance

### 8.1 Threats & Mitigations

| Threat | Current Vuln | Mitigation Design |
|---|---|---|
| **URL editing** (attacker adds `?success=1` or edits path to include keyword) | URL pattern includes trivial keywords | DomainRule requires exact host + path regex; PageTitle+Heading+Body must also pass, not just URL. Server re-validates hostname+path patterns. |
| **history.replaceState / pushState** spoofing | Content script reads location.href once, mutation observer re-triggers on DOM change but not history check | **Navigation Integrity Check:** Store initial `location.href` + `document.referrer`, listen for `popstate` and wrap `history.pushState/replaceState` to detect edits. If URL changes without full navigation (`performance.navigation` ?), reduce confidence -10 and log `history_manipulation` signal. Require evidence that URL change coincided with form submission detection (Mutation observed). Backend verifies that URL path matches portal's expected confirmation path. |
| **DOM manipulation after page load** (devtools insert h1) | All rules can be bypassed by injecting DOM | **Multi-layer:** <br>1. **Timing + Mutation Cost:** Evidence collection should observe that DOM initially did NOT have confirmation, then after some user interaction (form submit) it appeared. Simple heuristic: check MutationObserver history — if confirmation appears <100ms after page load with no prior interaction, suspicious.<br>2. **Structural fingerprint**: Workday's confirmation `data-automation-id` is harder to guess; attacker would need to know exact structure.<br>3. **CSS visibility + computed style**: Ensure elements are visible via `getComputedStyle` not just in DOM.<br>4. **Shadow DOM check**: Real ATS uses specific frameworks; injected nodes can be detected if not in expected container hierarchy.<br>5. **Backend cross-check**: If same hostname but reference number missing or generic text, lower score. |
| **Fake success pages** (attacker hosts `https://fake-greenhouse.com/success`) | Includes check allows evil domains | Strict hostname regex: `boards.greenhouse.io` must exactly match or subdomain of greenhouse.io via `(?:^|\.)greenhouse\.io$`. Reject IP, localhost, non-HTTPS. Maintain allowlist of ATS domains. Reject unsupported. |
| **Browser refresh tricks** (refreshing success page multiple times to generate many verifications) | No replay guard | **ReplayGuard:** Extension stores hash of evidence + URL + timestamp. Backend `VerificationLog` checks if same `verificationHash` already exists for same recruiter within 24h, marks `isReplay=true`, and frontend shows not_verified. Also `normalizedJobLink` duplicate prevention blocks same profile+link duplicate. Rate limit: max 10 verifications per minute per extension instance. |
| **Repeated submission of identical evidence** | No deduplication of evidence | Backend stores `verificationHash` unique per recruiter+evidence. If hash already exists, reject or flag. Also store `applicationReference` unique index; if same reference appears for different profile, flag fraud. |
| **Replay attacks** (attacker intercepts verificationPayload and replays) | No hash, no nonce | HMAC includes `verificationTimestamp` + `recruiterId` + nonce? Implementation: Backend generates hash server-side only after receiving evidence, includes timestamp freshness check (must be within 5min of server time). Evidence must include `verificationTimestamp` within ±5min, else reject as stale. Each hash single-use: if same evidence submitted twice, second considered replay. |
| **Duplicated application references** | No extraction | ReferenceRule extracts IDs. Backend creates unique constraint on `(normalizedJobLink, applicationReference)`? Actually reference may be same across same application? But if same reference used for different job links, flag. Store reference in `VerificationLog` with index, check duplicates across recruiters. |
| **Duplicate verification hashes** | No hash | Hash stored in DB with unique index per recruiter? If duplicate hash detected for different jobLink, fraud signal. |
| **Frontend keyword fast-path bypass** | `URL_KEYWORD_MATCH` allows any URL with `success` etc | **Remove fast-path entirely.** Verification must ALWAYS go through full engine and backend hash. Frontend hook must NOT consider URL keywords as verification. |
| **Client-controlled verified flag** | Backend accepts boolean | Backend must ignore `verified` bool from client; instead require `evidence` + `verificationHash` (generated by backend). `createApplication` must validate hash corresponds to evidence and portal. |
| **Unsupported ATS** | `OtherDetector` always returns true, allowing any domain | Reject unsupported domains at DomainRule level; only allow explicit allowlist. If OTHER, require higher evidence threshold + manual review, never auto-verify (>=80). For MVP, allow OTHER but cap score at 60 => suspicious. |
| **Extension storage tampering** | Content script can save arbitrary entry | Move sensitive storage to background script only via message passing; content script sends evidence to background, background validates and stores. Background validates evidence shape before saving. Also, frontend should not trust storage alone; it must call backend `/verify-evidence` to get hash. |
| **Man-in-the-middle on external messaging** | Any page can try to send messages if knows extension ID | Keep `externally_connectable` limited to mayzax.app domains. Backend verifies `Origin` header. Rate limit verification attempts. |
| **Timing attack: Applying then quickly editing** | MutationObserver debounce 1s allows editing before detection | Evidence collection should capture snapshot immediately upon detection, then freeze evidence object (no further mutations affect stored result). Store `evidenceCollectedAt` timestamp. |

### 8.2 Additional Hardening

- **CSP & Subresource Integrity:** Extension MV3 already isolates.
- **Extension version pinning:** Evidence includes extensionVersion; backend rejects if version < minimum supported (to force updates).
- **User interaction proof:** Ideally, detect that there was a click on Submit button before confirmation. Could capture via `document.addEventListener('submit')` or button click before success. Store `userInteractionDetected: boolean`.
- **Network request snooping (future):** Use `chrome.webRequest` to detect POST to ATS submission endpoint before confirmation. Would require `webRequest` permission + host permissions. Could be v2.1.
- **Time-on-page:** If time between page load and verification <3s, highly suspicious (real application takes longer). Score penalty.

---

## 9. Database Changes

### 9.1 New Env

`VERIFICATION_HMAC_SECRET`: min 32 chars random, required in production, added to `backend/src/config/env.ts` Zod.

### 9.2 Prisma Schema Additions

**Modify `JobApplication`:**

```prisma
model JobApplication {
  // existing fields...
  verified           Boolean  @default(false)
  verificationMethod String?
  // NEW FIELDS v2
  verificationHash       String?   @db.VarChar(128)
  verificationVersion    String?   @default("v2")
  verificationScore      Int?      // 0-100
  verificationConfidence String?   // LOW|MEDIUM|HIGH
  verificationEvidence   Json?     // snapshot of evidence object
  verificationPortal     String?   // portal detected by verification engine (for audit)
  verificationTimestamp  DateTime? // when verification occurred
  applicationReference   String?   // extracted reference ID

  @@index([verificationHash])
  @@index([applicationReference])
  @@index([verificationConfidence])
}
```

**New model `VerificationLog`:**

```prisma
model VerificationLog {
  id                String   @id @default(uuid())
  recruiterId       String
  recruiter         User     @relation(fields: [recruiterId], references: [id], onDelete: Cascade)
  profileId         String?  // optional, if duplicate check before creation
  jobLink           String
  normalizedJobLink String
  evidence          Json
  canonicalEvidence String?  @db.Text
  verificationHash  String   @unique // HMAC hash
  score             Int
  confidence        String   // LOW|MEDIUM|HIGH
  portal            JobPortal
  hostname          String
  pathname          String
  reference         String?
  isReplay          Boolean  @default(false)
  fraudSignals      Json?    // array of strings like ["HISTORY_MANIPULATION", "APPLY_BUTTON_VISIBLE"]
  createdAt         DateTime @default(now())

  @@index([recruiterId])
  @@index([hostname])
  @@index([portal])
  @@index([profileId])
  @@index([createdAt])
  @@map("verification_logs")
}
```

Also need relation in User model: `verificationLogs VerificationLog[]`

Migration file: `20260803120000_add_verification_v2` with SQL.

### 9.3 Indexes

- Ensure `verificationHash` unique prevents duplicate evidence.
- Composite index on `(recruiterId, verificationHash)` for replay detection.
- Index on `applicationReference` to detect duplicate reference reuse.

---

## 10. API Changes

### 10.1 New Endpoint: POST /applications/verify-evidence

**Purpose:** Client (extension via background -> frontend -> backend) sends structured evidence, backend validates, scores, canonicalizes, generates HMAC hash, stores VerificationLog, returns VerificationResult.

**Auth:** requireAuth, Role RECRUITER|TEAM_LEADER.

**Request Body:**

```typescript
{
  evidence: VerificationEvidence (strict shape),
  profileId?: string, // optional for duplicate reference check
  existingHash?: string // for replay detection
}
```

**Validation:** Zod schema `verifyEvidenceSchema`.

**Response:**

```typescript
{
  success: true,
  data: {
    verified: boolean,
    score: number,
    confidence: "LOW"|"MEDIUM"|"HIGH",
    portal: JobPortal,
    reasons: string[],
    verificationHash: string,
    version: "v2",
    evidence: ...,
    verificationTimestamp: DateTime
  }
}
```

**Logic:**

1. Validate evidence shape via Zod.
2. Validate `evidence.verificationTimestamp` within 5min of server time (prevent stale replay).
3. Server-side re-scoring using same rules (imported from shared verification lib) to ensure client didn't lie. If client score differs >10 from server re-score, flag fraud.
4. Check hostname against allowlist, HTTPS true.
5. Canonicalize evidence via `canonicalize.ts` (sort keys, normalize whitespace, lowercase hostname etc).
6. Generate HMAC hash via `hash.service.ts`.
7. Check if hash already exists in VerificationLog -> if exists and same recruiter, mark isReplay, return existing but with isReplay true, don't allow reuse for new profile? Might still return but warn.
8. Check if `applicationReference` already exists for different jobLink -> fraud signal.
9. Store VerificationLog.
10. Return result with hash.

**Rate Limiting:** 30 requests per minute per user (stricter than global).

### 10.2 Modified Endpoint: POST /applications

**Current:** accepts `verified boolean` from client.

**New:**

- Now accepts optional `verificationHash`, `verificationScore`, `verificationEvidence`? Actually better to require hash.
- Validation: if `verified=true`, then `verificationHash` must be present and must exist in VerificationLog for that recruiter and must not be expired (>24h) and must match jobLink normalized.
- If hash missing but verified true -> reject 400: "Verification hash required for verified applications".
- Server sets `verified` based on VerificationLog entry's confidence >= HIGH (>=80), not client bool.
- Store all verification fields in JobApplication.

**Backward Compat:** For migration period, allow old clients to send `verified=false` without hash. But if they send `verified=true` without hash, reject with instruction to update extension. After 100% migration, require hash for all.

### 10.3 New Endpoint: GET /applications/verify-hash/:hash

Check if hash exists and returns its status (for frontend verification badge quick check).

---

## 11. File-by-File Implementation Plan

### 11.1 Phase A: Backend Foundations (no breaking)

**Files to CREATE:**

- `backend/src/modules/verification/types/verification.types.ts` — defines VerificationResult, Evidence, Portal, Rule, Scoring interfaces (mirror extension types but server-side).
- `backend/src/modules/verification/hashing/canonicalize.ts` — canonicalization logic.
- `backend/src/modules/verification/hashing/hash.service.ts` — HMAC generation + verification.
- `backend/src/modules/verification/evidence/evidence.schemas.ts` — Zod schemas for evidence.
- `backend/src/modules/verification/evidence/evidence.validator.ts` — validation + fraud signals.
- `backend/src/modules/verification/portals/portal.definitions.ts` — supported portals dict with hostPatterns, pathPatterns, titlePatterns etc.
- `backend/src/modules/verification/portals/portal.registry.ts` — registry.
- `backend/src/modules/verification/scoring/scorer.service.ts` — weighted scorer.
- `backend/src/modules/verification/scoring/confidence.ts` — score->confidence.
- `backend/src/modules/verification/verification.validation.ts` — Zod for request.
- `backend/src/modules/verification/verification.service.ts` — main service (validate, score, hash, store log, replay check).
- `backend/src/modules/verification/verification.controller.ts` — controller handles request.
- `backend/src/modules/verification/verification.routes.ts` — routes.

**Files to MODIFY:**

- `backend/src/config/env.ts` — add `VERIFICATION_HMAC_SECRET` Zod, default for dev but required in prod.
- `backend/prisma/schema.prisma` — add fields to JobApplication + new VerificationLog model + relation to User.
- `backend/src/modules/applications/application.validation.ts` — add optional verificationHash, verificationScore, applicationReference fields to createApplicationSchema; add refinement that if verified true then hash required (feature flagged).
- `backend/src/modules/applications/application.service.ts` — when creating, if verificationHash provided, lookup VerificationLog, verify hash matches evidence, check freshness, enforce verified based on log, store additional fields. Also add function `verifyEvidence`.
- `backend/src/routes/index.ts` — mount verification router `/verification` maybe or `/applications/verify-evidence`? Choose `/verifications` or integrate into applications routes. Proposal: `router.use('/verifications', verificationRoutes)` and also endpoint inside applications routes for backward compat.
- `backend/.env.example` — add VERIFICATION_HMAC_SECRET.

**Migrations:**

- `backend/prisma/migrations/20260803120000_add_verification_v2/migration.sql` — generated via prisma migrate.

### 11.2 Phase B: Extension v2 Core Engine

**Files to CREATE:**

- `extension/src/verification/types/VerificationResult.ts` — interfaces.
- `extension/src/verification/types/Evidence.ts`
- `extension/src/verification/types/Portal.ts`
- `extension/src/verification/types/Rule.ts`
- `extension/src/verification/types/Scoring.ts`
- `extension/src/verification/engine/VerificationEngine.ts` — orchestrator.
- `extension/src/verification/engine/RuleRegistry.ts`
- `extension/src/verification/engine/EngineConfig.ts` — weights, thresholds, version.
- `extension/src/verification/rules/BaseRule.ts` — new base (different from old `src/rules/BaseRule.ts`, which will be deprecated).
- `extension/src/verification/rules/DomainRule.ts`
- `extension/src/verification/rules/PageTitleRule.ts`
- `extension/src/verification/rules/HeadingRule.ts`
- `extension/src/verification/rules/ConfirmationBodyRule.ts`
- `extension/src/verification/rules/ApplyButtonRule.ts`
- `extension/src/verification/rules/ReferenceRule.ts`
- `extension/src/verification/rules/DomFingerprintRule.ts`
- `extension/src/verification/rules/PortalComplianceRule.ts`
- `extension/src/verification/portals/PortalPlugin.ts` — interface.
- `extension/src/verification/portals/GreenhouseVerifier.ts`
- `extension/src/verification/portals/LeverVerifier.ts`
- `extension/src/verification/portals/WorkdayVerifier.ts`
- `extension/src/verification/portals/LinkedInVerifier.ts`
- `extension/src/verification/portals/IndeedVerifier.ts`
- `extension/src/verification/portals/SuccessFactorsVerifier.ts`
- `extension/src/verification/portals/OracleVerifier.ts`
- `extension/src/verification/portals/TaleoVerifier.ts`
- `extension/src/verification/portals/index.ts` — registry export.
- `extension/src/verification/scoring/Scorer.ts`
- `extension/src/verification/scoring/ConfidenceMapper.ts`
- `extension/src/verification/evidence/EvidenceCollector.ts`
- `extension/src/verification/evidence/EvidenceNormalizer.ts`
- `extension/src/verification/evidence/EvidenceValidator.ts`
- `extension/src/verification/hashing/HashClient.ts` — actually client requests hash from backend; maybe rename `VerificationBackendClient.ts`.
- `extension/src/verification/utils/dom.ts`
- `extension/src/verification/utils/text.ts` — fuzzy matching, Levenshtein.
- `extension/src/verification/utils/url.ts` — strict validation (new).
- `extension/src/verification/utils/fingerprint.ts`
- `extension/src/storage/ReplayGuard.ts` — local replay protection.
- `extension/src/verification/engine/HistoryGuard.ts` — detection of pushState/replaceState.

**Files to MODIFY:**

- `extension/src/content.ts` — replace old detection with new VerificationEngine. Keep old as fallback for backward compat? For v2, call new engine first; if fails, fallback to old for migration. Also add HistoryGuard wrapping, add EvidenceCollector call, send to background for hash.
- `extension/src/background.ts` — add handler for `REQUEST_VERIFICATION_HASH` that calls backend API (needs backend URL config). Add rate limiting map (Map<senderId, timestamps[]>). Add origin validation. Keep old VERIFY_URL handler but enhance to return evidence+score+confidence.
- `extension/src/storage/VerificationStore.ts` — v2 adds methods to store VerificationResult with evidence and hash; maintains backward compatibility with old entries (migration).
- `extension/src/popup/Popup.tsx` — display new fields: score, confidence LOW/MED/HIGH, portal, hash short, reference, reasons.
- `extension/src/popup/components/VerificationCard.tsx` — show score, confidence v2.
- `extension/src/popup/components/ConfidenceBadge.tsx` — support LOW/MEDIUM/HIGH plus old.
- `extension/src/types/index.ts` — extend VerificationEntry to include evidence, hash, version, etc, while keeping old fields optional for compat.
- `extension/src/utils/keywords.ts` — deprecate, replaced by portal dictionaries, but keep for fallback.
- `extension/src/manifest.ts` — bump version to 2.0.0, add `webRequest`? maybe optional, add backend host permission if needed (for hash request).
- `extension/package.json` — version bump.

**Files to DEPRECATE (keep but mark):**

- `extension/src/detectors/*` — keep for backward compat, but new engine doesn't use. Eventually remove.
- `extension/src/rules/*` — old rules, deprecated, but keep until v2 stable.

### 11.3 Phase C: Frontend Updates

**Files to MODIFY:**

- `frontend/src/hooks/use-extension-verification.ts` — REMOVE keyword fast-path, require hash validation, call backend `/verifications/hash/:hash` or `/applications/verify-evidence` to validate. State management: checking extension + checking backend hash. No longer returns verified true based on URL alone. Must have backend confirm hash.
- `frontend/src/components/shared/extension-verification-badge.tsx` — update to show LOW/MEDIUM/HIGH, score, hash, reference, reasons, show fraud signals if present.
- `frontend/src/pages/applications/application-form-dialog.tsx` — modify onSubmit to require verificationHash if verified, send evidence hash. Remove client-side `detectJobPortal` duplicate? Keep but rely on backend detection. Update form schema to include verificationHash, evidence.
- `frontend/src/hooks/use-applications.ts` — if needed, update mutation to send hash.

**Files to CREATE (frontend):**

- `frontend/src/lib/verification.ts` — helper to call verification backend.

### 11.4 Phase D: Shared Types

- Create shared package or at least duplicated types between backend and extension for Evidence canonicalization to ensure both sides agree. Could be `backend/src/modules/verification/types` and `extension/src/verification/types` kept in sync, with tests verifying canonicalization matches.

### 11.5 Tests

- `extension/tests/` (new directory):
  - `verification/engine/VerificationEngine.test.ts`
  - `verification/rules/*test.ts` each rule
  - `verification/portals/*test.ts` portal plugins
  - `verification/scoring/Scorer.test.ts`
  - `verification/evidence/EvidenceCollector.test.ts`
  - `verification/utils/url.test.ts` - test hostname validation, spoof attempts, path patterns
  - `storage/ReplayGuard.test.ts`
- `backend/tests/` or `vitest`:
  - `verification/hashing/hash.service.test.ts` — HMAC generation, canonicalization, deterministic
  - `verification/scoring/scorer.service.test.ts`
  - `verification/evidence/validator.test.ts`
  - `applications/verification.integration.test.ts` — positive, negative, fraud scenarios

---

## 12. Migration Strategy & Backward Compatibility

### 12.1 Principles

- DO NOT break existing extension installations.
- Reuse existing messaging: `PAGE_VERIFIED` and `VERIFY_URL` actions keep working, but v2 adds `REQUEST_VERIFICATION_HASH` and `VERIFICATION_RESULT_V2`.
- Reuse existing storage key `verifications` but entries v2 will have extra fields. Old popup can still render old entries (graceful degradation).
- Backend: new fields nullable, existing applications unaffected. `verified` boolean still present for backward compat, but new logic derives verified from hash.
- Frontend: feature flag `VITE_ENABLE_VERIFICATION_V2` to toggle new flow. During migration, support both flows: if v2 evidence present, use v2; else fallback to v1.
- Database migration non-destructive.

### 12.2 Step-by-Step Migration

**Step 0:** Audit complete (this doc). Get approval.

**Step 1:** Backend env + Prisma migration for new fields + VerificationLog, deployed with nullable fields. No behavior change yet.

**Step 2:** Implement backend verification module (`/verifications/verify-evidence`) but not yet required for application creation. Deploy.

**Step 3:** Extension v2 engine implemented behind flag `ENABLE_V2`. Content script tries v2 first, if score >=80, stores v2 result with evidence but WITHOUT hash initially (hash placeholder). Calls background to request hash from backend (if backend URL configured). Background stores hash when obtained.

**Step 4:** Popup updated to display both v1 and v2 results. For v2, show score, confidence, hash, reference.

**Step 5:** Frontend hook updated to remove fast-path, but still accept v1 for transition. It checks extension for v2 evidence; if hash exists, calls backend to validate hash before marking verified. If no hash, still allow v1 but show warning "Legacy verification, please update extension".

**Step 6:** Backend `createApplication` updated to require hash when `verified=true` and flag `REQUIRE_HASH_FOR_VERIFIED=true` via env. Initially false, log warnings if verified without hash.

**Step 7:** Comprehensive testing (manual + automated) on all supported portals: LinkedIn, Greenhouse, Lever, Indeed, etc. Test negative cases (fake DOM, history manipulation, URL editing).

**Step 8:** Enable `REQUIRE_HASH_FOR_VERIFIED=true` in production. Now frontend cannot submit verified=true without valid hash. Extension v2 becomes mandatory for verified submissions.

**Step 9:** Deprecate old detectors/rules. Remove fast-path keyword logic entirely. Update docs.

**Step 10:** Release extension v2.0.0 to Chrome Web Store, update `DEFAULT_EXTENSION_ID` if changed, update frontend `VITE_EXTENSION_ID`.

### 12.3 Rollback Plan

- If v2 causes issues, backend env flag `REQUIRE_HASH_FOR_VERIFIED=false` reverts to allowing old verified bool.
- Extension can be rolled back to v1.x via Chrome store.
- Database new fields nullable, so rollback safe.
- VerificationLog remains but not used.

### 12.4 Branch Strategy

Per instructions: ALL changes must be done on `extension` branch only (or separate if not possible).

- Session is on `arena/019fc8fc-mayzax` branched from `extension`. We will implement there, then push to `arena/019fc8fc-mayzax` and also create PR to `extension` branch (not main).
- Git author set to Siddharth Ohal <sidxohal9049@gmail.com>.
- Commit messages conventional: `feat(verification): implement enterprise verification engine v2`.

---

## 13. Testing Strategy

### 13.1 Positive Cases

- Real successful applications on Greenhouse, Lever, Workday, LinkedIn Easy Apply, Indeed.
- Each portal's confirmation page should:
  - Domain validated (+10)
  - Title matched (+15)
  - Heading matched (+20)
  - Confirmation body (+20)
  - Reference found (+15)
  - Fingerprint (+15)
  - Portal compliance (+5)
  - No Apply button (+5 bonus)
  - Total >=80 => Verified HIGH.

### 13.2 Negative Cases

- **Edited URLs:** Add `?success=true` to non-success page -> Domain passes but Title, Heading, Body fail => score <50 Rejected.
- **Fake pages:** Create local file with `h1 Application Submitted` but hostname `evil.com` -> Domain fails => 0.
- **Missing headings:** Confirmation page with no h1/h2 success headings => score reduced.
- **Apply button still visible:** After applying, if Apply button still enabled, -15 penalty, should drop from Verified to Suspicious if borderline.
- **Manipulated DOM:** Inject `document.body.innerHTML+= '<h1>Application Submitted</h1>'` after load -> Should detect history manipulation + time-on-page <3s + lack of expected fingerprint => score reduced.
- **Repeated Application IDs:** Submit same reference for different profile -> backend should flag fraud signal `DUPLICATE_REFERENCE`.
- **Modified titles:** Change title via console to success but heading/body still missing => partial score.
- **History manipulation:** Call `history.replaceState` to change URL to success path without navigation -> HistoryGuard detects, -10 penalty + fraud signal.
- **Unsupported ATS:** e.g., `https://random-company.com/careers` with no supported patterns -> cap at 60 Suspicious, not Verified.
- **HTTP not HTTPS:** `http://boards.greenhouse.io/...` -> instant reject.
- **Expired timestamp:** Evidence timestamp >5min old -> backend rejects stale.
- **Replay:** Submit same evidence hash twice for different profiles -> second flagged as replay.
- **Generic keywords only:** Page says "Complete your profile" -> heading contains "complete" but body not confirmation, reference missing, fingerprint fails => low score.

### 13.3 Unit Tests

Each rule independently testable with JSDOM:

```ts
describe('DomainRule', () => {
  it('rejects http', ...)
  it('rejects evil subdomain like evil-linkedin.com', ...)
  it('accepts boards.greenhouse.io', ...)
})
```

Scorer tests: weighted sum, penalty, thresholds.

Hash tests: canonicalization deterministic, HMAC verification, different secrets produce different hashes.

EvidenceCollector tests: ensure it collects headings, buttons, reference, fingerprint.

### 13.4 Integration Tests

- Backend: POST `/verifications/verify-evidence` with valid evidence -> returns hash, verified true.
- Same evidence again -> isReplay true.
- Evidence with tampered hostname -> rejected 400.
- Application creation with invalid hash -> 400.
- Application creation with valid hash but unrelated jobLink -> 400.

### 13.5 Manual QA Checklist

- [ ] Install extension v2 in Chrome
- [ ] Apply to real Greenhouse job -> verification appears in popup with HIGH 80+ and reference
- [ ] Copy link to Mayzax frontend -> badge shows Verified HIGH
- [ ] Submit application -> backend stores hash and evidence
- [ ] Try editing URL to add success keyword -> fails
- [ ] Try DOM injection -> fails or drops to Suspicious
- [ ] Try history.replaceState -> flagged
- [ ] Try submitting same link for same profile -> duplicate blocked
- [ ] Try submitting same reference for different job -> flagged
- [ ] Try HTTP URL -> rejected
- [ ] Try unsupported domain with fake success -> Rejected

---

## 14. Implementation Roadmap

### Phase 1: Audit (COMPLETE) — This Document

**Deliverable:** This markdown file.

**Duration:** Done.

### Phase 2: Backend Foundations (Day 1-2)

**Tasks:**

- Add `VERIFICATION_HMAC_SECRET` to env.ts + .env.example
- Prisma schema changes + migration
- Create `backend/src/modules/verification/*` (hash, canonicalize, portal definitions, scoring, validation, service, controller, routes)
- Wire routes in `src/routes/index.ts`
- Add unit tests for hashing and scoring

**Effort:** 8-12 hours

**Branch:** `arena/019fc8fc-mayzax`

**Files:** ~12 new, 3 modified

### Phase 3: Extension v2 Engine Core (Day 2-4)

**Tasks:**

- Create `verification/types`, `engine`, `rules`, `portals`, `scoring`, `evidence`, `utils` directories
- Implement BaseRule, DomainRule, PageTitleRule, HeadingRule, ConfirmationBodyRule, ApplyButtonRule, ReferenceRule, DomFingerprintRule, PortalComplianceRule
- Implement Portal plugins for 10+ portals (Greenhouse, Lever, Workday, LinkedIn, Indeed, SuccessFactors, Oracle, Taleo, ZipRecruiter, Glassdoor, etc)
- Implement EvidenceCollector, Scorer, ConfidenceMapper, HistoryGuard, ReplayGuard
- Update content.ts to use new engine
- Update background.ts for hash request + rate limiting
- Update VerificationStore to v2
- Bump version to 2.0.0

**Effort:** 16-24 hours

**Files:** ~30 new, 5 modified

### Phase 4: Frontend & Backend Integration (Day 4-5)

**Tasks:**

- Remove keyword fast-path from `use-extension-verification.ts`
- Update badge + form dialog to use v2 and hash validation
- Update backend `application.service.ts` to validate hash
- Add feature flag for backward compat

**Effort:** 6-8 hours

**Files:** ~3 new, 4 modified

### Phase 5: Popup UI Upgrade (Day 5)

**Tasks:**

- Popup shows score, confidence LOW/MED/HIGH, hash (truncated), reference, reasons
- VerificationCard updated

**Effort:** 3-4 hours

### Phase 6: Testing (Day 5-6)

**Tasks:**

- Unit tests extension + backend
- Manual testing on real portals (if credentials available, or mocked HTML fixtures)
- Negative tests

**Effort:** 8-12 hours

**Files:** ~15 test files

### Phase 7: Documentation & Rollout (Day 6)

**Tasks:**

- Update `extension/README.md` with v2 architecture
- Update `docs/API_DOCUMENTATION.md` with new endpoints
- Migration guide
- Release notes

**Effort:** 2-3 hours

### Total Estimated Effort: 5-6 days

### Milestones

- M1 (Day 2): Backend v2 deployed, hash generation working, no breaking changes
- M2 (Day 4): Extension v2 engine working locally, detects success on at least 3 portals with score 80+
- M3 (Day 5): End-to-end flow: extension -> backend hash -> frontend badge -> application creation with hash
- M4 (Day 6): All fraud resistance tests passing, documentation complete, ready for Chrome Store submission

---

## Appendix A: Supported ATS Matrix v2

| Portal | Host Patterns | Path Patterns | Title Patterns | Fingerprint Selectors | Reference Pattern | Status |
|---|---|---|---|---|---|---|
| Greenhouse | `boards.greenhouse.io`, `*.greenhouse.io` | `/confirmation`, `/applications/.*submitted` | `application submitted|thank you` | `#application_confirmation`, `.application-submitted` | `Application ID: (\w+)` | Planned |
| Lever | `jobs.lever.co`, `*.lever.co` | `/applied`, `/application.*success` | `you have applied|application submitted` | `.application-complete`, `.posting-apply-success` | `Reference \w+` | Planned |
| Workday | `*.myworkdayjobs.com`, `*.workday.com` | `/confirmation`, `/submitted` | `submission successful|you have successfully submitted` | `[data-automation-id=confirmationPage]`, `[data-automation-id=candidateApplicationConfirmation]` | `Application ID` | Planned |
| LinkedIn | `linkedin.com` subdomain `*.linkedin.com` | `*/jobs/*`, `/easy-apply/*` with success param | `application submitted|your application was sent` | `.artdeco-inline-feedback--success`, `h2` success | N/A | Planned |
| Indeed | `indeed.com` | `/applied`, `/application*` | `applied|application submitted` | `.gnav-header + success` etc | N/A | Planned |
| SuccessFactors | `*.successfactors.com`, `*.sapsf.com` | `/career/`, `/applicationStatus` | `application submitted|thank you` | `.applicationComplete` | `Requisition ID` | Planned |
| Oracle Cloud | `*.oraclecloud.com` | `/hcmUI/CandidateExperience` | `submission.*received|thank you` | `[id*=confirmation]` | `Submission ID` | Planned |
| Taleo | `*.taleo.net` | `/careersection/` | `submission.*complete|thank you` | `.confirmation` | `Submission ID` | Planned |
| ZipRecruiter | `ziprecruiter.com` | `/applied` | `application sent|applied` | `.job-applied` | N/A | Planned |
| Glassdoor | `glassdoor.com` | `/Job/applied` | `application submitted` | `.appliedConfirm` | N/A | Planned |

Plus: Naukri, Dice, Monster, CareerBuilder, Wellfound, Handshake, Jobright, Simplify, YCombinator, TheMuse — each with similar definitions.

---

## Appendix B: Example Verification Hash Flow

1. Content script collects evidence:
   ```js
   evidence = {
     portal: "GREENHOUSE",
     hostname: "boards.greenhouse.io",
     pathname: "/company/jobs/123/confirmation",
     title: "Application Submitted",
     headings: ["Application Submitted"],
     confirmationText: "Your application for Engineer has been submitted. Reference APP-123",
     applicationReference: "APP-123",
     detectedButtons: [],
     domFingerprint: {...},
     verificationTimestamp: 1710000000000,
     extensionVersion: "2.0.0",
     https: true
   }
   ```

2. Content script sends to background: `REQUEST_VERIFICATION_HASH`

3. Background calls backend: `POST /verifications/verify-evidence { evidence }` with JWT (recruiter token forwarded from frontend? Actually extension does not have JWT, so flow is: extension -> stores evidence locally, frontend reads evidence via external message and then calls backend with recruiter auth to get hash. This avoids extension needing auth. Safer.)

   Revised secure flow:
   - Extension collects evidence, stores in local storage, NOT generating hash.
   - Frontend via `VERIFY_URL` gets evidence from extension.
   - Frontend then calls `POST /verifications/verify-evidence` with evidence + auth token.
   - Backend returns hash.
   - Frontend includes hash in application creation.

   This way hash request is authenticated as recruiter, not anonymous extension.

4. Backend canonicalizes:
   ```js
   canonical = sortKeys(normalize(evidence))
   // => '{"applicationReference":"APP-123","confirmationText":"your application for engineer has been submitted reference app-123",...}'
   ```

5. Backend HMAC:
   ```js
   hash = HMAC_SHA256(canonical, SECRET) // hex 64 chars
   ```

6. Backend stores VerificationLog with hash, returns result + hash to frontend.

7. Frontend submits application with `verificationHash`.

8. Backend on application creation checks hash exists, belongs to recruiter, not expired, matches jobLink.

---

## Appendix C: Migration Env Flags

```
VERIFICATION_HMAC_SECRET=super-long-random-secret-min-32-chars
REQUIRE_HASH_FOR_VERIFIED=false # set true after migration
MIN_EXTENSION_VERSION=2.0.0
VERIFICATION_TIMESTAMP_TOLERANCE_MS=300000 # 5min
VERIFICATION_HASH_TTL_MS=86400000 # 24h
```

---

## Appendix D: Future Enhancements (v2.1+)

- `chrome.webRequest` to capture actual POST submission to ATS endpoint, providing network-level proof.
- User interaction tracking (click, keypress) before verification.
- Machine Learning model for confirmation detection (e.g., tiny BERT to classify success pages).
- Screenshot hash (perceptual hash) optional, not storing image but hash.
- Device binding: hash includes device fingerprint.
- Blockchain anchoring of verification hashes for audit.

---

## Approval Checklist

- [x] Repository audit complete
- [x] Weakness report complete
- [x] Proposed architecture documented
- [x] Verification engine design
- [x] Threat model
- [x] Database changes proposed
- [x] API changes proposed
- [x] File-by-file plan
- [x] Migration strategy
- [x] Testing strategy
- [x] Roadmap

**Next Action:** Await approval to begin implementation on `extension` branch (via `arena/019fc8fc-mayzax`).

**Prepared by:** Siddharth Ohal — Senior Software Architect & Security Engineer

---

*End of Document*
