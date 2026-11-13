import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AppearanceProvider, useAppearance } from '@/hooks/use-theme';

void SplashScreen.preventAutoHideAsync();

function AppLayout() {
  const { scheme, colors } = useAppearance();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider value={{ ...base, colors: {
      ...base.colors, primary: colors.action, background: colors.background,
      card: colors.surface, text: colors.text, border: colors.separator,
      notification: colors.attention,
    } }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return <AppearanceProvider><AppLayout /></AppearanceProvider>;
}
