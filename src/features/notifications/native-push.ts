import type { AcquiredToken } from './token-lifecycle';

export async function acquirePushToken(_requestPermission = true): Promise<AcquiredToken> {
  return { state: 'unsupported' };
}
export function watchNotificationTaps(_onTap: (data: unknown) => void) { return () => {}; }
export function watchPushTokenChanges(_onChange: () => void) { return () => {}; }
