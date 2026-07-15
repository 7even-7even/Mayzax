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

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(20),

  LOG_LEVEL: z.string().default('info'),
  LOGS_DIR: z.string().default('logs'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = { ...parsed.data };

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
