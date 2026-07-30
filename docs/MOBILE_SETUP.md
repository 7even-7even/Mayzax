# Mayzax Companion — Setup, Build & Deployment Guide

This document walks through backend prep, Firebase setup, Expo/EAS configuration, building an APK, and publishing to the Play Store.

---

## 1. Backend Setup

From repo root:

```bash
cd backend
npm install
cp .env.example .env
# Edit .env:
#  - DATABASE_URL + DIRECT_URL  (PostgreSQL)
#  - JWT_ACCESS_SECRET, JWT_REFRESH_SECRET  (long random strings)
#  - REDIS_URL (optional, for BullMQ reminders; if omitted node-cron in-process is used)
#  - FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH
```

Run migrations to create the new tables (`DeviceToken`, `Notification`, `ShiftConfig`, `AttendanceDay`) and add columns:

```bash
npx prisma migrate dev --name add_companion_app
npm run seed          # ensures a default shift config exists
npm run dev           # starts http://localhost:4000
```

Verify the new endpoints:

```
GET  /api/v1/health
POST /api/v1/auth/login
GET  /api/v1/attendance/today   (requires Bearer token)
```

### Production backend

On Render/Fly.io/Docker/etc:
- Provision Redis (Upstash, Redis Labs, or Render Redis).
- Add all env vars from `.env.example`.
- Run `npm run build && npm start`.
- The default port is 4000; reverse-proxy Nginx/Caddy with TLS in front.
- CORS: Add your app's origin (expo apps use capacitor/custom-scheme `mayzax://`, but for the mobile app all calls are from the native client directly so CORS doesn't apply; only add any web origins you care about).

---

## 2. Firebase Setup

1. Go to [firebase.google.com](https://firebase.google.com) → Create a project (use the GCP project if you already have one).
2. **Add an app**:
   - Android: use package name `com.mayzax.companion`; download `google-services.json` → place in `mobile/google-services.json`.
   - iOS: use bundle ID `com.mayzax.companion`; download `GoogleService-Info.plist` → place in `mobile/ios/MayzaxCompanion/GoogleService-Info.plist` (after `prebuild`).
3. **Service account**:
   - Project settings → Service accounts → **Generate new private key**. Download the JSON file.
   - Either base64-encode it and put in `FIREBASE_SERVICE_ACCOUNT_JSON`, or place the file on the backend server and set `FIREBASE_SERVICE_ACCOUNT_PATH` to its absolute path.
4. **APNs** (iOS): in Firebase → Project settings → Cloud Messaging → upload your APNs key (.p8) + Key ID + Team ID.
5. **Expo Push / FCM**: you don't need a separate Expo Push account if you set `useNextNotificationsApi: true` (already set in `app.json`). Expo will use FCM for Android.

### Notification Channels (Android)
Created automatically by the app:
- `mayzax_attendance` (HIGH importance — for break/shift reminders)
- `mayzax_announcements`
- `mayzax_default`

---

## 3. Expo/EAS Initial Setup (one-time per dev machine)

```bash
npm install -g eas-cli
eas login
cd mobile
eas build:configure
```

This creates/updates `eas.json`.

### Build profiles (already configured)

- `development` — development client APK/IPA for testing
- `preview` — internal-test APK (no Play Store upload)
- `production` — AAB for Play Store

Overrides: you can override `EXPO_PUBLIC_API_BASE_URL` per profile in `eas.json`.

---

## 4. Building an APK (Internal Testing)

```bash
cd mobile
npm install
# For Android preview (APK):
eas build -p android --profile preview
```

- EAS emails you a download link when the build completes.
- Install the APK directly on devices (`adb install app.apk`) or distribute via Google Drive/internal link.

### Building locally (optional)

Requires Android SDK + JDK 17:

```bash
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
# APK: app/build/outputs/apk/release/app-release.apk
```

### Building for iOS

```bash
eas build -p ios --profile preview
```

TestFlight requires a production profile with proper credentials configured in EAS.

---

## 5. Google Play Store Publishing

1. Create a Google Play developer account ($25 one-time).
2. Create the app in Play Console.
3. Build a production AAB:
   ```bash
   eas build -p android --profile production
   ```
4. Upload the `.aab` to Play Console → Internal testing → promote to Closed/Open/Production.
5. Fill in store listing:
   - Title: Mayzax Companion
   - Short/long descriptions
   - Screenshots (phone 6.5" + tablet 10")
   - Icon: use `mobile/assets/icon.png` (1024×1024)
   - Feature graphic
   - Privacy policy URL
   - Data safety form (declare data collected: email, name, employee ID, attendance history, device push token).
6. Roll out.

---

## 6. Redis / BullMQ

The backend uses BullMQ (when `REDIS_URL` is set) for:
- Break reminders at 5 min, 2 min, and expiry.
- Shift-end reminders at 15 min and 5 min.
- Daily attendance rollup job (15 minutes after shift end).
- Notification dispatch fan-out to all device tokens.

If `REDIS_URL` is not provided, jobs run in-process via `node-cron` (dev fallback, **not** durable across restarts).

Self-hosted Redis or a managed service (e.g. Upstash, Render Redis) works. For most companies with <1000 employees even a small 256MB Redis is plenty.

---

## 7. Default Shift Configuration

After the migration, seed a default shift with `npm run seed` (or via Prisma Studio). Fields on `ShiftConfig`:

| Field | Purpose |
|---|---|
| `name` | Label (e.g. "Night Shift IST") |
| `startHour/startMinute` | Shift start in the shift config's `timezone` |
| `endHour/endMinute` | Shift end (supports overnight night-shifts, e.g. 19:30 → 07:30) |
| `shortBreakAllowedSec` | Allowed short break seconds (30 min default) |
| `dinnerBreakAllowedSec` | Allowed dinner seconds (60 min) |
| `briefingAllowedSec` / `meetingAllowedSec` | Other break types |
| `expectedWorkSeconds` | Expected productive seconds in a day (9h default) |
| `lateGraceMinutes` | Grace period before marking late |
| `earlyGraceMinutes` | Grace period before marking early logout |
| `penaltyPerLateMinute` | Penalty minutes per late minute (informational) |

Overrides can be assigned per user via `User.shiftConfigId`.

---

## 8. Security Checklist Before Production

- [ ] Backend runs behind HTTPS only (TLS 1.2+).
- [ ] `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are strong, rotated periodically.
- [ ] `DATABASE_URL` uses a dedicated DB user with least privilege.
- [ ] Redis is password-protected and not exposed publicly.
- [ ] Firebase service account file is not committed to Git (add to `.gitignore`).
- [ ] Mobile API URL is a production HTTPS endpoint.
- [ ] `COOKIE_SECURE=true`, `CROSS_SITE_COOKIES=true` if frontend/backend are on different domains (mobile does not use cookies).
- [ ] Firebase Cloud Messaging server key is not stored in the mobile app.
- [ ] EAS secrets configured for any sensitive build-time env vars.
- [ ] Android release build signed with a Play App Signing key (managed automatically by EAS/Play).

---

## 9. Operational Notes

**Reminders only fire for active web sessions.** Since the mobile app cannot start/end breaks or attendance, break reminders are scheduled by the backend whenever a desktop-initiated status change happens (see `activity.service.changeStatus`). Even employees who are not currently viewing the dashboard will get reminders as long as their web session is active; if they've logged out of the desktop CMS, no reminders fire (no active break to remind about).

**Fan-out / FCM cleanup.** Invalid/expired FCM tokens are automatically pruned when FCM returns `registration-token-not-registered`. If a user uninstalls the app they won't get further notifications.

**Rollups.** Every day 15 minutes after the configured shift end, per-user `AttendanceDay` records are upserted. History pages read these rollups for fast calendar rendering. The "today" endpoint always computes live from `activity_logs`.

---

## 10. Troubleshooting

- **Notifications not received**
  1. Check that the device registered: backend `DeviceToken` table should have a row for the user.
  2. Check that Firebase service account is valid (backend logs will show `Firebase Admin initialized successfully`).
  3. Check notification channel is enabled on the device (Settings → Apps → Mayzax → Notifications).
- **App shows "Network error" immediately after login**
  - Verify `EXPO_PUBLIC_API_BASE_URL` is reachable from the device (try opening `/health` in Chrome on the device).
- **Token refresh loop**
  - Ensure backend clock is correct; check refresh token row in DB is not revoked.
- **Break countdown shows wrong time**
  - The countdown is driven by server-provided `expiresAt`. If device clock drifts, open phone Settings → Date & time → Automatic.
