# Mayzax ATS + Employee Companion

Mayzax is a Recruitment ATS / CMS with shift & attendance tracking for recruiters. It ships in three parts:

- **Backend** (`backend/`) — Node.js + Express + PostgreSQL + Prisma + JWT auth, with BullMQ scheduling and optional Firebase Cloud Messaging.
- **Web frontend** (`frontend/`) — React + TypeScript + Tailwind (existing CMS/CRM).
- **Mobile Companion App** (`mobile/`) — Expo (React Native) + TypeScript read-only employee companion app for viewing shifts, attendance, notifications, and profile.

See each sub-project for its own README.

## Quick Start (Backend)

```bash
cd backend
npm install
cp .env.example .env   # edit DATABASE_URL, JWT secrets, etc.
npx prisma migrate dev
npm run seed
npm run dev
```

Default API base: `http://localhost:4000/api/v1`.

## Quick Start (Mobile Companion)

```bash
cd mobile
npm install
cp .env.example .env   # set EXPO_PUBLIC_API_BASE_URL
npm start              # launches Expo dev server; open in Expo Go
```

For build/deploy instructions, see [docs/MOBILE_SETUP.md](./docs/MOBILE_SETUP.md) and [mobile/README.md](./mobile/README.md).

## Key Companion App Principles

- **Read-only.** The mobile app never mutates attendance. Server-side middleware rejects mutating activity endpoints for mobile-issued JWTs (`X-Client-Type: mobile`).
- **Source of truth is the backend.** Worked hours, break remaining, late/early/penalty are all computed on the server and exposed via new read endpoints under `/attendance/*`.
- **JWT in secure storage.** Refresh token rotation continues to work for mobile tokens; mobile logins do not create an attendance entry.
- **Offline support.** Recent dashboard, history, profile and notifications are cached via React Query persistence.
- **Push notifications.** FCM/APNS tokens are registered per device; BullMQ schedules break/shift reminders.

## Repository Structure

```
backend/   Express + Prisma API
frontend/  React CMS (existing)
mobile/    Expo React Native companion app (new)
extension/ Chrome extension (existing)
docs/      Documentation, snapshots, setup guides
```

## Environment Variables (Backend additions for companion)

In addition to the existing variables, the companion app requires:

- `REDIS_URL` (optional, for BullMQ; falls back to node-cron)
- `FIREBASE_SERVICE_ACCOUNT_JSON` or `FIREBASE_SERVICE_ACCOUNT_PATH` (for push)
- `DEFAULT_SHORT_BREAK_SECONDS`, `DEFAULT_DINNER_BREAK_SECONDS`, `DEFAULT_BRIEFING_SECONDS`, `DEFAULT_MEETING_SECONDS`, `DEFAULT_SYSTEM_ISSUE_SECONDS`, `DEFAULT_SHIFT_DURATION_SECONDS`, `DEFAULT_LATE_GRACE_MINUTES`, `DEFAULT_EARLY_GRACE_MINUTES`, `DEFAULT_PENALTY_PER_LATE_MINUTE`

See `backend/.env.example` for defaults.

## License

Proprietary to Mayzax Solutions.
