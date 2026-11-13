type BeforeSignOut = (userId: string) => Promise<void>;
const cleanups = new Set<BeforeSignOut>();

/** Register token unlinking while the old account still has valid credentials. */
export function registerBeforeSignOut(cleanup: BeforeSignOut): () => void {
  cleanups.add(cleanup);
  return () => { cleanups.delete(cleanup); };
}

/** A failed unlink is surfaced; it must not be reported as a successful logout. */
export async function runBeforeSignOut(userId: string) {
  for (const cleanup of [...cleanups]) await cleanup(userId);
}
