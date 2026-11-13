export class SessionChangedError extends Error {
  constructor() { super('Your account changed while this request was running. Please try again.'); this.name = 'SessionChangedError'; }
}
export type SessionStamp = Readonly<{ userId: string; revision: number }>;

/** Invalidates in-flight reads and subscriptions without retaining account data. */
export class SessionScope {
  private userId: string | null = null;
  private revision = 0;
  private cleanups = new Set<() => void>();

  setIdentity(userId: string | null) {
    if (userId === this.userId) return;
    this.userId = userId; this.revision += 1;
    const cleanups = [...this.cleanups]; this.cleanups.clear();
    for (const cleanup of cleanups) cleanup();
  }
  capture(userId: string): SessionStamp {
    if (this.userId !== userId) throw new SessionChangedError();
    return { userId, revision: this.revision };
  }
  assertCurrent(stamp: SessionStamp) {
    if (stamp.userId !== this.userId || stamp.revision !== this.revision) throw new SessionChangedError();
  }
  onInvalidate(cleanup: () => void) {
    this.cleanups.add(cleanup);
    return () => { this.cleanups.delete(cleanup); };
  }
}
export const sessionScope = new SessionScope();

/** Same-user token refresh preserves subscriptions; an identity change tears them down. */
export function prepareSessionChange(scope: SessionScope, previousUserId: string | null, nextUserId: string | null) {
  if (previousUserId !== nextUserId) scope.setIdentity(null);
  return nextUserId;
}
