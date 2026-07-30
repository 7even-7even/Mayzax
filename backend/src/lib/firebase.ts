/**
 * Firebase Cloud Messaging client. Lazily initialized when a service account
 * is configured; otherwise push dispatch becomes a no-op (in-app notifications
 * still work).
 */
import fs from 'fs';
import path from 'path';
import { env, isDevelopment } from '@/config/env';
import { logger } from './logger';

let fb: any = null;
let initAttempted = false;

function readServiceAccount(): any | null {
  try {
    if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const raw = env.FIREBASE_SERVICE_ACCOUNT_JSON.trim();
      // Allow base64-encoded strings for deployment convenience
      if (raw.startsWith('{')) return JSON.parse(raw);
      return JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
    }
    if (env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const p = path.resolve(process.cwd(), env.FIREBASE_SERVICE_ACCOUNT_PATH);
      if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
  } catch (err) {
    logger.error({ err }, 'Failed to read Firebase service account');
  }
  return null;
}

export function getFirebaseApp(): any | null {
  if (initAttempted) return fb;
  initAttempted = true;
  const serviceAccount = readServiceAccount();
  if (!serviceAccount) {
    if (!isDevelopment) {
      logger.warn(
        'Firebase service account not configured — push notifications will be disabled. ' +
          'Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH.',
      );
    } else {
      logger.info('Firebase not configured (dev mode) — push notifications disabled.');
    }
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const admin = require('firebase-admin');
    fb = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      ...(env.FIREBASE_DATABASE_URL ? { databaseURL: env.FIREBASE_DATABASE_URL } : {}),
    });
    logger.info('Firebase Admin initialized successfully');
  } catch (err) {
    logger.error({ err }, 'Failed to initialize Firebase Admin');
    fb = null;
  }
  return fb;
}

export interface PushPayload {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  androidChannelId?: string;
}

export interface PushResult {
  success: boolean;
  invalidToken?: boolean;
  error?: string;
}

/**
 * Send a single push message. Returns a result indicating success and
 * whether the token should be pruned.
 */
export async function sendPush(payload: PushPayload): Promise<PushResult> {
  const app = getFirebaseApp();
  if (!app) return { success: false, error: 'firebase-not-configured' };

  try {
    const admin = require('firebase-admin');
    await admin.messaging().send({
      token: payload.token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data ?? {},
      android: {
        channelId: payload.androidChannelId ?? 'mayzax_default',
        priority: 'high',
        notification: {
          channelId: payload.androidChannelId ?? 'mayzax_default',
          priority: 'high',
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    });
    return { success: true };
  } catch (err: any) {
    const code = err?.code ?? err?.errorInfo?.code;
    const invalidToken =
      code === 'messaging/invalid-argument' ||
      code === 'messaging/registration-token-not-registered' ||
      code === 'messaging/invalid-registration-token' ||
      code === 'messaging/sender-id-mismatch';
    logger.warn({ err: err?.message, code, invalidToken }, 'FCM send failed');
    return { success: false, invalidToken, error: err?.message ?? String(err) };
  }
}
