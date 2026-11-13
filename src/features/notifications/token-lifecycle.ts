/** Native and backend IO are injected so account-switch races can be tested. */
export interface DeviceTokenApi {
  currentUserId(): string | null;
  register(deviceId: string, token: string): Promise<void>;
  unregister(deviceId: string): Promise<void>;
}
export type PushRegistration =
  | { state: 'registered'; userId: string; deviceId: string }
  | { state: 'denied' | 'unsupported' | 'not-configured' };
export type AcquiredToken = { state: 'ready'; token: string } | Exclude<PushRegistration, { state: 'registered' }>;

export function createTokenLifecycle(api: DeviceTokenApi) {
  let generation = 0;
  let queue: Promise<unknown> = Promise.resolve();
  let bound: { userId: string; deviceId: string; token: string } | null = null;
  const serial = <T>(operation: () => Promise<T>): Promise<T> => {
    const task = queue.then(operation, operation);
    queue = task.catch(() => {});
    return task;
  };
  return {
    register(userId: string, deviceId: string, acquire: () => Promise<AcquiredToken>) {
      const epoch = ++generation;
      return serial(async (): Promise<PushRegistration> => {
        if (api.currentUserId() !== userId || epoch !== generation) throw new Error('Session changed before push registration.');
        const result = await acquire();
        if (api.currentUserId() !== userId || epoch !== generation) throw new Error('Session changed during push registration.');
        if (result.state !== 'ready') return result;
        if (!isExpoPushToken(result.token)) throw new Error('The device returned an invalid Expo push token.');
        if (bound?.userId !== userId || bound.deviceId !== deviceId || bound.token !== result.token) {
          await api.register(deviceId, result.token);
          // Disconnect queues after this task and removes the registration even if
          // the session changes while the backend request is in flight.
          bound = { userId, deviceId, token: result.token };
        }
        return { state: 'registered', userId, deviceId };
      });
    },
    disconnect() {
      ++generation;
      return serial(async () => {
        if (!bound) return;
        if (api.currentUserId() !== bound.userId) {
          throw new Error('The previous session ended before its push token could be removed.');
        }
        await api.unregister(bound.deviceId);
        bound = null;
      });
    },
  };
}

export function isExpoPushToken(value: unknown): value is string {
  return typeof value === 'string' && /^(ExpoPushToken|ExponentPushToken)\[[A-Za-z0-9_\-]+\]$/.test(value);
}

export interface DeliveryNotificationTarget { deliveryId: string; notificationId: string }
/** Accept identifiers only; arbitrary URLs and handoff codes are never routed. */
export function parseDeliveryNotification(data: unknown): DeliveryNotificationTarget | null {
  if (!data || typeof data !== 'object') return null;
  const value = data as Record<string, unknown>;
  const identifier = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
  if (typeof value.deliveryId !== 'string' || !identifier.test(value.deliveryId)
    || typeof value.notificationId !== 'string' || !identifier.test(value.notificationId)) return null;
  return { deliveryId: value.deliveryId, notificationId: value.notificationId };
}

export async function resolveNotificationTarget(
  data: unknown,
  authorize: (deliveryId: string) => Promise<unknown>,
): Promise<DeliveryNotificationTarget | null> {
  const target = parseDeliveryNotification(data);
  if (!target) return null;
  // The gateway must load through current-session authorization, never a local
  // role switcher. A denial remains a denial and cannot open cached private data.
  await authorize(target.deliveryId);
  return target;
}
