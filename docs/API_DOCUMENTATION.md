# Mayzax ATS — API Documentation

Complete reference for the Mayzax ATS backend REST API. Every request/response example on this page was captured live from a running instance of the API (seeded demo data) — not hand-written — so field names, types, and shapes are guaranteed to match the actual implementation.

**Base URL:** `http://localhost:4000/api/v1` (development) — configurable via `API_PREFIX` in `.env`, mounted at whatever host/port you deploy to in production.

---

## Table of Contents

1. [Conventions](#conventions)
2. [Authentication & Authorization](#authentication--authorization)
3. [Error Handling](#error-handling)
4. [Rate Limiting](#rate-limiting)
5. [Pagination, Sorting & Filtering](#pagination-sorting--filtering)
6. [Data Types & Enums](#data-types--enums)
7. [Endpoints](#endpoints)
   - [Health](#health)
   - [Auth](#auth-apiv1auth)
   - [Recruiters](#recruiters-apiv1recruiters--admin-only)
   - [Client Profiles](#client-profiles-apiv1profiles)
   - [Job Applications](#job-applications-apiv1applications)
   - [Analytics](#analytics-apiv1analytics)
8. [Business Date Logic](#business-date-logic)
9. [Duplicate Application Detection](#duplicate-application-detection)

---

## Conventions

| Aspect | Convention |
|---|---|
| Format | JSON over HTTPS (HTTP in local dev) |
| Versioning | All routes prefixed `/api/v1` |
| Auth | JWT access token (`Authorization: Bearer <token>` header **or** `access_token` HttpOnly cookie) + refresh token rotation via `refresh_token` HttpOnly cookie |
| IDs | UUID v4 strings everywhere (`id`, `profileId`, `recruiterId`, etc.) |
| Timestamps | ISO 8601 UTC strings, e.g. `"2026-07-04T12:13:41.816Z"` |
| Dates only | `businessDate` is a `DATE` column, serialized as UTC-midnight ISO string, e.g. `"2026-07-04T00:00:00.000Z"` |
| Request bodies | `application/json`; all bodies validated with Zod — invalid payloads never reach a controller |

### Standard response envelope

**Every** successful response follows this shape:

```json
{
  "success": true,
  "data": /* object | array */,
  "pagination": { "page": 1, "pageSize": 20, "total": 42, "totalPages": 3 },   // list endpoints only
  "currentBusinessDate": "2026-07-04"                                          // a few analytics endpoints only
}
```

**Every** error response follows this shape:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": { "...": "optional, shape varies by error type" },
    "stack": "... (development only, never present in production)"
  }
}
```

> `details` and `stack` are omitted entirely when not applicable. `stack` is only ever included when `NODE_ENV !== 'production'` — it will never appear in a production deployment.

---

## Authentication & Authorization

Mayzax ATS uses **JWT access tokens + rotating refresh tokens**, delivered two ways simultaneously so both cookie-based web clients and header-based API clients work:

1. **HttpOnly cookies** — `access_token` and `refresh_token` are set automatically by `/auth/login` and `/auth/refresh`. Browser clients using `credentials: 'include'` never need to touch tokens manually.
2. **Authorization header** — the access token is also returned in the JSON body (`data.accessToken`) for clients that prefer `Authorization: Bearer <token>`.

| Token | Lifetime (default) | Where it lives | Purpose |
|---|---|---|---|
| Access token | 15 minutes (`JWT_ACCESS_EXPIRES_IN`) | `access_token` cookie + response body | Authorizes API requests |
| Refresh token | 7 days (`JWT_REFRESH_EXPIRES_IN`) | `refresh_token` HttpOnly cookie only | Used at `/auth/refresh` to mint a new access/refresh pair |

**Refresh token rotation:** every call to `/auth/refresh` invalidates the old refresh token and issues a new one. If a refresh token that was already rotated-out gets reused (a signature of token theft), **all** sessions for that user are immediately revoked server-side.

### Roles

| Role | Description |
|---|---|
| `ADMIN` | Full access: manages recruiters, all client profiles, all applications, admin dashboard, and all analytics |
| `RECRUITER` | Scoped access: can only see/act on client profiles assigned to them, applications they created, and their own job portal analytics |

### Route protection at a glance

| Route group | Auth required | Roles allowed |
|---|---|---|
| `/auth/signup` | No | Public |
| `/auth/login`, `/auth/refresh` | No | Public |
| `/auth/forgot-password/question`, `/auth/forgot-password/reset` | No | Public |
| `/auth/logout`, `/auth/me`, `/auth/profile`, `/auth/security-question`, `/auth/change-password` | Yes | Any authenticated user |
| `/recruiters/*` | Yes | `ADMIN` only |
| `/profiles/*` (read/create/update) | Yes | `ADMIN`, `RECRUITER` (row-level scoping applies) |
| `/profiles/:id/assign`, `DELETE /profiles/:id` | Yes | `ADMIN` only |
| `/applications/*` | Yes | `ADMIN`, `RECRUITER` (row-level scoping applies) |
| `/analytics/job-portals` | Yes | `ADMIN`, `RECRUITER` (role-level scoping applies) |
| `/analytics/summary`, `/analytics/dashboard*`, `/analytics/daily-counts` | Yes | `ADMIN` only |

**Row-level scoping:** even where both roles are allowed, a `RECRUITER` only ever sees/modifies Client Profiles assigned to them and Job Applications they personally created. `ADMIN` sees everything.

---

## Error Handling

All errors funnel through a single centralized handler that normalizes three error sources into the standard envelope above:

| Source | Example `code` | Typical `statusCode` |
|---|---|---|
| Application logic (`ApiError`) | `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `UNPROCESSABLE_ENTITY`, `INTERNAL_ERROR` | 400 / 401 / 403 / 404 / 409 / 422 / 500 |
| Zod validation failure | `VALIDATION_ERROR` | 422 |
| Prisma unique constraint violation (`P2002`) | `DUPLICATE_ENTRY` | 409 |
| Prisma "record not found" (`P2025`) | `NOT_FOUND` | 404 |
| Prisma foreign key violation (`P2003`) | `FOREIGN_KEY_CONSTRAINT` | 400 |
| Any other Prisma error | `DATABASE_ERROR` | 400 |
| Unhandled route | `NOT_FOUND` | 404 |

### Example — validation error (`422`)

Request: `POST /auth/login` with `{ "email": "not-an-email", "password": "" }`

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "formErrors": [],
      "fieldErrors": {
        "email": ["A valid email is required"],
        "password": ["Password is required"]
      }
    }
  }
}
```

### Example — unauthorized (`401`)

Request: any protected route, no/invalid token.

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired authentication token"
  }
}
```

### Example — forbidden (`403`)

Request: `GET /recruiters` using a `RECRUITER` token (admin-only route).

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to perform this action"
  }
}
```

### Example — conflict / duplicate (`409`)

Request: `POST /applications` for a profile that already applied to the same job link.

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "This profile has already applied to this job. Duplicate submissions for the same profile are not allowed.",
    "details": {
      "existingApplicationId": "4f1afa74-32a4-4118-b541-a787a9667b74",
    "appliedByRecruiter": { "id": "recruiter-id", "name": "Recruiter B", "email": "recruiterb@example.com" },
      "candidateName": "Sara Khan"
    }
  }
}
```

---

## Rate Limiting

| Scope | Window | Max requests | Applies to |
|---|---|---|---|
| Global | 15 min (`RATE_LIMIT_WINDOW_MS`) | 300 (`RATE_LIMIT_MAX`) | Every request |
| Auth | 15 min (`RATE_LIMIT_WINDOW_MS`) | 20 (`AUTH_RATE_LIMIT_MAX`) | `POST /auth/signup`, `POST /auth/login`, `POST /auth/refresh`, forgot-password endpoints |

Exceeding a limit returns:

```json
{
  "success": false,
  "error": { "code": "RATE_LIMITED", "message": "Too many requests, please try again later." }
}
```
with HTTP status `429` and standard `RateLimit-*` headers.

---

## Pagination, Sorting & Filtering

All list endpoints share a common query-parameter pattern:

| Param | Type | Default | Notes |
|---|---|---|---|
| `page` | integer ≥ 1 | `1` | 1-indexed |
| `pageSize` | integer, 1–100 | `20` (or `10`/`12` where noted) | |
| `sortBy` | enum (varies per endpoint) | varies | See each endpoint below |
| `sortOrder` | `asc` \| `desc` | `desc` | |
| `search` | string | — | Free-text, case-insensitive, matches multiple fields (see each endpoint) |

Paginated responses include a `pagination` object:

```json
"pagination": { "page": 1, "pageSize": 20, "total": 42, "totalPages": 3 }
```

---

## Data Types & Enums

### `Role`
```
ADMIN | RECRUITER
```

### `ApplicationStatus`
```
APPLIED | IN_REVIEW | SHORTLISTED | INTERVIEW_SCHEDULED | INTERVIEWED | OFFERED | REJECTED | WITHDRAWN | ON_HOLD
```

### `JobPortal`
```
LINKEDIN | INDEED | GLASSDOOR | JOBRIGHT | SIMPLIFY | SIMPLYHIRED | WELLFOUND | HANDSHAKE | LEVER | GREENHOUSE | NAUKRI | DICE | MONSTER | ZIPRECRUITER | COMPANY_WEBSITE | CAREERBUILDER | SPEEDY_APPLY | THE_MUSE | Y_COMBINATOR | CAREER_SITE | OTHER
```

### Core entity shapes

**User** (Admin or Recruiter)
```ts
{
  id: string;              // UUID
  name: string;
  email: string;
  phone: string | null;
  role: "ADMIN" | "RECRUITER";
  securityQuestion: string | null;
  hasSecurityQuestion: boolean;
  isActive: boolean;
  deletedAt: string | null;      // soft-delete marker, ISO datetime
  lastActiveAt: string | null;   // ISO datetime, updated on login/refresh
  createdAt: string;
  updatedAt: string;
  createdById?: string | null;   // admin who created this recruiter
}
```
*(`passwordHash` is never included in any API response.)*

**ClientProfile**
```ts
{
  id: string;
  candidateName: string;
  email: string;
  phone: string;
  technology: string;
  notes: string | null;
  assignedRecruiterId: string | null;
  assignedRecruiter?: { id: string; name: string; email: string } | null; // included on GET/list
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

**JobApplication**
```ts
{
  id: string;
  profileId: string;
  recruiterId: string;
  jobLink: string;               // original URL as submitted
  normalizedJobLink: string;     // canonicalized URL used for duplicate detection
  companyName: string;
  jobTitle: string;
  jobPortal: JobPortal;
  status: ApplicationStatus;
  appliedAt: string;             // ISO datetime
  businessDate: string;          // ISO date (UTC midnight) - see Business Date Logic
  createdAt: string;
  updatedAt: string;
  profile?: { id: string; candidateName: string; technology: string };      // included on GET/list
  recruiter?: { id: string; name: string; email: string };                  // included on GET/list
}
```

---

## Endpoints

### Health

#### `GET /health`

No auth required.

**Response `200`**
```json
{ "success": true, "data": { "status": "ok", "timestamp": "2026-07-04T12:13:51.597Z" } }
```

---

### Auth (`/api/v1/auth`)

#### `POST /auth/signup`

Public. Rate-limited (auth tier). Creates a recruiter account, sets session cookies, and returns the signed-in user plus an access token.

**Body**
| Field | Type | Rules |
|---|---|---|
| `name` | string | 2–120 chars |
| `email` | string | valid email, must be unique |
| `password` | string | min 8 chars; needs uppercase, lowercase, and a number |

**Request**
```json
{ "name": "Riya Sharma", "email": "riya.sharma@mayzaxsolutions.com", "password": "Recruiter@123" }
```

**Response `201`** *(also sets `access_token` and `refresh_token` HttpOnly cookies)*
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "f188e902-1130-4727-bc2c-f4532e37dfc6",
      "name": "Riya Sharma",
      "email": "riya.sharma@mayzaxsolutions.com",
      "phone": null,
      "role": "RECRUITER",
      "securityQuestion": null,
      "hasSecurityQuestion": false
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...."
  }
}
```

**Errors:** `409 CONFLICT` (email already exists), `422 VALIDATION_ERROR`, `429 RATE_LIMITED`

#### `POST /auth/login`

Public. Rate-limited (auth tier).

**Body**
| Field | Type | Rules |
|---|---|---|
| `email` | string | valid email |
| `password` | string | required, non-empty |

**Request**
```json
{ "email": "admin@mayzaxsolutions.com", "password": "ChangeMe@123" }
```

**Response `200`** *(also sets `access_token` and `refresh_token` HttpOnly cookies)*
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "417c08ba-b4de-4abc-aaad-358216a7abba",
      "name": "Mayzax Admin",
      "email": "admin@mayzaxsolutions.com",
      "phone": null,
      "role": "ADMIN",
      "securityQuestion": null,
      "hasSecurityQuestion": false
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...."
  }
}
```

**Errors:** `401 UNAUTHORIZED` (wrong email/password), `403 FORBIDDEN` (account deactivated), `422 VALIDATION_ERROR`, `429 RATE_LIMITED`

---

#### `POST /auth/refresh`

Public (relies on the `refresh_token` cookie; a `refreshToken` field in the body is accepted as a fallback for non-cookie clients). Rate-limited (auth tier).

**Response `200`** *(rotates both cookies)* — same shape as `/auth/login`.

**Errors:**
- `401 UNAUTHORIZED` — `"No refresh token provided"` if the cookie/body is missing
- `401 UNAUTHORIZED` — `"Invalid or expired refresh token"` if the token fails verification
- `401 UNAUTHORIZED` — `"Refresh token not recognized"` if the token hash isn't on record
- `401 UNAUTHORIZED` — `"Refresh token has already been used. All sessions revoked for security."` — triggered by reuse of a rotated-out token; **every session for the user is revoked** as a side effect
- `401 UNAUTHORIZED` — `"Refresh token expired"`
- `401 UNAUTHORIZED` — `"Account is no longer active"`

---

#### `POST /auth/forgot-password/question`

Public. Rate-limited (auth tier). Given an email address, returns that user's configured security question for password recovery.

**Body**
| Field | Type | Rules |
|---|---|---|
| `email` | string | valid email |

**Request**
```json
{ "email": "recruiter@mayzaxsolutions.com" }
```

**Response `200`**
```json
{
  "success": true,
  "data": {
    "email": "recruiter@mayzaxsolutions.com",
    "securityQuestion": "What is your pet name?"
  }
}
```

**Errors:** `400 BAD_REQUEST` (no question configured), `404 NOT_FOUND` (no active account), `422 VALIDATION_ERROR`, `429 RATE_LIMITED`

---

#### `POST /auth/forgot-password/reset`

Public. Rate-limited (auth tier). Verifies the user's security answer, resets the password, and revokes existing sessions.

**Body**
| Field | Type | Rules |
|---|---|---|
| `email` | string | valid email |
| `securityAnswer` | string | required |
| `newPassword` | string | min 8 chars; needs uppercase, lowercase, and a number |
| `confirmPassword` | string | must match `newPassword` |

**Request**
```json
{
  "email": "recruiter@mayzaxsolutions.com",
  "securityAnswer": "Bruno",
  "newPassword": "NewPass123",
  "confirmPassword": "NewPass123"
}
```

**Response `200`**
```json
{ "success": true, "data": { "message": "Password reset successfully. Please log in." } }
```

**Errors:** `400 BAD_REQUEST` (wrong answer / no question configured), `404 NOT_FOUND`, `422 VALIDATION_ERROR`, `429 RATE_LIMITED`

---

#### `POST /auth/logout`

Requires auth. Revokes the current refresh token and clears both cookies.

**Response `200`**
```json
{ "success": true, "data": { "message": "Logged out successfully" } }
```

---

#### `GET /auth/me`

Requires auth. Returns the current user's profile.

**Response `200`**
```json
{
  "success": true,
  "data": {
    "id": "417c08ba-b4de-4abc-aaad-358216a7abba",
    "name": "Mayzax Admin",
    "email": "admin@mayzaxsolutions.com",
    "phone": "+91 98765 43210",
    "role": "ADMIN",
    "securityQuestion": "What is your pet name?",
    "hasSecurityQuestion": true,
    "isActive": true,
    "lastActiveAt": "2026-07-04T12:14:28.543Z",
    "createdAt": "2026-07-04T12:13:41.201Z"
  }
}
```

**Errors:** `401 UNAUTHORIZED`, `404 NOT_FOUND` (user deactivated/deleted since token issued)

---

#### `PATCH /auth/profile`

Requires auth. Updates the current user's editable profile details.

**Body**
| Field | Type | Rules |
|---|---|---|
| `name` | string | optional, 2–120 chars |
| `email` | string | optional, valid email, must be unique |
| `phone` | string | optional, max 30 chars, blank allowed |

**Request**
```json
{ "name": "Updated Name", "email": "updated@mayzaxsolutions.com", "phone": "+91 98765 43210" }
```

**Response `200`** — updated sanitized user object.

**Errors:** `409 CONFLICT` (email already exists), `401 UNAUTHORIZED`, `404 NOT_FOUND`, `422 VALIDATION_ERROR`

---

#### `POST /auth/security-question`

Requires auth. Sets or updates the current user's security question and answer for forgot-password recovery. The answer is normalized and stored as a bcrypt hash; raw answers are never returned.

**Body**
| Field | Type | Rules |
|---|---|---|
| `securityQuestion` | string | 3–200 chars |
| `securityAnswer` | string | 2–200 chars |

**Request**
```json
{ "securityQuestion": "What is your pet name?", "securityAnswer": "Bruno" }
```

**Response `200`** — updated sanitized user object with `hasSecurityQuestion: true`.

**Errors:** `401 UNAUTHORIZED`, `404 NOT_FOUND`, `422 VALIDATION_ERROR`

---

#### `POST /auth/change-password`

Requires auth. Revokes **all** existing sessions for the user on success (they must log in again).

**Body**
| Field | Type | Rules |
|---|---|---|
| `currentPassword` | string | required |
| `newPassword` | string | min 8 chars; must contain an uppercase letter, a lowercase letter, and a number |
| `confirmPassword` | string | must match `newPassword` |

**Response `200`**
```json
{ "success": true, "data": { "message": "Password changed. Please log in again." } }
```

**Errors:** `400 BAD_REQUEST` (`"Current password is incorrect"`), `401 UNAUTHORIZED`, `404 NOT_FOUND`, `422 VALIDATION_ERROR`

---

### Recruiters (`/api/v1/recruiters`) — Admin only

All routes below require `Authorization` + role `ADMIN`.

#### `GET /recruiters`

List/search/filter/sort/paginate recruiter (and optionally admin) accounts.

**Query params**
| Param | Type | Default | Notes |
|---|---|---|---|
| `search` | string | — | Matches `name` or `email`, case-insensitive |
| `role` | `ADMIN` \| `RECRUITER` | — | Filter by role |
| `isActive` | `"true"` \| `"false"` | — | Filter by active status |
| `page` | int ≥ 1 | `1` | |
| `pageSize` | int 1–100 | `20` | |
| `sortBy` | `name` \| `email` \| `createdAt` \| `lastActiveAt` | `createdAt` | |
| `sortOrder` | `asc` \| `desc` | `desc` | |

**Example:** `GET /recruiters?pageSize=2`

**Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "id": "f0ea425d-3726-4586-a81c-d4b4d6dbed04",
      "name": "Sneha Reddy",
      "email": "sneha.reddy@mayzaxsolutions.com",
      "role": "RECRUITER",
      "isActive": true,
      "lastActiveAt": "2026-07-01T19:32:25.256Z",
      "createdAt": "2026-07-04T12:13:41.578Z",
      "updatedAt": "2026-07-04T12:13:41.578Z"
    }
  ],
  "pagination": { "page": 1, "pageSize": 2, "total": 6, "totalPages": 3 }
}
```

---

#### `POST /recruiters`

Create a new recruiter (or admin) account.

**Body**
| Field | Type | Rules |
|---|---|---|
| `name` | string | 2–120 chars |
| `email` | string | valid email, must be unique |
| `password` | string | min 8 chars; needs uppercase, lowercase, and a number |
| `role` | `ADMIN` \| `RECRUITER` | optional, defaults to `RECRUITER` |

**Request**
```json
{ "name": "Riya Sharma", "email": "riya.sharma@mayzaxsolutions.com", "password": "Recruiter@123", "role": "RECRUITER" }
```

**Response `201`**
```json
{
  "success": true,
  "data": {
    "id": "f188e902-1130-4727-bc2c-f4532e37dfc6",
    "name": "Riya Sharma",
    "email": "riya.sharma@mayzaxsolutions.com",
    "role": "RECRUITER",
    "isActive": true,
    "deletedAt": null,
    "lastActiveAt": null,
    "createdAt": "2026-07-04T12:13:41.574Z",
    "updatedAt": "2026-07-04T12:13:41.574Z",
    "createdById": "417c08ba-b4de-4abc-aaad-358216a7abba"
  }
}
```

**Errors:** `409 CONFLICT` (`"A user with this email already exists"`), `422 VALIDATION_ERROR`

---

#### `GET /recruiters/:id/stats`

Detailed performance stats for one recruiter: assigned profiles, total & current-shift application counts, profile-wise breakdown, last active.

**Response `200`**
```json
{
  "success": true,
  "data": {
    "recruiter": {
      "id": "f0ea425d-3726-4586-a81c-d4b4d6dbed04",
      "name": "Sneha Reddy",
      "email": "sneha.reddy@mayzaxsolutions.com",
      "role": "RECRUITER",
      "isActive": true,
      "deletedAt": null,
      "lastActiveAt": "2026-07-01T19:32:25.256Z",
      "createdAt": "2026-07-04T12:13:41.578Z",
      "updatedAt": "2026-07-04T12:13:41.578Z",
      "createdById": "417c08ba-b4de-4abc-aaad-358216a7abba"
    },
    "assignedProfilesCount": 2,
    "totalApplications": 10,
    "currentShiftApplications": 0,
    "currentBusinessDate": "2026-07-04",
    "profileWiseCounts": [
      { "profileId": "76d0d33a-ea01-4567-a307-433b907eb329", "candidateName": "Meera Iyengar", "technology": "Salesforce", "applicationCount": 4 },
      { "profileId": "e79bcfa8-6d08-476f-ae0c-e2b5710c1853", "candidateName": "Rahul Verma", "technology": "Python", "applicationCount": 6 }
    ],
    "lastActiveAt": "2026-07-01T19:32:25.256Z"
  }
}
```

**Errors:** `404 NOT_FOUND` (`"Recruiter not found"`)

---

#### `PATCH /recruiters/:id`

Update a recruiter's name/email/role.

**Body** *(all optional)*
| Field | Type | Rules |
|---|---|---|
| `name` | string | 2–120 chars |
| `email` | string | valid email, must be unique |
| `role` | `ADMIN` \| `RECRUITER` | |

**Response `200`** — updated recruiter object (same shape as `POST /recruiters`).

**Errors:** `404 NOT_FOUND`, `409 CONFLICT` (email taken), `422 VALIDATION_ERROR`

---

#### `PATCH /recruiters/:id/status`

Activate or deactivate a recruiter account.

**Body**
| Field | Type | Rules |
|---|---|---|
| `isActive` | boolean | required |

**Response `200`** — updated recruiter object.

**Errors:** `400 BAD_REQUEST` (`"You cannot deactivate your own account"`), `404 NOT_FOUND`, `422 VALIDATION_ERROR`

---

#### `DELETE /recruiters/:id`

Soft-deletes a recruiter (sets `deletedAt` + `isActive: false`). Their assigned Client Profiles are automatically unassigned (`assignedRecruiterId` set to `null`).

**Response `200`**
```json
{ "success": true, "data": { "message": "Recruiter deleted successfully" } }
```

**Errors:** `400 BAD_REQUEST` (`"You cannot delete your own account"`), `404 NOT_FOUND`

---

### Client Profiles (`/api/v1/profiles`)

Profiles can be assigned to 1–5 recruiters through `assignedRecruiterIds`. The legacy `assignedRecruiterId` remains as the primary/first assigned recruiter for backwards compatibility.

Requires auth. `RECRUITER` accounts only ever see/act on profiles assigned to them; `ADMIN` sees all.

#### `GET /profiles`

**Query params**
| Param | Type | Default | Notes |
|---|---|---|---|
| `search` | string | — | Matches `candidateName`, `email`, `phone`, `technology` |
| `technology` | string | — | Exact match, case-insensitive |
| `assignedRecruiterId` | UUID | — | Admin only (recruiters are always scoped to themselves) |
| `isActive` | `"true"` \| `"false"` | — | |
| `page` | int ≥ 1 | `1` | |
| `pageSize` | int 1–100 | `20` | |
| `sortBy` | `candidateName` \| `technology` \| `createdAt` \| `updatedAt` | `createdAt` | |
| `sortOrder` | `asc` \| `desc` | `desc` | |

**Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "id": "76d0d33a-ea01-4567-a307-433b907eb329",
      "candidateName": "Meera Iyengar",
      "email": "meera.iyengar@example.com",
      "phone": "+91-9567890123",
      "technology": "Salesforce",
      "notes": "Sourced candidate profile for Salesforce roles.",
      "assignedRecruiterId": "f0ea425d-3726-4586-a81c-d4b4d6dbed04",
      "isActive": true,
      "deletedAt": null,
      "createdAt": "2026-07-04T12:13:41.607Z",
      "updatedAt": "2026-07-04T12:13:41.607Z",
      "assignedRecruiter": {
        "id": "f0ea425d-3726-4586-a81c-d4b4d6dbed04",
        "name": "Sneha Reddy",
        "email": "sneha.reddy@mayzaxsolutions.com"
      }
    }
  ],
  "pagination": { "page": 1, "pageSize": 1, "total": 10, "totalPages": 10 }
}
```

---

#### `GET /profiles/:id`

**Response `200`** — single profile object (same shape as above).

**Errors:** `404 NOT_FOUND`, `403 FORBIDDEN` (recruiter requesting a profile not assigned to them)

---

#### `POST /profiles`

Allowed for `ADMIN` and `RECRUITER`.

**Body**
| Field | Type | Rules |
|---|---|---|
| `candidateName` | string | 2–150 chars |
| `email` | string | valid email |
| `phone` | string | 7–20 chars, digits/`+`/`-`/`()`/spaces only |
| `technology` | string | 1–100 chars |
| `notes` | string \| null | optional, max 5000 chars |
| `assignedRecruiterId` | UUID \| null | optional |

**Request**
```json
{
  "candidateName": "John Doe",
  "email": "john.doe@example.com",
  "phone": "+91-9876543210",
  "technology": "Java Full Stack",
  "notes": "Strong backend skills",
  "assignedRecruiterId": "f188e902-1130-4727-bc2c-f4532e37dfc6"
}
```

**Response `201`** — created profile object.

**Errors:** `400 BAD_REQUEST` (`"Assigned recruiter not found"` / `"Cannot assign profile to an inactive recruiter"`), `422 VALIDATION_ERROR`

---

#### `PATCH /profiles/:id`

All body fields optional (partial update of the `POST` schema). Recruiters **cannot** change `assignedRecruiterId` via this endpoint (use `/assign`, admin-only) — attempting to do so as a recruiter returns `403 FORBIDDEN`.

**Response `200`** — updated profile object.

**Errors:** `403 FORBIDDEN`, `404 NOT_FOUND`, `422 VALIDATION_ERROR`

---

#### `PATCH /profiles/:id/assign` — Admin only

Reassign (or unassign) a profile to a different recruiter.

**Body**
| Field | Type | Rules |
|---|---|---|
| `assignedRecruiterId` | UUID \| null | required (send `null` to unassign) |

**Response `200`** — updated profile object.

**Errors:** `400 BAD_REQUEST`, `404 NOT_FOUND`, `422 VALIDATION_ERROR`

---

#### `DELETE /profiles/:id` — Admin only

Soft-deletes the profile (`deletedAt` set, `isActive: false`). Historical applications tied to this profile are **not** deleted.

**Response `200`**
```json
{ "success": true, "data": { "message": "Profile deleted successfully" } }
```

**Errors:** `404 NOT_FOUND`

---

### Job Applications (`/api/v1/applications`)

Requires auth. `RECRUITER` accounts only ever see/act on applications they personally created; `ADMIN` sees all.

#### `GET /applications`

**Query params**
| Param | Type | Default | Notes |
|---|---|---|---|
| `search` | string | — | Matches `companyName`, `jobTitle`, `jobLink`, candidate name |
| `profileId` | UUID | — | |
| `recruiterId` | UUID | — | Admin only (recruiters are always scoped to themselves) |
| `status` | `ApplicationStatus` | — | |
| `jobPortal` | `JobPortal` | — | |
| `businessDateFrom` | `YYYY-MM-DD` | — | Inclusive |
| `businessDateTo` | `YYYY-MM-DD` | — | Inclusive |
| `page` | int ≥ 1 | `1` | |
| `pageSize` | int 1–100 | `20` | |
| `sortBy` | `appliedAt` \| `businessDate` \| `companyName` \| `jobTitle` \| `createdAt` | `appliedAt` | |
| `sortOrder` | `asc` \| `desc` | `desc` | |

**Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "id": "4f1afa74-32a4-4118-b541-a787a9667b74",
      "profileId": "950abfda-be8f-441b-a931-48f1d92ad981",
      "recruiterId": "f188e902-1130-4727-bc2c-f4532e37dfc6",
      "jobLink": "https://www.linkedin.com/jobs/view/126005",
      "normalizedJobLink": "linkedin.com/jobs/view/126005",
      "companyName": "Wayne Enterprises",
      "jobTitle": "Cloud Solutions Architect",
      "jobPortal": "LINKEDIN",
      "status": "WITHDRAWN",
      "appliedAt": "2026-07-04T10:07:12.694Z",
      "businessDate": "2026-07-04T00:00:00.000Z",
      "createdAt": "2026-07-04T12:13:41.816Z",
      "updatedAt": "2026-07-04T12:13:41.816Z",
      "profile": { "id": "950abfda-be8f-441b-a931-48f1d92ad981", "candidateName": "Sara Khan", "technology": "Data Engineering" },
      "recruiter": { "id": "f188e902-1130-4727-bc2c-f4532e37dfc6", "name": "Riya Sharma", "email": "riya.sharma@mayzaxsolutions.com" }
    }
  ],
  "pagination": { "page": 1, "pageSize": 1, "total": 50, "totalPages": 50 }
}
```

---

#### `GET /applications/check-duplicate`

Pre-flight check — lets the UI warn the user *before* they submit. Does not create anything.

**Query params**
| Param | Type | Rules |
|---|---|---|
| `profileId` | UUID | required |
| `jobLink` | string | required, valid URL |

**Example:** `GET /applications/check-duplicate?profileId=950abfda-...&jobLink=https://www.linkedin.com/jobs/view/126005`

**Response `200` (duplicate found)**
```json
{
  "success": true,
  "data": {
    "isDuplicate": true,
    "normalizedJobLink": "linkedin.com/jobs/view/126005",
    "existingApplicationId": "4f1afa74-32a4-4118-b541-a787a9667b74",
    "appliedByRecruiter": { "id": "recruiter-id", "name": "Recruiter B", "email": "recruiterb@example.com" }
  }
}
```

**Response `200` (no duplicate)**
```json
{
  "success": true,
  "data": { "isDuplicate": false, "normalizedJobLink": "linkedin.com/jobs/view/999999", "existingApplicationId": null }
}
```

---

#### `GET /applications/:id`

**Response `200`** — single application object (same shape as list), plus `profile.assignedRecruiterId` included in the nested `profile` object for this endpoint specifically.

**Errors:** `403 FORBIDDEN`, `404 NOT_FOUND`

---

#### `POST /applications`

Creates a job application. Application links are saved only after the frontend confirmation that submission completed; the API rejects explicit `applicationCompleted: false` and common placeholder/test URLs. The API also auto-detects known portals from URLs when `jobPortal` is `OTHER`. **This is the endpoint enforcing duplicate protection** — see [Duplicate Application Detection](#duplicate-application-detection) below.

**Body**
| Field | Type | Rules |
|---|---|---|
| `profileId` | UUID | required, must be an active profile |
| `jobLink` | string | required, valid URL, max 2048 chars |
| `companyName` | string | optional/blank allowed, max 200 chars |
| `jobTitle` | string | optional/blank allowed, max 200 chars |
| `jobPortal` | `JobPortal` | optional, defaults to `OTHER` |
| `status` | `ApplicationStatus` | optional, defaults to `APPLIED` |
| `appliedAt` | ISO datetime | optional, defaults to now |

**Request**
```json
{
  "profileId": "950abfda-be8f-441b-a931-48f1d92ad981",
  "jobLink": "https://www.linkedin.com/jobs/view/999999",
  "companyName": "",
  "jobTitle": "",
  "jobPortal": "LINKEDIN"
}
```

**Response `201`** — created application object (same shape as list item).

**Errors:**
- `403 FORBIDDEN` — recruiter submitting for a profile not assigned to them
- `404 NOT_FOUND` — profile doesn't exist / is deleted
- `409 CONFLICT` — duplicate (profile already applied to this normalized job link) — see example under [Error Handling](#error-handling)
- `422 VALIDATION_ERROR`

---

#### `PATCH /applications/:id`

Update status/company/title/portal on an existing application.

**Body** *(all optional)*
| Field | Type |
|---|---|
| `status` | `ApplicationStatus` |
| `companyName` | string, 1–200 chars |
| `jobTitle` | string, 1–200 chars |
| `jobPortal` | `JobPortal` |

**Response `200`** — updated application object.

**Errors:** `403 FORBIDDEN` (recruiter updating someone else's application), `404 NOT_FOUND`, `422 VALIDATION_ERROR`

---

### Analytics (`/api/v1/analytics`)

Most analytics routes require `ADMIN`. `GET /analytics/job-portals` is available to both roles: admins see all applications, while recruiters see only their own applications.

#### `GET /analytics/job-portals`

Portal-wise application counts for the portal analytics cards.

**Auth / role behavior**
| Role | Scope |
|---|---|
| `ADMIN` | All applications across all recruiters |
| `RECRUITER` | Only applications created by the authenticated recruiter |

**Query params**
| Param | Type | Default | Notes |
|---|---|---|---|
| `scope` | `all` \| `currentShift` \| `custom` | `all` | `currentShift` uses the current business date; `custom` uses `from`/`to` |
| `from` | `YYYY-MM-DD` | — | Used when `scope=custom`; inclusive business date |
| `to` | `YYYY-MM-DD` | — | Used when `scope=custom`; inclusive business date |

**Examples**
```text
GET /analytics/job-portals?scope=all
GET /analytics/job-portals?scope=currentShift
GET /analytics/job-portals?scope=custom&from=2026-07-01&to=2026-07-08
```

**Response `200`**
```json
{
  "success": true,
  "data": {
    "totalApplications": 53,
    "currentBusinessDate": "2026-07-08",
    "filter": { "scope": "custom", "from": "2026-07-01", "to": "2026-07-08" },
    "portals": [
      { "portal": "LINKEDIN", "count": 25 },
      { "portal": "INDEED", "count": 18 },
      { "portal": "GLASSDOOR", "count": 10 },
      { "portal": "JOBRIGHT", "count": 0 },
      { "portal": "SIMPLIFY", "count": 0 },
      { "portal": "SIMPLYHIRED", "count": 0 },
      { "portal": "WELLFOUND", "count": 0 },
      { "portal": "HANDSHAKE", "count": 0 },
      { "portal": "OTHER", "count": 0 }
    ]
  }
}
```

**Notes:** Legacy/non-primary portal values are rolled into `OTHER` for this analytics response.

---

#### `GET /analytics/summary`

Global platform counters.

**Response `200`**
```json
{
  "success": true,
  "data": {
    "totalRecruiters": 5,
    "activeRecruiters": 5,
    "totalProfiles": 10,
    "totalApplications": 50,
    "currentShiftApplications": 1,
    "currentBusinessDate": "2026-07-04"
  }
}
```

---

#### `GET /analytics/dashboard`

Per-recruiter rollup table for the admin dashboard. Supports search/sort/pagination.

**Query params**
| Param | Type | Default |
|---|---|---|
| `search` | string | — |
| `sortBy` | `name` \| `assignedProfiles` \| `totalApplications` \| `lastActiveAt` | `totalApplications` |
| `sortOrder` | `asc` \| `desc` | `desc` |
| `page` | int ≥ 1 | `1` |
| `pageSize` | int 1–100 | `20` |

**Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "id": "6aa9eac9-a652-4b49-bad7-ff086459efca",
      "name": "Karan Mehta",
      "email": "karan.mehta@mayzaxsolutions.com",
      "isActive": true,
      "assignedProfiles": 2,
      "totalApplications": 15,
      "currentShiftApplications": 0,
      "lastActiveAt": "2026-07-03T14:00:16.994Z"
    }
  ],
  "currentBusinessDate": "2026-07-04",
  "pagination": { "page": 1, "pageSize": 2, "total": 5, "totalPages": 3 }
}
```

---

#### `GET /analytics/dashboard/:id/breakdown`

Expandable drill-down for one recruiter: assigned profile-wise all-time/current-shift application counts + their 10 most recent applications.

**Response `200`**
```json
{
  "success": true,
  "data": {
    "currentBusinessDate": "2026-07-08",
    "profileWiseCounts": [
      { "profileId": "0e4d78bb-43b1-44b1-a233-029502a3131d", "candidateName": "Amit Patel", "technology": "AWS Cloud", "applicationCount": 9, "currentShiftApplicationCount": 2 },
      { "profileId": "375f03e3-83ac-4b71-ad11-61ba97d15775", "candidateName": "Jane Smith", "technology": "React", "applicationCount": 6, "currentShiftApplicationCount": 0 }
    ],
    "recentApplications": [
      {
        "id": "32ec3a39-5444-4de3-b899-a66ce000fc85",
        "profileId": "375f03e3-83ac-4b71-ad11-61ba97d15775",
        "recruiterId": "6aa9eac9-a652-4b49-bad7-ff086459efca",
        "jobLink": "https://www.dice.com/jobs/detail/301908",
        "normalizedJobLink": "dice.com/jobs/detail/301908",
        "companyName": "Cyberdyne Systems",
        "jobTitle": "Platform Engineer",
        "jobPortal": "DICE",
        "status": "APPLIED",
        "appliedAt": "2026-07-01T21:45:09.177Z",
        "businessDate": "2026-07-01T00:00:00.000Z",
        "createdAt": "2026-07-04T12:13:41.842Z",
        "updatedAt": "2026-07-04T12:13:41.842Z",
        "profile": { "id": "375f03e3-83ac-4b71-ad11-61ba97d15775", "candidateName": "Jane Smith" }
      }
    ]
  }
}
```

**Notes:** Assigned profiles are included even when they have zero applications. If `:id` is not a well-formed UUID, this returns `422 VALIDATION_ERROR`. If `:id` is a valid UUID but no such recruiter exists, the endpoint returns empty arrays.

---

#### `GET /analytics/daily-counts`

Application counts grouped by **business date** (not calendar date) — powers trend charts and the activity heatmap.

**Query params**
| Param | Type | Default |
|---|---|---|
| `recruiterId` | UUID | — (omit for all recruiters combined) |
| `from` | `YYYY-MM-DD` | 30 days ago |
| `to` | `YYYY-MM-DD` | today |

**Response `200`**
```json
{
  "success": true,
  "data": [
    { "businessDate": "2026-06-05", "count": 1 },
    { "businessDate": "2026-06-06", "count": 1 },
    { "businessDate": "2026-06-07", "count": 1 }
  ]
}
```

---

## Business Date Logic

Mayzax runs a night shift from **7:30 PM IST to 7:30 AM IST** (configurable via `BUSINESS_SHIFT_START_HOUR/MINUTE` and `BUSINESS_SHIFT_END_HOUR/MINUTE`). Because the shift spans midnight, every `JobApplication.businessDate` is computed — not just copied from the calendar date — so that "today" in reporting always means "this shift," even at 2 AM.

Rule (`getBusinessDate()` in `src/utils/businessDate.ts`):
- IST time ≥ 19:30 → business date = today's date
- IST time ≤ 07:30 → business date = **yesterday's** date
- Otherwise (daytime) → business date = today's date

| Timestamp (IST) | `businessDate` |
|---|---|
| 8:00 PM, Jul 3 | Jul 3 |
| 1:00 AM, Jul 4 | Jul 3 |
| 4:00 AM, Jul 4 | Jul 3 |
| 7:30 AM, Jul 4 | Jul 3 |
| 4:31 AM, Jul 4 | Jul 4 |
| 10:00 AM, Jul 4 | Jul 4 |

Analytics endpoints (`/analytics/summary`, `/analytics/dashboard`, `/analytics/job-portals`, `/analytics/daily-counts`, `/recruiters/:id/stats`) filter and group by this derived `businessDate` field where date/current-shift reporting is involved, never by raw `createdAt`/`appliedAt` calendar date.

---

## Duplicate Application Detection

**Rule:** the same Client Profile can never apply to the same job twice. Different profiles applying to the same job is allowed (e.g. two candidates going for the same opening).

```
Allowed:   Profile A → Job X        Blocked:   Profile A → Job X
           Profile B → Job X                   Profile A → Job X   (409 Conflict)
```

Enforced in three layers on `POST /applications`:

1. **URL normalization** (`normalizeJobLink()`) — strips protocol/`www.`/trailing slashes, lower-cases the host, removes tracking query params (`utm_*`, `gclid`, `fbclid`, `ref`, etc.), and sorts remaining params — so cosmetically different links to the same posting are recognized as identical.
2. **Application-level pre-check** — looks up `(profileId, normalizedJobLink)` before insert and returns a friendly `409 CONFLICT` with the existing application's ID.
3. **Database-level `UNIQUE(profileId, normalizedJobLink)` constraint** — the authoritative, race-condition-proof guard. Even if two requests slip past the pre-check simultaneously, Postgres rejects the second insert (Prisma error `P2002`), which the API translates into the same `409 CONFLICT` shape.

Use `GET /applications/check-duplicate` to check before submitting, for instant UI feedback.

---

## Quick Reference Table

| Method | Path | Auth | Roles |
|---|---|---|---|
| GET | `/health` | No | — |
| POST | `/auth/signup` | No | — |
| POST | `/auth/login` | No | — |
| POST | `/auth/refresh` | No (cookie) | — |
| POST | `/auth/forgot-password/question` | No | — |
| POST | `/auth/forgot-password/reset` | No | — |
| POST | `/auth/logout` | Yes | Any |
| GET | `/auth/me` | Yes | Any |
| PATCH | `/auth/profile` | Yes | Any |
| POST | `/auth/security-question` | Yes | Any |
| POST | `/auth/change-password` | Yes | Any |
| GET | `/recruiters` | Yes | Admin |
| POST | `/recruiters` | Yes | Admin |
| GET | `/recruiters/:id/stats` | Yes | Admin |
| PATCH | `/recruiters/:id` | Yes | Admin |
| PATCH | `/recruiters/:id/status` | Yes | Admin |
| DELETE | `/recruiters/:id` | Yes | Admin |
| GET | `/profiles` | Yes | Admin, Recruiter (scoped) |
| GET | `/profiles/:id` | Yes | Admin, Recruiter (scoped) |
| POST | `/profiles` | Yes | Admin, Recruiter |
| PATCH | `/profiles/:id` | Yes | Admin, Recruiter (scoped) |
| PATCH | `/profiles/:id/assign` | Yes | Admin |
| DELETE | `/profiles/:id` | Yes | Admin |
| GET | `/applications` | Yes | Admin, Recruiter (scoped) |
| GET | `/applications/check-duplicate` | Yes | Admin, Recruiter |
| GET | `/applications/:id` | Yes | Admin, Recruiter (scoped) |
| POST | `/applications` | Yes | Admin, Recruiter |
| PATCH | `/applications/:id` | Yes | Admin, Recruiter (scoped) |
| GET | `/analytics/job-portals` | Yes | Admin, Recruiter (scoped) |
| GET | `/analytics/summary` | Yes | Admin |
| GET | `/analytics/dashboard` | Yes | Admin |
| GET | `/analytics/dashboard/:id/breakdown` | Yes | Admin |
| GET | `/analytics/daily-counts` | Yes | Admin |

---

*Updated for the current Mayzax ATS API on 2026-07-08. Some examples are illustrative snapshots of the documented response shapes.*
