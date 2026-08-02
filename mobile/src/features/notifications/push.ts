import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { secureStorage } from '@/storage/secure';
import { registerDevice } from '@/services/devices';
import { ensureChannels, channelIdForType } from './channels';

// How to display notifications when app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let notificationListener: any = null;
let responseListener: any = null;

type NavigateFn = (screen: string, params?: Record<string, any>) => void;
let navigate: NavigateFn | null = null;

export function setNavigateHandler(fn: NavigateFn) {
  navigate = fn;
}

function handleNotificationData(data: Record<string, any>) {
  if (!data || !navigate) return;
  const screen = data.screen;
  if (typeof screen === 'string') {
    const params: Record<string, any> = {};
    if (data.notificationId) params.notificationId = data.notificationId;
    if (data.date) params.date = data.date;
    if (screen === 'NotificationDetail') params.notificationId = data.notificationId;
    navigate(screen, params);
  }
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return null;
    if (!Device.isDevice) {
      // FCM/APNS won't work on emulator reliably; still try but don't block.
    }
    await ensureChannels();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants.manifest2 as any)?.extra?.eas?.projectId;

    let token: string | null = null;
    if (Platform.OS === 'android') {
      const deviceTokenData = await Notifications.getDevicePushTokenAsync().catch(() => null);
      token = deviceTokenData?.data ?? null;
    } else {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      }).catch(() => null);
      token = tokenData?.data ?? null;
    }

    if (token) {
      await secureStorage.setFcmToken(token);
      try {
        await registerDevice(token);
      } catch (err) {
        // Don't fail startup if backend is unreachable; next app launch will retry.
      }
    }
    return token;
  } catch {
    return null;
  }
}

export async function unregisterForPushNotifications() {
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch {}
}

export function attachNotificationListeners() {
  detachNotificationListeners();

  // Listen to incoming notifications while app is foregrounded
  notificationListener = Notifications.addNotificationReceivedListener(() => {
    // React Query refetch will update the notifications list via useFocusEffect if needed;
    // nothing else required.
  });

  // Listen to user tapping a notification
  responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data ?? {};
    handleNotificationData(data as Record<string, any>);
  });
}

export function detachNotificationListeners() {
  if (notificationListener) notificationListener.remove();
  if (responseListener) responseListener.remove();
  notificationListener = null;
  responseListener = null;
}

/** Used when receiving a push while foregrounded to build a local notification if needed. */
export async function presentLocalNotification(params: {
  title: string;
  body: string;
  data?: Record<string, any>;
  type?: string;
}) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: params.title,
        body: params.body,
        data: params.data ?? {},
        sound: 'default',
        ...(Platform.OS === 'android' ? { channelId: channelIdForType(params.type) } : {}),
      },
      trigger: null,
    });
  } catch {}
}
