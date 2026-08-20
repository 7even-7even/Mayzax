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
      let p = path.resolve(process.cwd(), env.FIREBASE_SERVICE_ACCOUNT_PATH);
      if (!fs.existsSync(p)) {
        // Fallback: try resolving under 'backend' if running from workspace root
        p = path.resolve(process.cwd(), 'backend', env.FIREBASE_SERVICE_ACCOUNT_PATH);
      }
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
    const { initializeApp, cert } = require('firebase-admin');
    fb = initializeApp({
      credential: cert(serviceAccount),
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
  // If the token is an Expo Push Token, route through Expo's Push API
  if (payload.token.startsWith('ExponentPushToken[') || payload.token.startsWith('ExpoPushToken[')) {
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          to: payload.token,
          title: payload.title,
          body: payload.body,
          data: payload.data ?? {},
          sound: 'default',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `Expo API error: ${errorText}` };
      }

      const result = await response.json() as any;
      const data = result.data;
      if (data && data.status === 'error') {
        const isDeviceNotRegistered = data.details?.error === 'DeviceNotRegistered';
        return { 
          success: false, 
          invalidToken: isDeviceNotRegistered, 
          error: data.message 
        };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message ?? String(err) };
    }
  }

  // Fallback to standard Firebase push for native FCM tokens
  const app = getFirebaseApp();
  if (!app) return { success: false, error: 'firebase-not-configured' };

  try {
    const { getMessaging } = require('firebase-admin/messaging');
    await getMessaging().send({
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
