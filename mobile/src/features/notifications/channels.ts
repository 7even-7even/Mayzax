import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const CHANNELS = {
  default: {
    id: 'mayzax_default',
    name: 'General',
    importance: Notifications.AndroidImportance.DEFAULT,
  },
  attendance: {
    id: 'mayzax_attendance',
    name: 'Attendance & Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250] as number[],
    sound: 'default' as any,
  },
  announcements: {
    id: 'mayzax_announcements',
    name: 'Company Announcements',
    importance: Notifications.AndroidImportance.DEFAULT,
  },
} as const;

export async function ensureChannels() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNELS.default.id, {
    name: CHANNELS.default.name,
    importance: CHANNELS.default.importance,
  });
  await Notifications.setNotificationChannelAsync(CHANNELS.attendance.id, {
    name: CHANNELS.attendance.name,
    importance: CHANNELS.attendance.importance,
    vibrationPattern: CHANNELS.attendance.vibrationPattern,
    sound: CHANNELS.attendance.sound,
  });
  await Notifications.setNotificationChannelAsync(CHANNELS.announcements.id, {
    name: CHANNELS.announcements.name,
    importance: CHANNELS.announcements.importance,
  });
}

export function channelIdForType(type?: string): string {
  switch (type) {
    case 'BREAK_5MIN':
    case 'BREAK_2MIN':
    case 'BREAK_EXPIRED':
    case 'SHIFT_ENDING_15MIN':
    case 'SHIFT_ENDING_5MIN':
    case 'SHIFT_START_REMINDER':
    case 'ATTENDANCE_REMINDER':
    case 'PENALTY_NOTICE':
      return CHANNELS.attendance.id;
    case 'COMPANY_NOTICE':
      return CHANNELS.announcements.id;
    default:
      return CHANNELS.default.id;
  }
}
