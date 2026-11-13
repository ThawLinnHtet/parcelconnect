import { Button, Column, Host, Picker, Text as NativeText, TextInput, useNativeState } from '@expo/ui';
import { useCallback, useEffect, type PropsWithChildren, type ComponentProps } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View, type KeyboardTypeOptions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Border, MaxContentWidth, Radius, Spacing, Typography } from '@/constants/theme';
import { useAppearance, useTheme } from '@/hooks/use-theme';
import { DEMO_ACTORS } from '@/features/deliveries';
import type { Role } from '@/features/deliveries';
import { useDemo } from '@/features/demo/demo-provider';
import { AppText } from './app-text';

export function Page({ children, role = true }: PropsWithChildren<{ role?: boolean }>) {
  const c = useTheme(); const insets = useSafeAreaInsets();
  return <ScrollView style={{ flex: 1, backgroundColor: c.background }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive"
    contentContainerStyle={{ alignItems: 'center', paddingBottom: insets.bottom + Spacing.fortyEight }}>
    <View style={styles.page}>{role && <Perspective />}{children}</View>
  </ScrollView>;
}
export function Panel({ children }: PropsWithChildren) {
  const c = useTheme(); return <View style={[styles.panel, { backgroundColor: c.surface }]}>{children}</View>;
}
export function Section({ title, children }: PropsWithChildren<{ title: string }>) {
  return <View style={styles.section}><AppText variant="heading">{title}</AppText>{children}</View>;
}
export function Notice({ text, danger = false }: { text: string; danger?: boolean }) {
  const c = useTheme(); return <View style={[styles.notice, { backgroundColor: danger ? c.dangerSurface : c.informationSurface }]}
    accessibilityLiveRegion="polite"><AppText color={danger ? 'danger' : 'information'} selectable>{text}</AppText></View>;
}
export function Busy() { const c = useTheme(); return <View style={styles.section}><ActivityIndicator color={c.action} /><AppText color="textSecondary">Loading delivery information…</AppText></View>; }
export function Action({ title, onPress, secondary = false, disabled = false, testID }: {
  title: string; onPress: () => void; secondary?: boolean; disabled?: boolean; testID?: string;
}) {
  const { colors: c, scheme } = useAppearance();
  return <Host matchContents={{ vertical: true }} colorScheme={scheme} seedColor={c.action} style={{ alignSelf: 'stretch', width: '100%' }}>
    <Column style={{ width: '100%' }}><Button onPress={onPress} disabled={disabled} testID={testID ?? `pc-button-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
      variant={secondary ? 'outlined' : 'filled'} style={{ width: '100%', height: undefined,
        paddingVertical: Spacing.twelve, backgroundColor: secondary ? 'transparent' : disabled ? c.disabled : c.action }}>
      <NativeText textStyle={{ ...Typography.action, color: disabled ? c.onDisabled : secondary ? c.action : c.onAction }}>{title}</NativeText>
    </Button></Column>
  </Host>;
}
export function Choice<T extends string>({ label, value, onChange, options, testID }: {
  label: string; value: T; onChange: (value: T) => void;
  options: { label: string; value: T }[]; testID?: string;
}) {
  const { colors: c, scheme } = useAppearance();
  return <View style={styles.field}><AppText variant="label">{label}</AppText>
    <Host matchContents colorScheme={scheme} seedColor={c.action}>
      <Picker selectedValue={value} onValueChange={onChange} accessibilityLabel={label} testID={testID ?? 'pc-picker'}>
        {options.map(item => <Picker.Item key={item.value} label={item.label} value={item.value} />)}
      </Picker>
    </Host>
  </View>;
}
export function Field({ label, value, onChange, hint, multiline, keyboardType, testID, secureTextEntry, autoComplete, autoCapitalize }: {
  label: string; value: string; onChange: (value: string) => void; hint?: string;
  multiline?: boolean; keyboardType?: KeyboardTypeOptions; testID?: string; secureTextEntry?: boolean;
  autoComplete?: ComponentProps<typeof TextInput>['autoComplete']; autoCapitalize?: ComponentProps<typeof TextInput>['autoCapitalize'];
}) {
  const { colors: c, scheme } = useAppearance(); const nativeValue = useNativeState(value);
  useEffect(() => {
    // Expo UI ObservableState is intentionally mutable, unlike React hook state.
    // eslint-disable-next-line react-hooks/immutability
    nativeValue.value = value;
  }, [value, nativeValue]);
  const change = useCallback((text: string) => {
    'worklet';
    // Expo UI requires synchronous ObservableState updates on its UI thread.
    // eslint-disable-next-line react-hooks/immutability
    nativeValue.value = text;
    scheduleOnRN(onChange, text);
  }, [nativeValue, onChange]);
  return <View style={styles.field}><AppText variant="label">{label}</AppText>
    <Host matchContents={{ vertical: true }} colorScheme={scheme} seedColor={c.action} style={{ width: '100%', alignSelf: 'stretch' }}>
      <TextInput value={nativeValue} onChangeText={change} accessibilityLabel={label} multiline={multiline}
        keyboardType={keyboardType} autoCapitalize={autoCapitalize ?? (keyboardType === 'number-pad' ? 'none' : 'sentences')} secureTextEntry={secureTextEntry} autoComplete={autoComplete}
        placeholderTextColor={c.textSecondary} testID={testID ?? `pc-field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
        style={{ width: '100%', padding: Spacing.twelve, borderColor: c.inputOutline, borderWidth: Border.thin, borderRadius: Radius.small }}
        textStyle={{ ...Typography.body, color: c.text }} />
    </Host>
    {hint && <AppText variant="supporting" color="textSecondary">{hint}</AppText>}
  </View>;
}
export function Perspective() {
  const { actor, setActor, gateway } = useDemo();
  if (gateway.mode !== 'mock') return null;
  return <View style={styles.perspective}>
    <Choice label="Demo perspective" value={actor.role} onChange={(role: Role) => setActor(DEMO_ACTORS[role])}
      testID="perspective-picker" options={[
        { label: 'Sender · Alex', value: 'sender' }, { label: 'Recipient · Sam', value: 'recipient' },
        { label: 'Rider · Riley', value: 'rider' }, { label: 'Receiver · Maya', value: 'receiver' },
      ]} />
    <AppText variant="supporting" color="textSecondary">Fictional data. Actions stay in this demo.</AppText>
  </View>;
}
export const styles = StyleSheet.create({
  page: { width: '100%', maxWidth: MaxContentWidth, padding: Spacing.four, gap: Spacing.four },
  panel: { borderRadius: Radius.panel, padding: Spacing.four, gap: Spacing.three },
  section: { gap: Spacing.three }, field: { gap: Spacing.two },
  notice: { borderRadius: Radius.small, padding: Spacing.three },
  perspective: { gap: Spacing.two, paddingBottom: Spacing.three },
  row: { flexDirection: 'row', gap: Spacing.twelve, alignItems: 'center', flexWrap: 'wrap' },
  grow: { flex: 1, minWidth: 0 },
  divider: { borderTopWidth: Border.thin, marginVertical: Spacing.two },
});
