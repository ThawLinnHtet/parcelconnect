import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';

import { DemoProvider } from '@/features/demo/demo-provider';
import type { Actor, DeliveryGateway } from '@/features/deliveries';
import { DeliveryError } from '@/features/deliveries/types';
import { createSupabaseGateway } from '@/features/deliveries/supabase-gateway';
import { getSupabaseClient } from '@/lib/supabase/client';

import { useAuth } from './auth-provider';

type ConnectionContextValue = { mode: 'mock' | 'connected'; useMock: () => void; useConnected: () => void; canEnterProduct: boolean };
const ConnectionContext = createContext<ConnectionContextValue | null>(null);
const noIdentity: Actor = { id: '', role: 'sender' };
const unavailable = async (): Promise<never> => { throw new DeliveryError('forbidden', 'Connected mode requires a verified signed-in account.'); };
const blockedGateway: DeliveryGateway = {
  mode: 'connected', listPeople: unavailable, listDeliveries: unavailable, listAvailableJobs: unavailable,
  getDelivery: unavailable, execute: unavailable, issueHandoffCode: unavailable,
  listNotifications: unavailable, markNotificationRead: unavailable,
};

/** Mode is an explicit user choice. A failed connection cannot become a mock success. */
export function ConnectionProvider({ children }: PropsWithChildren) {
  const auth = useAuth();
  const [mode, setMode] = useState<'mock' | 'connected'>('mock');
  const userId = auth.user?.id;
  const connectedGateway = useMemo(() => auth.status === 'signedIn' && userId
    ? createSupabaseGateway(getSupabaseClient()) : blockedGateway, [auth.status, userId]);
  const canEnterProduct = mode === 'mock' || auth.status === 'signedIn';
  return <ConnectionContext.Provider value={{ mode, useMock: () => setMode('mock'), useConnected: () => setMode('connected'), canEnterProduct }}>
    <DemoProvider key={`${mode}:${mode === 'connected' ? userId ?? 'signed-out' : 'demo'}`}
      gateway={mode === 'connected' ? connectedGateway : undefined}
      actor={mode === 'connected' ? auth.actor ?? noIdentity : undefined}>
      {children}
    </DemoProvider>
  </ConnectionContext.Provider>;
}

export function useConnection() {
  const value = useContext(ConnectionContext);
  if (!value) throw new Error('useConnection must be used inside ConnectionProvider');
  return value;
}
