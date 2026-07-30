# Mayzax Companion — Employee Mobile App

A read-only employee companion app for Mayzax CMS/CRM, built with **Expo**, **React Native (TypeScript)**, **React Navigation**, **React Query**, **Axios**, **React Native Paper + NativeWind**, **React Hook Form + Zod**, **expo-secure-store**, **AsyncStorage**, and **Firebase Cloud Messaging (via expo-notifications)**.

The app lets employees view their current shift status, today's activity timeline, monthly attendance history, company notifications, and their profile. It **never** mutates attendance — all write operations (login/logout/break start/end/heartbeat) remain desktop-only.

---

## Features

- **Email login** using your existing Mayzax CMS credentials
- **Auto-login / Remember me** with secure token storage (Keychain/Keystore via `expo-secure-store`)
- **Token refresh** with 401 handling and request queueing
- **Home dashboard**: greeting, profile photo, current status, worked hours ring, live break countdown, quick stats, quick links
- **Today's activity timeline**: login, break, logout events, current status, expected logout, all read-only
- **Attendance history**: month calendar view with colored day indicators, day list, tap-through to details
- **Attendance detail**: full breakdown of a single day — timeline, totals, late/early/penalty
- **Notifications** inbox (push + in-app) with read/unread state, deep-linking to relevant screens
- **Profile**: designation, department, join date, manager, contact (read-only)
- **Settings**: light/dark/system theme, notifications toggle, logout, version, privacy/terms/help
- **Push notifications** via FCM/APNS (through Expo's push service) — channels for attendance reminders and company announcements
- **Offline support**: React Query persistence to AsyncStorage; cached data shown when offline with a clear banner
- **Professional corporate UI** — soft shadows, rounded cards, skeleton loaders, empty/error states, pull-to-refresh, dark/light themes

---

## Project Structure

```
mobile/
├── App.tsx
├── index.ts
├── app.json
├── eas.json
├── babel.config.js
├── metro.config.js
├── tailwind.config.js
├── tsconfig.json
├── package.json
├── assets/                # Icon, splash, favicon (placeholder brand assets)
├── google-services.json   # Replace with your own Firebase config (placeholder committed)
└── src/
    ├── components/        # Reusable UI (Card, StatTile, Timeline, Avatar, Skeleton, etc.)
    ├── features/notifications/
    │   ├── push.ts        # FCM/APNS registration, listeners, channels
    │   └── channels.ts    # Android notification channels
    ├── hooks/             # useAuth, useThemeMode, useCountdown, useOnline
    ├── navigation/        # RootNavigator (stack + tabs + deep links)
    ├── screens/           # Splash, Login, Home, Activity, History, Notifications, Profile, Settings, Help, etc.
    ├── services/          # Axios API client (api.ts), auth, attendance, profile, notifications, devices
    ├── state/             # React Query client + async-storage persister
    ├── storage/           # expo-secure-store wrapper
    ├── theme/             # Colors, spacing, typography, Paper themes
    ├── types/             # API DTO types
    └── utils/             # Date/number formatting, constants
```

---

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- **Expo CLI** (`npx expo`)
- For iOS: macOS with Xcode (for simulator) or an iPhone with [Expo Go](https://expo.dev/client)
- For Android: Android SDK + emulator, or an Android device with Expo Go
- For production builds / FCM push: an [EAS](https://expo.dev/eas) account and a Firebase project

### Install

```bash
cd mobile
npm install
```

### Environment variables

Copy `.env.example` to `.env` and adjust values:

```bash
cp .env.example .env
```

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | Backend API base URL ending in `/api/v1`. For Android emulators use `http://10.0.2.2:4000/api/v1`. For iOS simulators use `http://localhost:4000/api/v1`. For physical devices, use your machine's LAN IP or deployed URL. |
| `EXPO_PUBLIC_APP_NAME` | App display name. |
| `EXPO_PUBLIC_SUPPORT_EMAIL` | Support email (used in Help screen). |
| `EXPO_PUBLIC_SUPPORT_PHONE` | Support phone number. |
| `EXPO_PUBLIC_PRIVACY_URL` / `EXPO_PUBLIC_TERMS_URL` | Web URLs for policy docs. |

### Running the app in development

```bash
# Start Expo dev server
npm start

# Direct launch
npm run android     # Android emulator / connected device
npm run ios         # iOS simulator (macOS only)
```

Open the app in Expo Go (recommended for development) or use a development build.

---

## Backend Requirements

The mobile app relies on new read-only endpoints added to the Mayzax backend (all under `API_PREFIX`, default `/api/v1`):

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/login` | Authenticate (existing, extended to accept `X-Client-Type: mobile` — does NOT start attendance for mobile) |
| POST | `/auth/refresh` | Refresh JWT pair (existing, extended for mobile) |
| POST | `/auth/logout` | Invalidate refresh token (existing) |
| GET | `/auth/me` | Current user (existing, extended with reporting manager) |
| POST | `/devices/register` | Register/update FCM/Expo push token |
| GET | `/devices` | List registered devices |
| DELETE | `/devices/:id` | Remove a device |
| GET | `/shifts/me` | Resolved shift configuration + today's window |
| GET | `/attendance/today` | Rich today payload for dashboard (server-computed) |
| GET | `/attendance/current-break` | Live break info with remaining seconds |
| GET | `/attendance/month-summary?month=YYYY-MM` | Calendar cells + per-day status & totals |
| GET | `/attendance/history` | Paginated attendance days |
| GET | `/attendance/:date` | One day detail with timeline |
| GET | `/notifications` | Paginated notifications + unread count |
| POST | `/notifications/:id/read` | Mark notification read |
| POST | `/notifications/read-all` | Mark all read |

Mutating endpoints (`POST /activity/status`, `POST /activity/heartbeat`) are **blocked** for mobile-issued JWTs at the server (defense in depth), regardless of client.

Before running the mobile app, make sure you've run the backend Prisma migration:

```bash
cd backend
npm install
npx prisma migrate dev    # creates DeviceToken, Notification, ShiftConfig, AttendanceDay tables
npm run seed              # ensures default shift config
npm run dev
```

---

## Firebase / Push Notifications

The app uses `expo-notifications` to obtain a device push token (FCM on Android, APNs on iOS via Expo). On sign-in the token is POSTed to `/devices/register`. The backend sends reminders via Firebase Admin SDK to all registered tokens.

### Setting up push (production)

1. Create a Firebase project.
2. In the Firebase console go to **Project settings → Cloud Messaging** and note the **Server Key** / upload your APNs key for iOS.
3. For Android: download `google-services.json` and replace `mobile/google-services.json`.
4. For iOS: download `GoogleService-Info.plist` and drop it into the `mobile/ios/` folder after `prebuild` (see Expo docs).
5. In EAS Build, build a development client or production APK/AAB:

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build -p android --profile preview
```

6. On the backend, set either:
   - `FIREBASE_SERVICE_ACCOUNT_JSON` = the full JSON string (or base64 of it), **or**
   - `FIREBASE_SERVICE_ACCOUNT_PATH` = filesystem path to the service account JSON file.

If Firebase is not configured, push delivery is skipped but in-app notifications still work.

### Notification Channels (Android)

The app creates three channels:
- `mayzax_default` — general
- `mayzax_attendance` — break/shift reminders (high importance, sound + vibration)
- `mayzax_announcements` — company notices

---

## Theming

The app supports light, dark, and system themes (toggle in Settings). The design system uses a corporate navy/teal palette in `src/theme/index.ts`. React Native Paper and NativeWind are used together: Paper provides Material Design components; NativeWind provides Tailwind utility classes (we primarily use inline `StyleSheet` for the production screens for clarity and performance).

---

## Security Notes

- JWTs are stored in `expo-secure-store` (Keychain on iOS, encrypted SharedPreferences/Keystore on Android).
- All traffic uses HTTPS in production (configured by your deployed URL).
- The app never sends secret keys in source code; all configuration is via `EXPO_PUBLIC_*` variables (non-secrets).
- Mutating attendance APIs are not callable from the mobile JWT (server-side enforcement).
- All responses from the backend are read-only DTOs — no business logic is duplicated in the app.

Optional hardening you can enable in your own builds:
- Certificate pinning (use `react-native-ssl-pinning` after ejecting)
- `expo-screen-capture` prevents screenshots on sensitive screens (wired, toggleable)
- Root/Jailbreak detection via `react-native-device-info`
- Code obfuscation via EAS Pro Guard/proguard rules (enabled by default for release AABs)

---

## Building an APK

Using Expo Application Services (recommended):

```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview   # builds an .apk
eas build -p android --profile production  # builds an .aab for Play Store
```

To build locally (requires Android SDK + Java 17):

```bash
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

The generated APK will be in `android/app/build/outputs/apk/release/`.

---

## Testing

```bash
npm test          # run jest unit tests
npm run typecheck # TypeScript type check
```

Unit tests cover:
- Auth state machine (login/refresh/logout)
- API interceptor behavior (401 refresh queueing)
- Formatting utilities
- Countdown hook
- Offline/error state rendering

---

## Deployment Checklist

1. Backend deployed with PostgreSQL, Redis (for BullMQ), and Firebase service account configured.
2. DNS + TLS set up; `EXPO_PUBLIC_API_BASE_URL` points to the deployed HTTPS URL.
3. Firebase project created; APNs + FCM server key configured in Expo dashboard.
4. Android `google-services.json` replaced; iOS `GoogleService-Info.plist` added after `prebuild`.
5. Build production APK/AAB via EAS.
6. Internal testing track in Play Console → closed beta → production.
7. Distribute via TestFlight / Play Store internal testing before full rollout.

---

## Troubleshooting

- **Network error on Android emulator**: make sure you're using `http://10.0.2.2:4000/api/v1` (Android emulator loopback alias).
- **Push notifications not arriving**: check `FIREBASE_SERVICE_ACCOUNT_*` env vars on backend; check that device appears in `DeviceToken` table after login; check notification permission status in device Settings.
- **Stuck on splash screen**: most likely the API URL is unreachable or HTTPS is self-signed. Run `adb logcat` or Xcode console to see errors.
- **CORS errors**: add your custom origin to `ADDITIONAL_CORS_ORIGINS` on backend (not needed for mobile which sends `X-Client-Type: mobile`).

