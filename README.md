# Mayzax ATS

**Mayzax ATS** is a production-grade Recruitment Applicant Tracking System built for **Mayzax Solutions**. It lets Admins manage recruiters and candidate profiles, lets Recruiters log job applications against their assigned profiles, and gives Admins a real-time analytics dashboard — all keyed off Mayzax's night-shift **business date** instead of the calendar date.

> **Build status:** The backend (API, database, auth, business logic) is **complete, migrated, and verified against a live PostgreSQL database** — every endpoint below has been exercised with real HTTP requests. The frontend foundation (Vite + React + TS + Tailwind + shadcn/ui, routing, auth context, API hooks, design system, login page, recruiter form) is in place; the remaining feature pages (Dashboard, Analytics, Recruiters list, Profiles, Applications) are actively being built out module-by-module. See [Project Status](#project-status) for the exact checklist.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Tech Stack](#tech-stack)
3. [Monorepo Structure](#monorepo-structure)
4. [Core Domain Concepts](#core-domain-concepts)
5. [Business Shift Logic](#business-shift-logic)
6. [Duplicate Application Detection](#duplicate-application-detection)
7. [Database Schema](#database-schema)
8. [Getting Started](#getting-started)
9. [Environment Variables](#environment-variables)
10. [API Reference](#api-reference)
11. [Authentication & RBAC](#authentication--rbac)
12. [Docker Setup](#docker-setup)
13. [Scripts Reference](#scripts-reference)
14. [Engineering Standards](#engineering-standards)
15. [Project Status](#project-status)
16. [Deployment Checklist](#deployment-checklist)

---

## Architecture

Mayzax ATS follows **clean architecture** with a clear separation of concerns on both tiers:

```
                ┌─────────────────────────────┐
                │      React SPA (Vite)       │
                │  Pages → Hooks → API Client │
                └───────────────┬─────────────┘
                                │ HTTPS (JWT access token + HttpOnly refresh cookie)
                ┌───────────────▼─────────────┐
                │   Express API (versioned)   │
                │  Routes → Controllers       │
                │       → Services            │
                │       → Repositories        │
                │       → Prisma ORM          │
                └───────────────┬─────────────┘
                                │
                ┌───────────────▼─────────────┐
                │        PostgreSQL           │
                └──────────────────────────────┘
```

**Backend layering (per module):**

| Layer | Responsibility |
|---|---|
| `*.routes.ts` | Wires HTTP verbs/paths to controllers; applies `requireAuth`, `requireRole`, `validate` middleware |
| `*.controller.ts` | Thin HTTP adapters — parse req, call service, shape response |
| `*.service.ts` | Business logic, authorization rules, orchestration, audit logging |
| `*.repository.ts` | Prisma queries only — no business logic |
| `*.validation.ts` | Zod schemas for request body/query/params |

This keeps controllers dumb, business rules testable in isolation, and DB access swappable.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui (Radix primitives) |
| State/Data | TanStack Query (server state), React Hook Form + Zod (forms) |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT (access + refresh) with rotation, bcrypt, HttpOnly cookies |
| Validation | Zod (shared conventions front & back) |
| Logging | Pino / pino-http |
| Containerization | Docker + docker-compose |

---

## Monorepo Structure

```
mayzax-ats/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Full DB schema (models, enums, constraints)
│   │   ├── seed.ts                # Creates ONLY the initial Admin account (no mock data)
│   │   └── migrations/            # Versioned SQL migrations
│   ├── src/
│   │   ├── config/env.ts          # Zod-validated environment config
│   │   ├── lib/                   # prisma client singleton, logger
│   │   ├── middleware/            # auth, validate, errorHandler, rateLimiter, requestLogger
│   │   ├── modules/
│   │   │   ├── auth/              # login, refresh, logout, me, change-password
│   │   │   ├── recruiters/        # Admin recruiter management + stats
│   │   │   ├── profiles/          # Client profile CRUD + assignment
│   │   │   ├── applications/      # Job applications + duplicate detection
│   │   │   ├── analytics/         # Admin dashboard, breakdowns, daily counts
│   │   │   └── shared/            # audit logging service
│   │   ├── routes/index.ts        # API v1 router aggregation
│   │   ├── utils/                 # apiError, asyncHandler, businessDate, normalizeJobLink
│   │   ├── app.ts                 # Express app wiring (helmet, cors, rate-limit, routers)
│   │   └── server.ts              # Process entrypoint, graceful shutdown
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/{ui,layout,shared}/   # shadcn primitives + app shell + reusable states
│   │   ├── context/auth-context.tsx         # Auth provider (silent refresh, session state)
│   │   ├── hooks/                           # TanStack Query hooks per domain
│   │   ├── lib/                             # axios client w/ refresh interceptor, utils
│   │   ├── pages/                           # Route-level pages
│   │   ├── routes/protected-route.tsx       # RBAC route guarding
│   │   └── types/                           # Shared TS types mirroring API contracts
│   ├── .env.example
│   ├── tailwind.config.ts         # Mayzax brand palette (blue/green from logo)
│   └── package.json
├── docker/
│   └── (Dockerfiles referenced by docker-compose.yml at repo root)
├── docker-compose.yml
├── package.json                   # Root orchestration scripts (setup/dev/build/lint for both apps)
└── README.md                      # ← you are here
```

---

## Core Domain Concepts

| Entity | Description |
|---|---|
| **User** | An Admin or Recruiter account. Soft-deletable, activatable/deactivatable. Tracks `lastActiveAt`. |
| **ClientProfile** | A candidate profile owned by Mayzax and worked by an assigned Recruiter. Contains candidate name, email, phone, technology, notes. |
| **JobApplication** | A single application submitted by a Recruiter, on behalf of a Profile, to a specific job posting. Carries the **duplicate-detection constraint**. |
| **RefreshToken** | Server-tracked refresh token (hashed) enabling rotation + reuse detection + multi-session revocation. |
| **AuditLog** | Append-only trail of sensitive actions (recruiter created/deleted, profile reassigned, application created, etc.) |

**Roles**

- **Admin** — manages recruiters, views all profiles/applications, full analytics dashboard.
- **Recruiter** — manages only their assigned profiles, submits/views only their own applications.

---

## Business Shift Logic

Mayzax operates an overnight business shift (IST):

```
Shift START:  7:30 PM IST
Shift END:    4:30 AM IST (next calendar day)
```

Because the shift spans midnight, **all reporting must use a "business date"** rather than the raw calendar date the timestamp falls on. This is implemented once, centrally, in:

```
backend/src/utils/businessDate.ts
```

### `getBusinessDate(timestamp)`

```ts
getBusinessDate(timestamp: Date | string | number = new Date()): Date
```

Rule:
- If IST time-of-day **≥ 19:30** → business date = **same** IST calendar date (shift just started).
- Else if IST time-of-day **≤ 04:30** → business date = **previous** IST calendar date (still inside last night's shift).
- Otherwise (daytime, 04:31–19:29, no active shift) → business date = same IST calendar date.

Verified examples (all pass in this implementation):

| Timestamp (IST) | `getBusinessDate` result |
|---|---|
| 8:00 PM, Jul 3 | **Jul 3** |
| 1:00 AM, Jul 4 | **Jul 3** |
| 4:00 AM, Jul 4 | **Jul 3** |
| 4:30 AM, Jul 4 (boundary, inclusive) | **Jul 3** |
| 4:31 AM, Jul 4 | **Jul 4** |
| 10:00 AM, Jul 4 | **Jul 4** |
| 7:30 PM, Jul 4 | **Jul 4** |

Related utilities in the same file:
- `getBusinessDateString(timestamp)` — `YYYY-MM-DD` string form.
- `isWithinBusinessShift(timestamp)` — boolean, is this instant inside an active shift window.
- `getBusinessShiftBounds(businessDate)` — UTC start/end instants for a given business date's shift (used to build precise DB range queries).
- `getCurrentBusinessShiftBounds()` — convenience wrapper for "right now."

Every `JobApplication` stores a computed `businessDate` (Postgres `DATE` column) at creation time, and all analytics endpoints (recruiter stats, dashboard, daily counts) group/filter by this column — never by `createdAt`'s calendar date.

---

## Duplicate Application Detection

**Requirement:** the same candidate profile must never be allowed to apply to the same job twice. Different profiles applying to the same job is perfectly valid (e.g., two candidates to the same opening).

```
Allowed:   Profile A → Job X        Blocked:   Profile A → Job X
           Profile B → Job X                   Profile A → Job X   (duplicate)
```

### Defense in depth (3 layers)

1. **Normalization** — `normalizeJobLink()` (`backend/src/utils/normalizeJobLink.ts`) canonicalizes a job URL before comparison:
   - lower-cases host, strips `www.`
   - strips trailing slashes
   - removes known tracking/session query params (`utm_*`, `gh_*`, `ref`, `refId`, `fbclid`, `gclid`, `src`, etc.)
   - sorts remaining query params deterministically
   - drops URL fragments

   So `https://www.linkedin.com/jobs/view/1234567?utm_source=share` and `linkedin.com/jobs/view/1234567/` normalize to the identical string `linkedin.com/jobs/view/1234567`.

2. **Application-level pre-check** — before insert, the service looks up `(profileId, normalizedJobLink)` and returns a friendly `409 Conflict` with the existing application's ID if found.

3. **Database-level constraint (authoritative)** — the Prisma schema declares:

   ```prisma
   @@unique([profileId, normalizedJobLink], name: "unique_profile_joblink")
   ```

   which Postgres enforces as:

   ```sql
   CREATE UNIQUE INDEX "job_applications_profileId_normalizedJobLink_key"
     ON "job_applications"("profileId", "normalizedJobLink");
   ```

   This is the **race-condition-proof** guard — even if two requests for the same duplicate slip past the pre-check simultaneously, Postgres rejects the second `INSERT` with error code `P2002`, which the centralized error handler / service layer translates back into the same clean `409 Conflict` response.

This was verified live: submitting the same profile against the same job (with different tracking parameters) correctly returned `409 CONFLICT`, while a different profile against the identical job URL succeeded with `201 Created`.

A pre-flight check endpoint is also exposed for instant UI feedback prior to submission: `GET /api/v1/applications/check-duplicate?profileId=...&jobLink=...`.

---

## Database Schema

Defined in `backend/prisma/schema.prisma`. Key models:

### `User`
```
id, name, email (unique), passwordHash, role (ADMIN|RECRUITER),
isActive, deletedAt (soft delete), lastActiveAt, createdById (self-relation),
createdAt, updatedAt
```

### `RefreshToken`
```
id, userId (FK), tokenHash (unique, SHA-256 — raw tokens are never stored),
userAgent, ip, expiresAt, revokedAt, replacedByTokenHash, createdAt
```

### `ClientProfile`
```
id, candidateName, email, phone, technology, notes,
assignedRecruiterId (FK → User, nullable),
isActive, deletedAt (soft delete), createdAt, updatedAt
```

### `JobApplication`
```
id, profileId (FK), recruiterId (FK), jobLink, normalizedJobLink,
companyName, jobTitle, jobPortal (enum), status (enum),
appliedAt, businessDate (DATE),
createdAt, updatedAt

UNIQUE (profileId, normalizedJobLink)   ← duplicate-detection constraint
INDEX  (recruiterId), (profileId), (businessDate), (status)
```

### `AuditLog`
```
id, userId (FK, nullable), action, entity, entityId, metadata (JSON),
ip, userAgent, createdAt
```

Enums: `Role {ADMIN, RECRUITER}`, `ApplicationStatus {APPLIED, IN_REVIEW, SHORTLISTED, INTERVIEW_SCHEDULED, INTERVIEWED, OFFERED, REJECTED, WITHDRAWN, ON_HOLD}`, `JobPortal {LINKEDIN, INDEED, NAUKRI, DICE, MONSTER, ZIPRECRUITER, GLASSDOOR, COMPANY_WEBSITE, CAREERBUILDER, OTHER}`.

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- PostgreSQL ≥ 14
- npm ≥ 9

The root `package.json` provides orchestration scripts so you rarely need to `cd` into `backend/` or `frontend/` directly — see [Root Scripts](#root-scripts-quick-reference) for the full list.

### Fastest path: one-command setup

```bash
git clone <repo-url> mayzax-ats
cd mayzax-ats
npm install               # installs root orchestration tooling (concurrently, rimraf)
npm run setup             # installs backend + frontend deps, copies .env files,
                           # generates the Prisma client, runs migrations, seeds the admin
```

`npm run setup` copies `backend/.env.example → backend/.env` and `frontend/.env.example → frontend/.env` **without overwriting existing files**. Open `backend/.env` afterwards and set real values for `DATABASE_URL`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` (generate secrets with `openssl rand -hex 32`) — then re-run `npm run db:migrate` and `npm run db:seed` if you changed the database connection.

The seed step prints the generated admin credentials — **log in and change the password immediately** (see `POST /auth/change-password`).

### Run in development

```bash
npm run dev
```

This runs the API and the web app **concurrently** in one terminal, with color-coded `[API]` / `[WEB]` log prefixes:

- API → `http://localhost:4000/api/v1`
- Web → `http://localhost:5173`

Or run them separately in two terminals if you prefer:

```bash
npm run dev:backend     # API only
npm run dev:frontend    # Web app only
```

### Build for production

```bash
npm run build            # builds backend (tsc) then frontend (tsc + vite build)
npm start                # starts the compiled backend (dist/server.js)
npm run preview:frontend # locally preview the built frontend/dist bundle
```

### Manual / step-by-step setup (equivalent to `npm run setup`)

If you'd rather run each step yourself:

```bash
npm run install:all       # npm install in both backend/ and frontend/
npm run env:all            # copy both .env.example files to .env
# edit backend/.env with real DATABASE_URL / JWT secrets
npm run db:generate        # prisma generate
npm run db:migrate         # prisma migrate dev (creates schema + constraints)
npm run db:seed            # creates ONLY the initial Admin account
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | `development` \| `test` \| `production` | `development` |
| `PORT` | API port | `4000` |
| `API_PREFIX` | Version prefix for all routes | `/api/v1` |
| `CLIENT_URL` | Allowed CORS origin | `http://localhost:5173` |
| `DATABASE_URL` | Postgres connection string | — (required) |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens | — (required) |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens | — (required) |
| `JWT_ACCESS_EXPIRES_IN` | Access token TTL | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL | `7d` |
| `COOKIE_DOMAIN` | Cookie domain (prod) | `localhost` |
| `COOKIE_SECURE` | `true` in production (HTTPS only) | `false` |
| `BUSINESS_SHIFT_START_HOUR` / `_MINUTE` | Shift start (IST) | `19` / `30` |
| `BUSINESS_SHIFT_END_HOUR` / `_MINUTE` | Shift end (IST) | `4` / `30` |
| `BUSINESS_TIMEZONE` | IANA timezone for shift math | `Asia/Kolkata` |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | Global rate limiting | `900000` / `300` |
| `AUTH_RATE_LIMIT_MAX` | Stricter limit on `/auth/*` | `20` |
| `LOG_LEVEL` | Pino log level | `info` |
| `LOGS_DIR` | Directory for daily rotating log files (`${LOGS_DIR}/YYYY-MM-DD.log`) | `logs` |
| `SEED_ADMIN_EMAIL/PASSWORD/NAME` | Used only by `prisma/seed.ts` | see `.env.example` |

### Frontend (`frontend/.env`)

| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL of the backend API | `http://localhost:4000/api/v1` |

---

## API Reference

All routes are versioned under `API_PREFIX` (default `/api/v1`). Responses follow a consistent envelope:

```json
// Success
{ "success": true, "data": ..., "pagination": { ... } }

// Failure
{ "success": false, "error": { "code": "...", "message": "...", "details": ... } }
```

### Auth (`/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | Public | Email + password login. Sets HttpOnly `access_token` / `refresh_token` cookies and returns an access token for header-based use. |
| POST | `/auth/refresh` | Cookie | Rotates the refresh token, issues a new pair. Detects token reuse and revokes all sessions if triggered. |
| POST | `/auth/logout` | Required | Revokes the current refresh token, clears cookies. |
| GET | `/auth/me` | Required | Returns the current authenticated user. |
| POST | `/auth/change-password` | Required | Changes password, revokes all existing sessions. |

### Recruiters (`/recruiters`) — Admin only

| Method | Path | Description |
|---|---|---|
| GET | `/recruiters` | List recruiters — search, filter by role/isActive, sort, paginate. |
| POST | `/recruiters` | Create a recruiter or admin account. |
| GET | `/recruiters/:id/stats` | Assigned profiles, total applications, current-shift applications, profile-wise counts, last active. |
| PATCH | `/recruiters/:id` | Update name/email/role. |
| PATCH | `/recruiters/:id/status` | Activate/deactivate. |
| DELETE | `/recruiters/:id` | Soft delete (unassigns their profiles). |

### Client Profiles (`/profiles`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/profiles` | Any | List — recruiters see only their assigned profiles; admins see all, with search/filter/sort. |
| GET | `/profiles/:id` | Any | Fetch a single profile (recruiters restricted to their own). |
| POST | `/profiles` | Any | Create a candidate profile. |
| PATCH | `/profiles/:id` | Any | Update profile fields (recruiters can't reassign). |
| PATCH | `/profiles/:id/assign` | Admin | Reassign to a different recruiter (or unassign). |
| DELETE | `/profiles/:id` | Admin | Soft delete. |

### Job Applications (`/applications`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/applications` | Any | List — recruiters see only their own; search/filter by status, portal, business date range. |
| GET | `/applications/check-duplicate` | Any | Pre-flight duplicate check for instant UI feedback. |
| GET | `/applications/:id` | Any | Fetch a single application. |
| POST | `/applications` | Any | Create an application. Enforces duplicate protection (see above). |
| PATCH | `/applications/:id` | Any | Update status/company/title/portal. |

### Analytics (`/analytics`) — Admin only

| Method | Path | Description |
|---|---|---|
| GET | `/analytics/summary` | Global counts: recruiters, active recruiters, profiles, applications, current-shift applications. |
| GET | `/analytics/dashboard` | Per-recruiter rollup: assigned profiles, total applications, current-shift applications, last active. Search/sort/paginate. |
| GET | `/analytics/dashboard/:id/breakdown` | Expandable view: profile-wise application counts + recent applications for one recruiter. |
| GET | `/analytics/daily-counts` | Daily application counts grouped by **business date**, optionally filtered by recruiter and date range — powers trend charts. |

### Health

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness check. |

---

## Authentication & RBAC

- **Password hashing:** bcrypt, 12 salt rounds.
- **Access tokens:** short-lived JWTs (default 15m), returned in the JSON body *and* set as an HttpOnly cookie; the frontend keeps the token in memory and attaches it as `Authorization: Bearer <token>`.
- **Refresh tokens:** longer-lived (default 7d), HttpOnly cookie only. Server stores only a **SHA-256 hash** of each refresh token, never the raw value.
- **Rotation + reuse detection:** every refresh issues a new token pair and revokes the old one. If a *revoked* token is presented again (a signal of token theft/replay), **all** sessions for that user are immediately revoked.
- **RBAC middleware:** `requireAuth` verifies the JWT and attaches `req.user`; `requireRole(...)` restricts a route to specific roles. Applied at the router level per module (e.g., all of `/recruiters/*` requires `ADMIN`).
- **Row-level authorization:** even within allowed roles, services enforce ownership — a Recruiter can only view/edit profiles and applications assigned to/created by them; Admins have unrestricted visibility.

---

## Docker Setup

A `docker-compose.yml` at the repo root will spin up Postgres, the API, and the web app together for a one-command local/production-like environment:

```bash
docker compose up --build
```

Services:
- `db` — PostgreSQL 16 with a named volume for persistence.
- `api` — backend, built from `backend/Dockerfile`, runs `prisma migrate deploy` on boot, then starts the server.
- `web` — frontend, built from `frontend/Dockerfile`, served via a lightweight static server/Nginx.

> Dockerfiles and compose file ship alongside the recruiter/profile/application frontend pages in the next increment — tracked in [Project Status](#project-status).

---

## Scripts Reference

### Root Scripts (Quick Reference)

Run these from the repository root (`mayzax-ats/`) — they delegate to `backend/` and `frontend/` via `npm --prefix`, so you never have to change directories for day-to-day work.

| Script | Description |
|---|---|
| `npm run setup` | **One-shot bootstrap**: install both apps' deps → copy `.env` files → generate Prisma client → run migrations → seed the admin account |
| `npm run install:all` | `npm install` in both `backend/` and `frontend/` |
| `npm run install:backend` / `install:frontend` | Install deps for just one app |
| `npm run env:all` | Copy `backend/.env.example` and `frontend/.env.example` to `.env` (non-destructive) |
| `npm run dev` | Run **API + Web app together**, color-coded `[API]`/`[WEB]` logs, via `concurrently` |
| `npm run dev:backend` / `dev:frontend` | Run just one app in dev mode |
| `npm run build` | Build backend then frontend for production |
| `npm run build:backend` / `build:frontend` | Build just one app |
| `npm start` | Start the compiled backend (`dist/server.js`) |
| `npm run preview:frontend` | Preview the built frontend bundle locally |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:migrate` | Create & apply a dev migration (prompts for a name) |
| `npm run db:migrate:deploy` | Apply pending migrations — use this in production/CI |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |
| `npm run db:seed` | Create the initial Admin account (idempotent — safe to re-run) |
| `npm run lint` / `npm run typecheck` | Run lint/typecheck across both apps |
| `npm run lint:backend` / `lint:frontend`, `typecheck:backend` / `typecheck:frontend` | Run lint/typecheck for just one app |
| `npm run clean` | Remove `node_modules` and build output from both apps and the root |

### Backend (`backend/package.json`)

| Script | Description |
|---|---|
| `npm run dev` | Start API with hot reload (`tsx watch`) |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Run compiled server |
| `npm run prisma:generate` | Regenerate Prisma client |
| `npm run prisma:migrate` | Create & apply a dev migration |
| `npm run prisma:migrate:deploy` | Apply pending migrations (production) |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run seed` | Create the initial Admin account (idempotent) |
| `npm run lint` / `npm run typecheck` | Static checks |

### Frontend (`frontend/package.json`)

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` / `npm run typecheck` | Static checks |

---

## Engineering Standards

- **Clean folder structure** — modular, feature-first backend; component/hook separation on the frontend.
- **Environment variables** — validated at boot with Zod; app refuses to start if misconfigured.
- **API versioning** — all routes under `/api/v1`, allowing future `/api/v2` without breaking clients.
- **Centralized error handling** — one Express error-handling middleware normalizes `ApiError`, Zod validation errors, and Prisma errors (including translating `P2002` unique-constraint violations into friendly `409`s) into a single response shape.
- **Structured logging** — Pino JSON logs in production, pretty-printed in development; every request gets an `x-request-id`.
- **Daily rotating file logs** — every log line (startup, shutdown, HTTP requests, errors, audit-adjacent events) is written to `${LOGS_DIR}/YYYY-MM-DD.log` in addition to stdout. `LOGS_DIR` is configured via `.env` (relative or absolute path); the file automatically rotates to a new date-stamped file at midnight IST with zero extra dependencies. See `src/lib/daily-log-stream.ts`.
- **Validation middleware** — Zod schemas validate/coerce `body`, `query`, and `params` before controllers ever run.
- **Database migrations** — Prisma Migrate, versioned and committed to `prisma/migrations/`.
- **Reusable services & repository pattern** — controllers never touch Prisma directly; repositories isolate persistence concerns from business rules in services.
- **Audit logging** — sensitive mutations (recruiter/profile/application create/update/delete, reassignment, activation toggles) are recorded to `AuditLog` without ever blocking the primary operation on a logging failure.
- **No mock data** — the seed script creates only the platform's first Admin account; all recruiters, profiles, and applications must be created through real usage.

---

## Project Status

### ✅ Backend — Complete & Verified

- [x] Prisma schema, migrations applied to a live PostgreSQL instance
- [x] Auth module (login, refresh rotation + reuse detection, logout, me, change password)
- [x] Recruiter management (CRUD, activate/deactivate, soft delete, stats)
- [x] Client profile management (CRUD, assignment, search/filter, RBAC visibility)
- [x] Job application module (create/list/update, search/filter by status/portal/business date)
- [x] Duplicate detection — normalization, pre-check, and DB unique constraint, all tested live
- [x] `getBusinessDate()` and shift utilities — unit-verified against every example in the spec
- [x] Analytics endpoints (summary, dashboard, per-recruiter breakdown, daily counts)
- [x] Centralized error handling, request logging, rate limiting, env validation
- [x] Seed script (admin-only, no mock data)

### 🚧 Frontend — In Progress

- [x] Vite + React + TS + Tailwind + shadcn/ui foundation, Mayzax brand theme
- [x] Axios client with silent access-token refresh interceptor
- [x] Auth context, protected routes, RBAC route guarding
- [x] TanStack Query hooks for all backend modules (recruiters, profiles, applications, analytics)
- [x] Reusable UI primitives (button, input, table, dialog, select, badge, avatar, tabs, skeleton, dropdown, etc.)
- [x] Shared loading / empty / error state components
- [x] Login page (Mayzax-branded)
- [x] App shell (sidebar, header, mobile nav)
- [x] Recruiter create/edit dialog
- [ ] Admin Dashboard page (overview cards + expandable recruiter table)
- [ ] Analytics page (charts, daily counts by business date)
- [ ] Recruiters list page (wire up the existing dialog + activate/deactivate/delete actions)
- [ ] Client Profiles page (list, create/edit, assignment)
- [ ] Applications page (recruiter workflow: select profile → paste link → duplicate check → submit; history/search/filter)

### 📦 Not Yet Generated

- [ ] `docker-compose.yml` + `backend/Dockerfile` + `frontend/Dockerfile`

This README will be updated as each remaining module ships.

---

## Deployment Checklist

Before going to production:

1. Set `NODE_ENV=production`.
2. Generate strong, unique `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (`openssl rand -hex 32`).
3. Set `COOKIE_SECURE=true` and serve over HTTPS (required for `Secure` cookies to work).
4. Point `DATABASE_URL` at a managed/production Postgres instance; run `npx prisma migrate deploy`.
5. Run `npm run seed` once against production to create the first Admin, then **change that password immediately**.
6. Set `CLIENT_URL` to your production frontend origin (CORS).
7. Set `VITE_API_BASE_URL` to your production API URL and rebuild the frontend.
8. Put the API behind a reverse proxy / load balancer that forwards `X-Forwarded-For` (the app trusts proxy hop `1`).
9. Review `RATE_LIMIT_*` values for expected production traffic.
10. Ship logs (`pino` JSON output) to your log aggregator of choice.

---

© Mayzax Solutions. Built for internal recruitment operations.
