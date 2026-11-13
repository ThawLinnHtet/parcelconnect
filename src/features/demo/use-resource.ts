import { useEffect, useState } from 'react';
import { useDemo } from './demo-provider';

/** A query response is discarded after unmount, account change, or invalidation. */
export function useResource<T>(load: () => Promise<T>) {
  const { revision } = useDemo();
  const [state, setState] = useState<{ key: typeof load; revision: number; data?: T; error?: string }>();
  useEffect(() => {
    let active = true;
    load().then(data => { if (active) setState({ key: load, revision, data }); })
      .catch((error: unknown) => { if (active) setState({ key: load, revision, error: error instanceof Error ? error.message : 'Please try again.' }); });
    return () => { active = false; };
  }, [load, revision]);
  const current = state?.key === load && state.revision === revision ? state : undefined;
  return { data: current?.data, error: current?.error, loading: !current };
}
