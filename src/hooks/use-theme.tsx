import { createContext, useContext, useState, type PropsWithChildren } from 'react';

import { Colors, type ColorScheme, type ThemeColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type AppearanceMode = 'system' | ColorScheme;
const AppearanceContext = createContext<{
  mode: AppearanceMode;
  setMode: (mode: AppearanceMode) => void;
} | null>(null);

export function AppearanceProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<AppearanceMode>('system');
  return <AppearanceContext.Provider value={{ mode, setMode }}>{children}</AppearanceContext.Provider>;
}

/** A preview override is in memory only; default appearance follows the system. */
export function useAppearance() {
  const context = useContext(AppearanceContext);
  const system = useColorScheme();
  const mode = context?.mode ?? 'system';
  const scheme: ColorScheme = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
  const colors: ThemeColors = Colors[scheme];
  return { mode, scheme, colors, setMode: context?.setMode };
}

export function useTheme() {
  return useAppearance().colors;
}
