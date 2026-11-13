import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { WebTokenStyles } from '@/components/ui/web-token-styles';
import { AuthProvider } from '@/features/auth/auth-provider';
import { ConnectionProvider } from '@/features/auth/connection-provider';
import { PushProvider } from '@/features/notifications/push-provider';
import { AppearanceProvider, useAppearance } from '@/hooks/use-theme';

void SplashScreen.preventAutoHideAsync();
function AppLayout() {
  const { scheme, colors } = useAppearance(); const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  useEffect(() => { void SplashScreen.hideAsync(); }, []);
  return <ThemeProvider value={{ ...base, colors: { ...base.colors, primary: colors.action,
    background: colors.background, card: colors.surface, text: colors.text, border: colors.separator, notification: colors.attention } }}>
    <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} /><WebTokenStyles />
    <Stack screenOptions={{ headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text,
      contentStyle: { backgroundColor: colors.background }, headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="index" options={{ title: 'ParcelConnect' }} />
      <Stack.Screen name="sign-in" options={{ title: 'Sign in' }} />
      <Stack.Screen name="sign-up" options={{ title: 'Create account' }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="book/index" options={{ title: 'Book a parcel' }} />
      <Stack.Screen name="book/review" options={{ title: 'Review booking' }} />
      <Stack.Screen name="deliveries/[id]/index" options={{ title: 'Delivery details' }} />
      <Stack.Screen name="deliveries/[id]/availability" options={{ title: 'Availability' }} />
      <Stack.Screen name="deliveries/[id]/receiver" options={{ title: 'Trusted receiver' }} />
      <Stack.Screen name="deliveries/[id]/entrance" options={{ title: 'Entrance guidance' }} />
      <Stack.Screen name="deliveries/[id]/handoff" options={{ title: 'Parcel handoff' }} />
      <Stack.Screen name="design-system" options={{ title: 'Design system' }} />
      <Stack.Screen name="explore" options={{ title: 'Design system' }} />
    </Stack>
  </ThemeProvider>;
}
export default function RootLayout() {
  return <AppearanceProvider><AuthProvider><ConnectionProvider><PushProvider><AppLayout /></PushProvider></ConnectionProvider></AuthProvider></AppearanceProvider>;
}
