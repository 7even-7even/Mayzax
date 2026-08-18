# Chrome Extension V2 — Backend Verification API Specification

All endpoints are mounted under the base API router (prefix: `/api/v1`) and require a valid recruiter Bearer authentication token.

## 1. Create Session
Initialize a new journey monitoring session.

- **URL**: `POST /verifications/sessions`
- **Headers**:
  - `Authorization: Bearer <accessToken>`
- **Request Body**:
  ```json
  {
    "sessionId": "session_uuid_123456",
    "portal": "GREENHOUSE",
    "jobUrl": "https://boards.greenhouse.io/spacex/jobs/400123",
    "jobId": "400123",
    "applicationUrl": "https://boards.greenhouse.io/spacex/jobs/400123/apply"
  }
  ```
- **Response** (201 Created):
  ```json
  {
    "success": true,
    "data": {
      "id": "db_session_id",
      "sessionId": "session_uuid_123456",
      "status": "IN_PROGRESS",
      "portal": "GREENHOUSE"
    }
  }
  ```

## 2. Post Journey Events
Ingest events reported during form filling and submissions. This endpoint enforces event-level idempotency via `eventId`.

- **URL**: `POST /verifications/sessions/:sessionId/events`
- **Request Body**:
  ```json
  {
    "events": [
      {
        "eventId": "evt_uuid_7890",
        "sessionId": "session_uuid_123456",
        "type": "FORM_INTERACTION",
        "timestamp": "2026-08-18T20:00:00.000Z",
        "metadata": {}
      }
    ]
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "db_event_id",
        "eventId": "evt_uuid_7890",
        "type": "FORM_INTERACTION"
      }
    ]
  }
  ```

## 3. Finalize Session
Mark the journey session completed and compute final journey score metrics.

- **URL**: `POST /verifications/sessions/:sessionId/finalize`
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "data": {
      "sessionId": "session_uuid_123456",
      "status": "COMPLETED",
      "score": 90,
      "scoreVersion": "v1"
    }
  }
  ```

## 4. CRM Check Application URL
Look up and verify an application URL against observed tracking sessions and post-submission verification logs.

- **URL**: `POST /verifications/check`
- **Request Body**:
  ```json
  {
    "applicationUrl": "https://boards.greenhouse.io/spacex/jobs/400123"
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "data": {
      "verified": true,
      "score": 92,
      "scoreVersion": "v1",
      "status": "VERIFIED",
      "portal": "GREENHOUSE",
      "evidence": {
        "portalDetected": true,
        "applicationObserved": true,
        "jobIdentified": true,
        "formInteraction": true,
        "requiredFieldsCompleted": true,
        "resumeUploaded": true,
        "submitClicked": true,
        "submissionConfirmed": true,
        "applicationReferenceDetected": false
      }
    }
  }
  ```
