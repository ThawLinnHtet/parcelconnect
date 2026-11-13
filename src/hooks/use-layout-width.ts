import { useSyncExternalStore } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

import { Layout } from '@/constants/theme';

function subscribe(listener: () => void) {
  if (Platform.OS !== 'web') return () => {};
  window.addEventListener('resize', listener);
  return () => window.removeEventListener('resize', listener);
}
const serverSnapshot = () => Layout.wideBreakpoint;
const clientSnapshot = () => typeof window === 'undefined' ? Layout.wideBreakpoint : window.innerWidth;

/** Stable SSR snapshot, followed by the actual browser viewport on hydration. */
export function useLayoutWidth() {
  const { width } = useWindowDimensions();
  const browserWidth = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  return Platform.OS === 'web' ? browserWidth : width;
}
