# Chrome Extension V2 — Application Journey Verification Architecture

This document describes the design and inner workings of the Mayzax ATS Chrome Extension V2.

## 1. Core Architecture Pattern

The system monitors candidate interaction with job portals and builds a robust timeline of events to serve as a high-confidence signal for job application verification.

```
                    Chrome Extension
                           │
                           ▼
                  Portal Detection
                           │
                           ▼
                 Application Session
                           │
                           ▼
                  Journey Monitoring
                           │
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
        DOM Events     Form Events    Navigation
             │             │             │
             └─────────────┼─────────────┘
                           ▼
                    Event Collector
                           │
                           ▼
                  Evidence Builder
                           │
                           ▼
                 Verification Session
                           │
                           ▼
                  Verification API
                           │
                           ▼
                 Existing Verification
                      Engine / CRM
                           │
                           ▼
                  Final Score / Evidence
```

## 2. Session Lifecycle

When the content script detects a recruitment page matching a supported portal, it requests the background script to start a session (`START_SESSION`).

```
UNKNOWN ──► DETECTED ──► STARTED ──► FORM_ACTIVE ──► FORM_COMPLETED ──► SUBMIT_ATTEMPTED ──► SUBMISSION_CONFIRMED ──► FINALIZED
```

- **IsInProgress**: Session is initialized.
- **IsCompleted**: Once a success state / confirmation selector/text or post-submit navigation matching confirmation patterns is observed, the session state is finalized.
- **Refresh Recovery**: The active session is bound to the recruiter's active tab. Reloads recover the active session matching the tab and portal, preventing duplicate session starts.

## 3. Normalized Event Stream

The extension emits explicit event types:
- `APPLICATION_DETECTED`
- `APPLICATION_STARTED`
- `FORM_INTERACTION`
- `REQUIRED_FIELDS_COMPLETED`
- `RESUME_UPLOADED`
- `SUBMIT_CLICKED`
- `SUBMISSION_CONFIRMED`
- `APPLICATION_REFERENCE_DETECTED`

All event submissions are made idempotent on the backend via a unique client-generated `eventId`.

## 4. Sync Queue & Offline Support

Events are written to an event queue stored in `chrome.storage.local` to survive background worker restarts, temporary network loss, or tab closure.
- **Backoff & Retries**: Failed event transmissions are retried using exponential backoff up to 5 times.
- **Idempotency**: Re-sending identical events is safe and ignored by the server.

## 5. Portal Adapter Architecture

New portals can be added by implementing the `PortalPlugin` interface:
```typescript
interface PortalAdapter {
  id: string;
  name: string;
  matches(url: URL): boolean;
  detectApplicationStart(context: PageContext): boolean;
  observeForm(context: PageContext): FormObservation;
  detectSubmission(context: PageContext): SubmissionObservation;
  detectConfirmation(context: PageContext): ConfirmationObservation;
  extractApplicationIdentifiers(context: PageContext): ApplicationIdentifiers;
}
```

Inheriting from `BasePortalPlugin` yields generic fallback implementations. Create a new subclass, add it to `PortalRegistryV2`, and override relevant methods for custom selectors.
