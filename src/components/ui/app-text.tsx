import { Text, type TextProps } from 'react-native';

import { Fonts, Typography, type TextVariant, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = TextProps & { variant?: TextVariant; color?: ThemeColor };
export function AppText({ variant = 'body', color = 'text', style, ...props }: Props) {
  const colors = useTheme();
  return <Text {...props} style={[
    { fontFamily: Fonts.sans, color: colors[color] }, Typography[variant], style,
  ]} />;
}
