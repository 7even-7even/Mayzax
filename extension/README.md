# Mayzax CRM Chrome Extension — Enterprise Verification Engine v2.0

Production-ready Chrome Extension (Manifest V3) with **enterprise-grade fraud-resistant verification**.

This is a complete redesign from v1 (keyword matching) to v2 (modular weighted scoring, portal fingerprints, evidence collection, HMAC proof) and features a **Robust Post-Submission Evidence Capture** system.

---

## ⚡ Key Updates in v1.2.0+

### 1. Robust Post-Submission Evidence Capture
An event-aware mechanism designed to catch successful job applications *before* transient evidence disappears from the DOM or redirects occur:
- **Submission Tracking**: Hooks form submits and clicks on action buttons (e.g. submit, apply, send).
- **Page Context Network Interceptor**: Registers a listener that intercepts `window.fetch` and `window.XMLHttpRequest` in the `MAIN` world (solving CSP limits) to capture successful network response metadata.
- **DOM Observation**: Implements a `MutationObserver` that scans for success modals/toasts and reference codes before they disappear.
- **Form Reset Detection**: Automatically tracks input states and alerts if fields are cleared/reset after a submission attempt.
- **Dashboard Redirect Matching**: Tracks URL changes to recruiter dashboards. Captures a lightweight pre-submission dashboard snapshot and compares it post-submission to match new entries or status updates (e.g. Draft → Applied).

### 2. Configurable Environment Thresholds
Allows managing score verification limits dynamically instead of using hardcoded values:
- **Backend Configuration**: Validated via Zod (`VERIFICATION_THRESHOLD` defaulting to `60`).
- **Client Configuration**: Evaluates `import.meta.env.VITE_VERIFICATION_THRESHOLD || 60` for local scoring, UI badge displays, and validation hooks.

---

## 🛡️ Security Highlights (v2 vs v1)


| Threat | v1 (Vulnerable) | v2 (Mitigated) |
|---|---|---|
| URL editing `?success=1` | `includes('success')` bypass | Strict hostname regex `(?:^|\.)greenhouse.io$`, HTTPS required, path patterns |
| `history.replaceState` spoof | No guard | HistoryGuard wraps pushState/replaceState, -10 penalty + fraud signal |
| DOM injection via console | Any `h1` injection passes | Structural fingerprint (Workday `data-automation-id`, Greenhouse `#application_confirmation`), visibility checks, time-on-page |
| Fake success pages | `evil-linkedin.com` matches | Anchored subdomain validation, IP/localhost blocked, allowlist |
| Replay attacks | Same URL infinite reuse | VerificationHash unique, TTL 24h, isReplay flag, timestamp freshness 5min |
| Client-controlled `verified` bool | Backend trusts bool | Backend is source of truth, HMAC_SHA256 only server-side, hash required |
| Frontend keyword fast-path | `?completed` instantly verified | **Removed** — must go through full engine + backend hash |
| Duplicate reference | No extraction | Reference regex extraction, duplicate detection across recruiters |

---

## 📦 Architecture v2

```
verification/
  engine/
    VerificationEngine.ts        // orchestrates evidence collection + rules + scoring
    EngineConfig.ts              // weights, thresholds, version
    RuleRegistry.ts
  types/
    index.ts                     // VerificationResultV2, Evidence, PortalPlugin, etc
  rules/
    BaseRule.ts
    DomainRule.ts (10)           // hostname anchored regex, HTTPS, allowlist
    PageTitleRule.ts (15)        // portal-specific title patterns, no exact match required
    HeadingRule.ts (20)          // h1,h2, aria headings, fuzzy matching
    ConfirmationBodyRule.ts (20) // confirmation paragraphs, avoid single sentence
    ReferenceRule.ts (15)        // Application ID, Reference Number, JR ID, etc
    DomFingerprintRule.ts (15)   // structural fingerprints per portal
    PortalComplianceRule.ts (5)  // portal plugin bonus
    ApplyButtonRule.ts (-15)     // if Apply still visible+enabled, penalty
  portals/
    PortalPluginBase.ts
    GreenhouseVerifier.ts
    LeverVerifier.ts
    WorkdayVerifier.ts
    LinkedInVerifier.ts
    IndeedVerifier.ts
    SuccessFactorsVerifier.ts
    OracleVerifier.ts
    TaleoVerifier.ts
    GenericVerifiers.ts (ZipRecruiter, Glassdoor, Naukri, etc)
    index.ts (PortalRegistryV2)
  scoring/
    Scorer.ts                    // weighted sum + penalty logic
    ConfidenceMapper.ts          // 0-49 Rejected LOW, 50-79 Suspicious MEDIUM, 80-100 Verified HIGH
  evidence/
    EvidenceCollector.ts         // structured evidence, no screenshots, lightweight
    EvidenceNormalizer.ts        // canonicalize for hashing (sort keys, normalize whitespace)
  utils/
    dom.ts                       // semantic DOM helpers, visibility checks
    text.ts                      // fuzzy matching, Levenshtein
    url.ts                       // strict hostname validation, HTTPS, path patterns
  hashing/ (client requests hash, never generates)
storage/
  VerificationStoreV2.ts         // v2 storage + replay guard
content.ts                       // uses VerificationEngine v2, HistoryGuard, interaction tracking
background.ts                    // rate limiting 30/min, origin validation, evidence exposure
popup/
  Popup.tsx                      // shows score, confidence LOW/MEDIUM/HIGH, hash, reference, fraud signals
  components/VerificationCard.tsx
  components/ConfidenceBadge.tsx
```

### Backend (mirrors extension)

```
backend/src/modules/verification/
  types/verification.types.ts
  hashing/canonicalize.ts
  hashing/hash.service.ts (HMAC_SHA256)
  evidence/evidence.schemas.ts (Zod)
  evidence/evidence.validator.ts
  portals/portal.definitions.ts (allowlist + path patterns)
  portals/portal.registry.ts
  scoring/scorer.service.ts (server re-score for defense in depth)
  scoring/confidence.ts
  verification.validation.ts
  verification.service.ts (hash generation, replay check, fraud signals, VerificationLog)
  verification.controller.ts
  verification.routes.ts
  POST /verifications/verify-evidence (generates hash)
  GET /verifications/hash/:hash (checks existence)
```

---

## 🔍 Verification Flow (Enterprise)

1. **Content script** on supported ATS (Greenhouse, Lever, Workday, LinkedIn, Indeed + 15) collects evidence:
   ```json
   {
     "portal": "GREENHOUSE",
     "hostname": "boards.greenhouse.io",
     "pathname": "/company/jobs/123/confirmation",
     "title": "Application Submitted",
     "headings": ["Application Submitted", "Thank you"],
     "confirmationText": "Your application for Engineer has been submitted. Ref APP-123",
     "applicationReference": "APP-123",
     "detectedButtons": [],
     "domFingerprint": { "hasConfirmationCard": true, "expectedContainersFound": 2 },
     "verificationTimestamp": 1710000000000,
     "extensionVersion": "1.2.0",
     "https": true,
     "timeOnPageMs": 4500,
     "userInteractionDetected": true
   }
   ```

2. **Rules engine** scores:
   - Domain 10 + Title 15 + Heading 20 + Body 20 + Reference 15 + Fingerprint 15 + Portal 5 + ApplyButton bonus = 100
   - Penalties: ApplyButton still visible -15, History manipulation -10, Short time <3s -5, Negative title -20
   - Thresholds: 0-49 Rejected LOW, 50-79 Suspicious MEDIUM, 80-100 Verified HIGH

3. **Storage** — if score >=50, saves to `chrome.storage.local` key `verifications_v2` with TTL 24h, max 100

4. **Frontend** (`use-extension-verification` v2):
   - Calls `chrome.runtime.sendMessage(extensionId, {action:'VERIFY_URL', url})`
   - Receives evidence + score
   - If score >=80, calls backend `POST /verifications/verify-evidence` with evidence + recruiter JWT
   - Backend validates (HTTPS, hostname not IP/localhost, timestamp freshness 5min), re-scores, canonicalizes (sort keys, normalize whitespace, lowercase), generates `HMAC_SHA256(canonical, SECRET)` -> returns `verificationHash`
   - Frontend stores hash

5. **Application creation** `POST /applications`:
   - Requires `verificationHash` if `verified=true`
   - Backend checks hash exists in `VerificationLog`, belongs to recruiter, not expired (24h), normalized link matches, not replay
   - Sets `verified = confidence HIGH && score>=80` (server truth, not client bool)
   - Stores `verificationHash, Score, Confidence, Evidence, Reference, Portal, Timestamp`

---

## 🚀 Installation

```bash
cd extension
npm install
npm run build
# dist folder ready
```

Load unpacked in `chrome://extensions` -> Developer mode -> Load `dist`

---

## 🧪 Testing

### Manual Positive
- Apply to real Greenhouse/Lever/Workday job -> popup shows HIGH 80%+ with reference, hostname, reasons

### Manual Negative
- Edit URL add `?success=true` on non-success page -> score <50 Rejected (Domain passes but Title/Heading/Body fail)
- Fake page `https://evil-linkedin.com/success` -> Domain fails 0, REJECTED
- Inject DOM `document.body.innerHTML='<h1>Application Submitted</h1>'` -> historyManipulation flag, short time penalty, fingerprint fails -> score reduced
- `history.replaceState({},'','/success')` -> fraud signal, -10
- HTTP `http://boards.greenhouse.io/...` -> instant reject
- Replay same evidence hash for different profile -> backend `isReplay=true` flagged

### Unit Tests (planned)
```
extension/src/verification/rules/__tests__/DomainRule.test.ts
extension/src/verification/scoring/Scorer.test.ts
backend/src/modules/verification/__tests__/hash.service.test.ts
```

---

## 🔐 Security Design Principles

- **Never trust client alone** — server re-scores, validates hostname, HTTPS, timestamp, and is source of truth for hash
- **HMAC only backend** — `VERIFICATION_HMAC_SECRET` never leaves server
- **Strict hostname validation** — anchored regex `(?:^|\.)greenhouse.io$` prevents `evil-greenhouse.com` bypass
- **No keyword bypass** — removed URL fast-path that allowed `?completed` bypass
- **Evidence lightweight** — no screenshots, pure JSON, canonicalized and sorted
- **Replay protection** — hash unique, TTL, timestamp freshness, isReplay flag
- **Fraud signals** — HISTORY_MANIPULATION, APPLY_BUTTON_STILL_ENABLED, SHORT_TIME_ON_PAGE, DUPLICATE_REFERENCE, etc stored in VerificationLog
- **Backward compatible** — v1 entries still readable, v2 adds fields, old popup works, migration via feature flags `REQUIRE_HASH_FOR_VERIFIED=false` initially then true

---

## 📄 Deliverables

- ✅ Repository audit `docs/VERIFICATION_ENGINE_AUDIT_AND_DESIGN.md`
- ✅ Enterprise verification engine implementation (30+ new files)
- ✅ Backend HMAC hashing + VerificationLog + API endpoints
- ✅ Frontend secure hook (no keyword bypass) + HMAC flow
- ✅ Extension v2 popup with score, confidence, hash, reference, fraud signals
- ✅ Manifest v2.0.0 with expanded host permissions (Workday, SuccessFactors, Oracle, Taleo)
- ✅ Build passes `npm run build`

---

## 👤 Author

Siddharth Ohal (7even-7even) <sidxohal9049@gmail.com>
Branch: `extension`
Version: v1.2.0

