import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from 'react';

import { createMockGateway, DEMO_ACTORS } from '@/features/deliveries';
import type { Actor, BookingInput, DeliveryGateway } from '@/features/deliveries';

type DemoContextValue = {
  gateway: DeliveryGateway; actor: Actor; setActor: (actor: Actor) => void;
  revision: number; refresh: () => void; reset: () => Promise<void>;
  draft: BookingInput | null; setDraft: (draft: BookingInput | null) => void;
};
const DemoContext = createContext<DemoContextValue | null>(null);

/** Mock perspective changes are never a substitute for a connected auth session. */
export function DemoProvider({ children, gateway: overrideGateway, actor: overrideActor }: PropsWithChildren<{
  gateway?: DeliveryGateway; actor?: Actor;
}>) {
  const [mockGateway] = useState(() => createMockGateway());
  const [mockActor, setMockActor] = useState<Actor>(DEMO_ACTORS.sender);
  const [revision, setRevision] = useState(0);
  const [storedDraft, storeDraft] = useState<{ actorId: string; mode: DeliveryGateway['mode']; value: BookingInput } | null>(null);
  const gateway = overrideGateway ?? mockGateway;
  const actor = overrideActor ?? mockActor;
  const draft = storedDraft?.actorId === actor.id && storedDraft.mode === gateway.mode ? storedDraft.value : null;
  const setDraft = useCallback((value: BookingInput | null) => storeDraft(value ? { actorId: actor.id, mode: gateway.mode, value } : null), [actor.id, gateway.mode]);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => gateway.subscribe?.(refresh), [gateway, refresh]);
  const setActor = useCallback((next: Actor) => {
    if (gateway.mode === 'mock') setMockActor(next);
  }, [gateway.mode]);
  const reset = useCallback(async () => {
    if (gateway.mode !== 'mock' || !gateway.resetDemo) return;
    await gateway.resetDemo(); storeDraft(null); setMockActor(DEMO_ACTORS.sender); refresh();
  }, [gateway, refresh]);
  return <DemoContext.Provider value={{ gateway, actor, setActor, revision, refresh, reset, draft, setDraft }}>
    {children}
  </DemoContext.Provider>;
}
export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error('The product screens require DemoProvider.');
  return context;
}
