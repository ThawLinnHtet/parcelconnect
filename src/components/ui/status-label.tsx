import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { IconSize, Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from './app-text';

export type StatusTone = 'attention' | 'information' | 'success' | 'danger';
export function StatusLabel({ label, tone }: { label: string; tone: StatusTone }) {
  const colors = useTheme();
  const background: ThemeColor = `${tone}Surface`;
  return (
    <View style={[styles.label, { backgroundColor: colors[background] }]}>
      <SymbolView
        name={tone === 'success'
          ? { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }
          : { ios: 'info.circle.fill', android: 'info', web: 'info' }}
        size={IconSize.small} tintColor={colors[tone]} />
      <AppText variant="label" color={tone}>{label}</AppText>
    </View>
  );
}
const styles = StyleSheet.create({
  label: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    gap: Spacing.two, paddingHorizontal: Spacing.twelve, paddingVertical: Spacing.two,
    borderRadius: Radius.small, flexWrap: 'wrap' },
});
