import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import type { AcquiredToken } from './token-lifecycle';

export async function acquirePushToken(requestPermission = true): Promise<AcquiredToken> {
  if (!Device.isDevice) return { state: 'unsupported' };
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient || typeof projectId !== 'string' || !projectId) {
    return { state: 'not-configured' };
  }
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('deliveries', {
      name: 'Delivery updates', importance: AndroidImportance.DEFAULT,
    });
  }
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && requestPermission) permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return { state: 'denied' };
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return { state: 'ready', token: token.data };
}
export function watchNotificationTaps(onTap: (data: unknown) => void) {
  Notifications.setNotificationHandler({ handleNotification: async () => ({
    shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false,
  }) });
  let active = true;
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    if (active) onTap(response.notification.request.content.data);
  });
  void Notifications.getLastNotificationResponseAsync().then(response => {
    if (active && response) onTap(response.notification.request.content.data);
  }).catch(() => {});
  return () => { active = false; subscription.remove(); };
}
export function watchPushTokenChanges(onChange: () => void) {
  const subscription = Notifications.addPushTokenListener(onChange);
  return () => subscription.remove();
}
