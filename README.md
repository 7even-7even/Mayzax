# Mayzax ATS + Employee Companion

Mayzax is a comprehensive Recruitment Applicant Tracking System (ATS), Customer Relationship Management (CRM) portal, and employee tracking suite. It features automated shift & attendance tracking, analytics reporting, and real-time alerts.

The repository is structured into four primary modules:
1. **Backend API** (`backend/`) — Node.js + Express API engine.
2. **Web Frontend Portal** (`frontend/`) — React-based CMS / CRM for administrators, team leaders, and recruiters.
3. **Mobile Companion App** (`mobile/`) — Expo (React Native) employee utility app for shifts, attendance, metrics, and push alerts.
4. **Chrome Extension** (`extension/`) — Recruiter utility tool for web scraping and quick candidate sourcing.

---

## 🚀 Key Modules & Functionality

### 1. Backend Core API (`backend/`)
* **Framework & Database:** Node.js + Express + Prisma ORM + PostgreSQL.
* **Authentication:** Stateless JWT auth with Secure Token Rotation. Employs middleware checking client signatures (`X-Client-Type`) to restrict write operations for mobile/extension scopes.
* **Job & ATS Core:** Sourcing candidate data, application pipeline management, recruiter allocations, client profiling, and job portal metrics.
* **Attendance Engine:** Tracks real-time status (Active, On Break, Offline), worked hours, break usage, late grace periods, and late penalties computed server-side.
* **Background Workers:** Powered by BullMQ & Redis for async jobs, automated shift reminders, break expiration notifications, and notice broadcasts.
* **Push Notifications:** Integrated with Firebase Cloud Messaging (FCM) to trigger alerts for mobile companion clients.

### 2. Web CRM Portal (`frontend/`)
* **Stack:** React + TypeScript + Tailwind CSS.
* **Candidate Sourcing & ATS:** Detailed boards for candidate pipelines, resume indexing, application form processing, and client management.
* **Team Management:** Tools for Team Leaders and Admins to configure shifts, assign recruiters to teams, manage client mappings, and monitor organization-wide quotas.
* **Analytics Center:** Visual boards tracking total applicant counts, client performance, recruiter KPIs, and placement success rates.

### 3. Mobile Companion App (`mobile/`)
* **Stack:** Expo (React Native) + TypeScript + React Query (offline persistence) + Expo Secure Store.
* **Home Dashboard:** Live metrics showing clock-in statuses (Active, On Break), total applications today, and real-time top performer metrics (with auto-formatting names like `First Initial. (Score)` to ensure zero UI overflow).
* **Analytics Hub:** Admin/Team Leader dashboard displaying shift activity summaries, recruiter role counts, interactive team performance progress bars, a 14-day application trends bar chart, and job portal breakdowns.
* **Notifications Center:** Infinite-scroll feed of real-time alerts (break warnings, shift reminders, company notices, penalty logs) with check-all read automation.
* **Settings & Preferences:** Custom theme selector (Light/Dark/System Default), device push token configurations, developer/app version information, and secure logout.
* **Profile & History:** Worked hours breakdown, active shifts log, and historic attendance details.

### 4. Recruiter Chrome Extension (`extension/`)
* Recruiter sourcing overlay enabling one-click candidate capturing directly from job portals (LinkedIn, Indeed, Naukri, etc.).
* Automated data extraction, matching profiles to open jobs inside the Mayzax database, and seamless sync with backend APIs.

---

## 🛠️ Environment Configurations

### Backend Additional Configurations
* `REDIS_URL` — For BullMQ queue worker operations (falls back to node-cron if undefined).
* `FIREBASE_SERVICE_ACCOUNT_JSON` — Service account key for FCM push notification alerts.
* **Shift Settings:** `DEFAULT_SHORT_BREAK_SECONDS`, `DEFAULT_DINNER_BREAK_SECONDS`, `DEFAULT_SHIFT_DURATION_SECONDS`, `DEFAULT_LATE_GRACE_MINUTES`, `DEFAULT_PENALTY_PER_LATE_MINUTE`.

### Mobile App Configurations
* `EXPO_PUBLIC_API_BASE_URL` — Base endpoint pointing to the running backend service.

---

## ⚡ Quick Start

### Backend API
```bash
cd backend
npm install
cp .env.example .env   # Configure DATABASE_URL, JWT, and Firebase variables
npx prisma migrate dev
npm run seed
npm run dev            # Running on http://localhost:4000/api/v1
```

### Mobile Companion
```bash
cd mobile
npm install
cp .env.example .env   # Set EXPO_PUBLIC_API_BASE_URL
npm start              # Launches Expo bundler. Scan QR code or run on emulator
```

### Web CRM
```bash
cd frontend
npm install
npm run dev            # Launches admin CMS interface
```

---

## 📜 License
Proprietary to Mayzax Solutions. All rights reserved.
