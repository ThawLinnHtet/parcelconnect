const listeners = new Set<() => void>();
export function onForeground(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function notifyForeground() {
  for (const listener of [...listeners]) listener();
}
