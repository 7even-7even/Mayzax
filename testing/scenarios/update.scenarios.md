# Mayzax System Updates Testing Scenarios

This document outlines the testing scenarios for the System Updates, Announcements, and read receipt tracking in the Mayzax ATS.

---

## 1. Discovered Updates Architecture

```text
Admin User
  ↓
Create Update (`POST /api/v1/updates`):
- Restriction: Admin only.
- Attachment handling: Accepts PDF file upload or direct URL (e.g. Google Drive links).
- Scope restrictions: Can target specific user roles (e.g. RECRUITER, CLIENT).
- Actions: Creator automatically registers a read log entry (`UserUpdateRead`).
  ↓
User request
  ↓
List Updates (`GET /api/v1/updates`):
- Restriction: Authenticated user.
- Scoping constraints:
  * Non-admins only see updates targeting their role or targeting all roles (empty target array).
  * Computes total unreadCount comparing `readLogs` mapping.
  ↓
Mark as Read (`POST /api/v1/updates/:id/read`):
- Action: Upserts a `UserUpdateRead` log entry to track the user read receipt.
```

---

## 2. High-Level Test Scenarios

### A. List Updates Scenarios
* **UPD-SC-01:** List system updates for Recruiter (filters out Admin-only updates, computes unread count).
* **UPD-SC-02:** Create a new update with optional PDF file name resolution.

### B. ReadReceipts Scenarios
* **UPD-SC-03:** Mark a pending update as read successfully.
* **UPD-SC-04:** Attempt marking a non-existent update as read returns `404 Not Found`.
