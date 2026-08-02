import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import { getApi } from './api';
import type { Device as DeviceDto } from '@/types/api';

export async function registerDevice(fcmToken: string): Promise<{ id: string }> {
  const api = await getApi();
  const platform = Platform.OS === 'ios' ? 'IOS' : Platform.OS === 'android' ? 'ANDROID' : 'WEB';
  const body = {
    fcmToken,
    platform,
    deviceName: Device.deviceName ?? Device.modelName ?? 'Unknown device',
    deviceModel: Device.modelName ?? null,
    appVersion: Application.nativeApplicationVersion ?? null,
    osVersion: Device.osVersion ?? null,
    pushToken: fcmToken,
  };
  const res = await api.post('/devices/register', body);
  return res as unknown as { id: string };
}

export async function listDevices(): Promise<DeviceDto[]> {
  const api = await getApi();
  const res = await api.get('/devices');
  return res as unknown as DeviceDto[];
}

export async function removeDevice(id: string): Promise<void> {
  const api = await getApi();
  await api.delete(`/devices/${id}`);
}
