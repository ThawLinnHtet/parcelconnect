import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';

import { useAuth } from '@/features/auth/auth-provider';
import { useConnection } from '@/features/auth/connection-provider';
import { registerBeforeSignOut } from '@/features/auth/session-lifecycle';
import { createConnectedApi } from '@/features/deliveries/supabase-gateway';
import { useDemo } from '@/features/demo/demo-provider';
import { getSupabaseClient } from '@/lib/supabase/client';

import { acquirePushToken, watchNotificationTaps, watchPushTokenChanges } from './native-push';
import { createTokenLifecycle, resolveNotificationTarget } from './token-lifecycle';

type PushStatus = 'idle' | 'busy' | 'registered' | 'denied' | 'unsupported' | 'not-configured' | 'error';
type PushContextValue = { status: PushStatus; message: string; enable(): Promise<void>; disable(): Promise<void> };
const PushContext = createContext<PushContextValue | null>(null);
const deviceKey = 'parcelconnect.push.installation.v1';
async function installationId() {
  const existing = await AsyncStorage.getItem(deviceKey);
  if (existing) return existing;
  const id = randomUUID(); await AsyncStorage.setItem(deviceKey, id); return id;
}
const messages: Record<PushStatus, string> = {
  idle: 'Your in-app inbox is available even when remote alerts are off.',
  busy: 'Updating this device’s notification registration…',
  registered: 'This device is registered. Push delivery still depends on platform credentials and network availability.',
  denied: 'Notifications were not allowed. All delivery requests remain available in your inbox.',
  unsupported: 'Remote push needs a physical Android or iOS device. The inbox works here.',
  'not-configured': 'Use a development build with an EAS project ID and platform push credentials to enable remote alerts.',
  error: 'The device could not be updated. Try again before signing out.',
};

/** Must be inside AuthProvider, ConnectionProvider and its DemoProvider. */
export function PushProvider({ children }: PropsWithChildren) {
  const auth = useAuth();
  const { mode } = useConnection();
  const demo = useDemo();
  const authRef = useRef(auth); authRef.current = auth;
  const operation = useRef(0);
  const [status, setStatus] = useState<PushStatus>('idle');
  const [message, setMessage] = useState(messages.idle);
  const [pendingTap, setPendingTap] = useState<unknown>(null);
  const seen = useRef(new Set<string>());
  const mounted = useRef(true);
  const [lifecycle] = useState(() => createTokenLifecycle({
    currentUserId: () => authRef.current.user?.id ?? null,
    register: async (deviceId, token) => {
      const actor = authRef.current.actor;
      if (!actor) throw new Error('Sign in before enabling notifications.');
      await createConnectedApi(getSupabaseClient()).request(actor, 'register_push_token', { deviceId, token });
    },
    unregister: async deviceId => {
      const actor = authRef.current.actor;
      if (!actor) throw new Error('The previous account must be signed in to remove its device token.');
      await createConnectedApi(getSupabaseClient()).request(actor, 'unregister_push_token', { deviceId });
    },
  }));
  const show = useCallback((next: PushStatus, detail = messages[next]) => {
    if (mounted.current) { setStatus(next); setMessage(detail); }
  }, []);
  const disable = useCallback(async () => {
    const request = ++operation.current;
    show('busy');
    try {
      await lifecycle.disconnect();
      if (request === operation.current) show('idle');
    } catch (error) {
      if (request === operation.current) show('error', error instanceof Error ? error.message : messages.error);
      throw error;
    }
  }, [lifecycle, show]);
  const enable = useCallback(async () => {
    const userId = authRef.current.user?.id;
    if (mode !== 'connected' || !userId) { show('idle', 'Sign in to connected mode before enabling remote alerts.'); return; }
    const request = ++operation.current;
    show('busy');
    try {
      const deviceId = await installationId();
      if (request !== operation.current || authRef.current.user?.id !== userId) return;
      const result = await lifecycle.register(userId, deviceId, () => acquirePushToken(true));
      if (request === operation.current) show(result.state);
    } catch (error) {
      if (request === operation.current) show('error', error instanceof Error ? error.message : messages.error);
    }
  }, [lifecycle, mode, show]);
  useEffect(() => {
    mounted.current = true;
    const unsubscribe = registerBeforeSignOut(async () => { await disable(); seen.current.clear(); setPendingTap(null); });
    const stop = watchNotificationTaps(setPendingTap);
    return () => { mounted.current = false; ++operation.current; unsubscribe(); stop(); };
  }, [disable]);
  useEffect(() => {
    if (mode !== 'connected') { void disable().catch(() => {}); return; }
    return watchPushTokenChanges(() => {
      // Token rotation does not prompt; only refresh a previously granted token.
      const userId = authRef.current.user?.id;
      if (!userId || status !== 'registered') return;
      void installationId().then(deviceId => lifecycle.register(userId, deviceId, () => acquirePushToken(false)))
        .catch(error => show('error', error instanceof Error ? error.message : messages.error));
    });
  }, [mode, lifecycle, disable, show, status]);
  useEffect(() => {
    if (mode !== 'connected' || auth.status !== 'signedIn' || !auth.user || !pendingTap || demo.gateway.mode !== 'connected') return;
    let active = true;
    const userId = auth.user.id;
    void resolveNotificationTarget(pendingTap, deliveryId => demo.gateway.getDelivery(demo.actor, deliveryId)).then(async target => {
      if (!active || authRef.current.user?.id !== userId) return;
      setPendingTap(null);
      if (!target) return;
      const key = `${userId}:${target.notificationId}`;
      if (seen.current.has(key)) return;
      seen.current.add(key);
      try { await demo.gateway.markNotificationRead(demo.actor, target.notificationId); } catch { /* Detail will reauthorize on load. */ }
      if (active && authRef.current.user?.id === userId) router.push({ pathname: '/deliveries/[id]', params: { id: target.deliveryId } });
    }).catch(() => {
      if (active) { setPendingTap(null); show('error', 'This delivery is no longer available to the signed-in account.'); }
    });
    return () => { active = false; };
  }, [pendingTap, auth.status, auth.user, mode, demo.gateway, demo.actor, show]);
  return <PushContext.Provider value={{ status, message, enable, disable }}>{children}</PushContext.Provider>;
}
export function usePushNotifications() {
  const context = useContext(PushContext);
  if (!context) throw new Error('Push controls require PushProvider.');
  return context;
}
