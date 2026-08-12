import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  API_PREFIX: z.string().default('/api/v1'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  // Comma-separated list of additional allowed CORS origins, e.g. Vercel
  // preview deployment URLs: "https://mayzax-ats-git-foo.vercel.app,https://mayzax-ats-pr-12.vercel.app"
  ADDITIONAL_CORS_ORIGINS: z.string().optional(),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().optional(),

  JWT_ACCESS_SECRET: z.string().min(10, 'JWT_ACCESS_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(10, 'JWT_REFRESH_SECRET is required'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: z.coerce.boolean().default(false),
  // Set to "true" when the frontend and backend are deployed on different
  // domains (e.g. frontend on Vercel, backend on Render) so auth cookies are
  // sent cross-site. Cross-site cookies REQUIRE Secure + SameSite=None, so
  // this also forces COOKIE_SECURE behavior on regardless of COOKIE_SECURE.
  CROSS_SITE_COOKIES: z.coerce.boolean().default(false),

  BUSINESS_SHIFT_START_HOUR: z.coerce.number().default(18),
  BUSINESS_SHIFT_START_MINUTE: z.coerce.number().default(0),
  BUSINESS_SHIFT_END_HOUR: z.coerce.number().default(9),
  BUSINESS_SHIFT_END_MINUTE: z.coerce.number().default(0),
  BUSINESS_TIMEZONE: z.string().default('Asia/Kolkata'),

  // Default shift policy (used when no per-user / named ShiftConfig is set)
  DEFAULT_SHORT_BREAK_SECONDS: z.coerce.number().default(30 * 60), // 30 min
  DEFAULT_DINNER_BREAK_SECONDS: z.coerce.number().default(60 * 60), // 60 min
  DEFAULT_BRIEFING_SECONDS: z.coerce.number().default(15 * 60),
  DEFAULT_MEETING_SECONDS: z.coerce.number().default(30 * 60),
  DEFAULT_SYSTEM_ISSUE_SECONDS: z.coerce.number().default(0), // 0 = unlimited
  DEFAULT_SHIFT_DURATION_SECONDS: z.coerce.number().default(9 * 60 * 60), // 9 hours
  DEFAULT_LATE_GRACE_MINUTES: z.coerce.number().default(15),
  DEFAULT_EARLY_GRACE_MINUTES: z.coerce.number().default(15),
  DEFAULT_PENALTY_PER_LATE_MINUTE: z.coerce.number().default(0),

  // Redis for BullMQ. If missing, reminders fall back to node-cron in-process.
  REDIS_URL: z.string().optional(),

  // Firebase Admin SDK for push notifications.
  // Either provide the service account JSON as a string (base64 or raw),
  // or a path to the JSON file.
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().optional(),
  FIREBASE_DATABASE_URL: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(20),

  // Verification Engine v2 - HMAC secret for hashing evidence (required in production)
  VERIFICATION_HMAC_SECRET: z.string().min(16).default('dev-verification-secret-change-in-production-32chars'),
  REQUIRE_HASH_FOR_VERIFIED: z.coerce.boolean().default(false),
  MIN_EXTENSION_VERSION: z.string().default('2.0.0'),
  VERIFICATION_TIMESTAMP_TOLERANCE_MS: z.coerce.number().default(5 * 60 * 1000), // 5min
  VERIFICATION_HASH_TTL_MS: z.coerce.number().default(24 * 60 * 60 * 1000), // 24h
  VERIFICATION_THRESHOLD: z.coerce.number().default(60),

  LOG_LEVEL: z.string().default('info'),
  LOGS_DIR: z.string().default('logs'),
});

const parsed = envSchema.safeParse(process.env);

let envData: any;
if (!parsed.success) {
  if (process.env.NODE_ENV === 'test') {
    console.warn('⚠️ Invalid env in test, using defaults');
    // Provide minimal defaults for test
    envData = {
      NODE_ENV: 'test',
      PORT: 4000,
      API_PREFIX: '/api/v1',
      CLIENT_URL: 'http://localhost:5173',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      DIRECT_URL: undefined,
      JWT_ACCESS_SECRET: 'test-access-secret-min-10-chars-long-for-test',
      JWT_REFRESH_SECRET: 'test-refresh-secret-min-10-chars-long-for-test',
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
      COOKIE_DOMAIN: undefined,
      COOKIE_SECURE: false,
      CROSS_SITE_COOKIES: false,
      BUSINESS_SHIFT_START_HOUR: 18,
      BUSINESS_SHIFT_START_MINUTE: 0,
      BUSINESS_SHIFT_END_HOUR: 9,
      BUSINESS_SHIFT_END_MINUTE: 0,
      BUSINESS_TIMEZONE: 'Asia/Kolkata',
      DEFAULT_SHORT_BREAK_SECONDS: 1800,
      DEFAULT_DINNER_BREAK_SECONDS: 3600,
      DEFAULT_BRIEFING_SECONDS: 900,
      DEFAULT_MEETING_SECONDS: 1800,
      DEFAULT_SYSTEM_ISSUE_SECONDS: 0,
      DEFAULT_SHIFT_DURATION_SECONDS: 32400,
      DEFAULT_LATE_GRACE_MINUTES: 15,
      DEFAULT_EARLY_GRACE_MINUTES: 15,
      DEFAULT_PENALTY_PER_LATE_MINUTE: 0,
      REDIS_URL: undefined,
      FIREBASE_SERVICE_ACCOUNT_JSON: undefined,
      FIREBASE_SERVICE_ACCOUNT_PATH: undefined,
      FIREBASE_DATABASE_URL: undefined,
      FIREBASE_PROJECT_ID: undefined,
      RATE_LIMIT_WINDOW_MS: 900000,
      RATE_LIMIT_MAX: 300,
      AUTH_RATE_LIMIT_MAX: 20,
      VERIFICATION_HMAC_SECRET: 'test-verification-secret-32-chars-long-for-test',
      REQUIRE_HASH_FOR_VERIFIED: false,
      MIN_EXTENSION_VERSION: '2.0.0',
      VERIFICATION_TIMESTAMP_TOLERANCE_MS: 300000,
      VERIFICATION_HASH_TTL_MS: 86400000,
      VERIFICATION_THRESHOLD: 60,
      LOG_LEVEL: 'info',
      LOGS_DIR: 'logs',
    };
  } else {
    // eslint-disable-next-line no-console
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
} else {
  envData = parsed.data;
}

export const env = { ...envData };

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';

export function reloadEnv() {
  dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });
  const parsed = envSchema.safeParse(process.env);
  if (parsed.success) {
    Object.assign(env, parsed.data);
    // eslint-disable-next-line no-console
    console.log('🔄 Environment variables reloaded successfully from .env');
  } else {
    // eslint-disable-next-line no-console
    console.error('❌ Failed to reload environment variables:', parsed.error.flatten().fieldErrors);
  }
}

// Watch the .env file for changes in non-production environments
if (!isProduction) {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    let watchTimeout: NodeJS.Timeout | null = null;
    fs.watch(envPath, (eventType) => {
      if (eventType === 'change') {
        if (watchTimeout) clearTimeout(watchTimeout);
        watchTimeout = setTimeout(() => {
          reloadEnv();
        }, 100);
      }
    });
  }
}
