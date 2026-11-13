/** ParcelConnect tokens. Keep all shared visual values in this entry point. */
import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#141B1A', textSecondary: '#586460',
    background: '#F6F8F7', surface: '#FFFFFF',
    backgroundElement: '#EEF3F0', backgroundSelected: '#DCEDE5',
    action: '#0B6256', onAction: '#FFFFFF',
    separator: '#DCE4DF', inputOutline: '#76877F', focus: '#0B6256',
    attention: '#915B08', attentionSurface: '#FFF2D9',
    information: '#2457A6', informationSurface: '#EAF1FF',
    success: '#16674A', successSurface: '#E6F5ED',
    danger: '#B42332', dangerSurface: '#FDECEF',
    disabled: '#E3E9E5', onDisabled: '#586460',
  },
  dark: {
    text: '#EDF4F0', textSecondary: '#ADBCB4',
    background: '#111A16', surface: '#1B2721',
    backgroundElement: '#24332B', backgroundSelected: '#304D40',
    action: '#83D6C1', onAction: '#072F29',
    separator: '#35443B', inputOutline: '#879C93', focus: '#83D6C1',
    attention: '#F2C66D', attentionSurface: '#302710',
    information: '#9ABEFF', informationSurface: '#162840',
    success: '#88DBB1', successSurface: '#153327',
    danger: '#FFADB4', dangerSurface: '#3B1C24',
    disabled: '#2E3B33', onDisabled: '#ADBCB4',
  },
} as const;

export type ColorScheme = keyof typeof Colors;
export type ThemeColor = keyof typeof Colors.light;
export type ThemeColors = { [K in ThemeColor]: string };

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
  web: {
    sans: 'var(--font-display)', serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)', mono: 'var(--font-mono)',
  },
});

// Preserve the starter names; twelve and fortyEight complete the proposed scale.
export const Spacing = {
  half: 2, one: 4, two: 8, twelve: 12, three: 16,
  four: 24, five: 32, fortyEight: 48, six: 64,
} as const;
export const Radius = { small: 8, medium: 12, panel: 16, pill: 999 } as const;
export const Border = { thin: 1, focus: 2 } as const;
export const Typography = {
  display: { fontSize: 36, lineHeight: 42, fontWeight: '600' },
  title: { fontSize: 28, lineHeight: 36, fontWeight: '600' },
  heading: { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  body: { fontSize: Platform.OS === 'ios' ? 17 : 16, lineHeight: 24, fontWeight: '400' },
  action: { fontSize: Platform.OS === 'ios' ? 17 : 16, lineHeight: 24, fontWeight: '600' },
  supporting: { fontSize: Platform.OS === 'ios' ? 15 : 14, lineHeight: 20, fontWeight: '400' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  code: { fontSize: 28, lineHeight: 36, fontWeight: '500', fontFamily: Fonts.mono },
} as const;
export type TextVariant = keyof typeof Typography;
export const Motion = {
  duration: { feedback: 160, change: 220, presentation: 320 },
  easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
  reducedMotionDuration: 0,
} as const;
export const Interaction = { minTarget: 48, disabledOpacity: 1, pressedOpacity: 0.8 } as const;
export const Layout = {
  screenGutter: Spacing.three, wideGutter: Spacing.five,
  previewMax: 1184, exampleWidth: 420, wideBreakpoint: 960,
} as const;
export const IconSize = { small: 16, standard: 20, large: 24 } as const;
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
