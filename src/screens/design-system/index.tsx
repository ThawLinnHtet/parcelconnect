import { Button, Column, Host, Picker, Text as NativeText } from '@expo/ui';
import { SymbolView } from 'expo-symbols';
import { useState, type PropsWithChildren } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { WebTokenStyles } from '@/components/ui/web-token-styles';
import { useLayoutWidth } from '@/hooks/use-layout-width';
import { StatusLabel } from '@/components/ui/status-label';
import {
  Border, BottomTabInset, IconSize, Interaction, Layout, Radius, Spacing, Typography,
  type ThemeColor,
} from '@/constants/theme';
import { useAppearance, useTheme, type AppearanceMode } from '@/hooks/use-theme';

type PreviewState = 'awaiting' | 'confirmed' | 'receiver' | 'error';

function Section({ title, children }: PropsWithChildren<{ title: string }>) {
  const colors = useTheme();
  return <View style={[styles.section, { borderTopColor: colors.separator }]}>
    <AppText variant="heading">{title}</AppText>{children}
  </View>;
}

function Palette() {
  const colors = useTheme();
  const swatches: { name: string; token: ThemeColor }[] = [
    { name: 'Canvas', token: 'background' }, { name: 'Surface', token: 'surface' },
    { name: 'Ink', token: 'text' }, { name: 'Muted', token: 'textSecondary' },
  ];
  return <Section title="Color with a purpose">
    <View style={[styles.brandSwatch, { backgroundColor: colors.action }]}>
      <View><AppText variant="heading" color="onAction">Deep teal</AppText>
        <AppText variant="supporting" color="onAction">Primary actions & selection</AppText></View>
      <AppText variant="label" color="onAction" selectable>{colors.action}</AppText>
    </View>
    <View style={styles.swatches}>{swatches.map(({ name, token }) =>
      <View key={token} style={styles.swatchItem}>
        <View style={[styles.swatch, { backgroundColor: colors[token], borderColor: colors.separator }]} />
        <AppText variant="label">{name}</AppText>
        <AppText variant="supporting" color="textSecondary" selectable>{colors[token]}</AppText>
      </View>)}
    </View>
  </Section>;
}

function TypeSpecimen() {
  return <Section title="Type that gets out of the way">
    <AppText variant="title">Your next delivery.</AppText>
    <AppText>Confirm a time. Let the rider know who will be there.</AppText>
    <AppText variant="supporting" color="textSecondary">System type · Body 17 pt on iOS / 16 sp on Android</AppText>
  </Section>;
}

function SpacingSpecimen() {
  const colors = useTheme();
  return <Section title="Room to breathe">
    <View style={styles.spacingRow}>{[Spacing.one, Spacing.two, Spacing.twelve, Spacing.three, Spacing.four, Spacing.five].map(value =>
      <View key={value} style={styles.spacingItem}>
        <View style={[styles.spacingBar, { height: value, backgroundColor: colors.action }]} />
        <AppText variant="supporting" color="textSecondary">{value}</AppText>
      </View>)}
    </View>
    <AppText variant="supporting" color="textSecondary">16-unit screen gutters · 48-unit minimum touch targets</AppText>
  </Section>;
}

function DeliveryPreview({ state, setState }: {
  state: PreviewState; setState: (value: PreviewState) => void;
}) {
  const { colors, scheme } = useAppearance();
  const confirmed = state === 'confirmed';
  const receiver = state === 'receiver';
  const error = state === 'error';
  return <View style={[styles.delivery, { backgroundColor: colors.surface }]} testID="delivery-preview">
    <View style={styles.deliveryHeader}>
      <View style={styles.wordmark}>
        <SymbolView name={{ ios: 'shippingbox', android: 'package_2', web: 'package_2' }}
          size={IconSize.large} tintColor={colors.action} />
        <AppText variant="action">ParcelConnect</AppText>
      </View>
      <AppText variant="supporting" color="textSecondary">Demo</AppText>
    </View>
    <View style={styles.deliveryBody}>
      <View style={styles.deliveryTitle}>
        <AppText variant="supporting" color="textSecondary" selectable>Delivery PC-1042 · Small parcel</AppText>
        <AppText variant="title">Today, 2–4 PM</AppText>
        <AppText variant="supporting" color="textSecondary">Scheduled window · Booked</AppText>
      </View>
      <View style={[styles.availability, { backgroundColor: colors.background }]}>
        <StatusLabel tone={error ? 'danger' : confirmed ? 'success' : 'attention'}
          label={error ? 'Connection needed' : confirmed ? 'Availability confirmed' : receiver ? 'Invitation pending' : 'Your response needed'} />
        <AppText variant="heading">{confirmed ? "You're all set." : receiver ? 'Waiting for Maya.' : error ? 'Your reply wasn’t saved.' : 'Will you be there?'}</AppText>
        <AppText color="textSecondary">{confirmed
          ? "The rider knows you'll be there for this window."
          : receiver ? 'Maya needs to accept before they can receive your parcel.'
          : error ? 'Reconnect before confirming your availability.'
          : 'Let your rider know before they leave with your parcel.'}</AppText>
        <Host matchContents={{ vertical: true }} colorScheme={scheme} seedColor={colors.action} style={styles.controls}>
          <Column spacing={Spacing.two} style={{ width: '100%' }}>
          <Button variant="filled" testID="confirm-availability" style={{ ...styles.action, backgroundColor: colors.action }}
            onPress={() => setState(confirmed || receiver || error ? 'awaiting' : 'confirmed')}>
            <NativeText textStyle={{ ...Typography.action, color: colors.onAction }}>
              {confirmed ? 'Change availability' : receiver ? 'Cancel demo invitation' : error ? 'Reset demo error' : "I'll be there"}
            </NativeText>
          </Button>
          {!confirmed && !receiver && !error && <Button variant="outlined" testID="choose-receiver"
            style={styles.action} onPress={() => setState('receiver')}>
              <NativeText textStyle={{ ...Typography.action, color: colors.action }}>Choose someone else</NativeText>
            </Button>}
          </Column>
        </Host>
      </View>
      <View style={styles.journey}>
        <AppText variant="label">The journey</AppText>
        <View style={styles.journeyRow}>
          <SymbolView name={{ ios: 'storefront', android: 'storefront', web: 'storefront' }} size={IconSize.standard} tintColor={colors.textSecondary} />
          <View style={styles.flex}><AppText variant="label">Sample shop</AppText><AppText variant="supporting" color="textSecondary">Pickup location</AppText></View>
        </View>
        <View style={[styles.journeyRow, { borderTopWidth: Border.thin, borderTopColor: colors.separator, paddingTop: Spacing.three }]}>
          <SymbolView name={{ ios: 'house', android: 'home', web: 'home' }} size={IconSize.standard} tintColor={colors.action} />
          <View style={styles.flex}><AppText variant="label">Sample home</AppText><AppText variant="supporting" color="textSecondary">Use the side entrance beside the gate.</AppText></View>
        </View>
      </View>
      <AppText variant="supporting" color="textSecondary">Interactive preview with fictional delivery data.</AppText>
    </View>
  </View>;
}

export function DesignSystemScreen() {
  const { colors, mode, scheme, setMode } = useAppearance();
  const [state, setState] = useState<PreviewState>('awaiting');
  const width = useLayoutWidth();
  const insets = useSafeAreaInsets();
  const wide = width >= Layout.wideBreakpoint;
  return <ScrollView style={{ backgroundColor: colors.background }}
    contentContainerStyle={[styles.scrollContent, {
      paddingTop: Platform.OS === 'web' ? Spacing.six + Spacing.fortyEight : insets.top + Spacing.four,
      paddingBottom: insets.bottom + BottomTabInset + Spacing.fortyEight,
    }]} keyboardShouldPersistTaps="handled">
    <WebTokenStyles />
    <View style={[styles.page, { paddingHorizontal: wide ? Layout.wideGutter : Layout.screenGutter }]}>
      <View style={[styles.pageHeader, { flexDirection: wide ? 'row' : 'column' }]}>
        <View style={styles.flex}><AppText variant={wide ? 'display' : 'title'}>Design foundations</AppText>
          <AppText color="textSecondary" style={styles.intro}>A shared language for every parcel handoff.</AppText></View>
        <Host matchContents colorScheme={scheme} seedColor={colors.action} style={styles.appearance}>
          <Picker selectedValue={mode} accessibilityLabel="Preview appearance" testID="appearance-picker"
            onValueChange={value => setMode?.(value as AppearanceMode)}>
            <Picker.Item label="System theme" value="system" />
            <Picker.Item label="Light theme" value="light" />
            <Picker.Item label="Dark theme" value="dark" />
          </Picker>
        </Host>
      </View>
      <View testID={wide ? 'tokens-wide' : 'tokens-compact'} style={[styles.columns, { flexDirection: wide ? 'row' : 'column-reverse' }]}>
        <View style={styles.foundation}>
          <Palette />
          <Section title="A status always has a name">
            <View style={styles.statuses}>
              <StatusLabel tone="attention" label="Needs a reply" />
              <StatusLabel tone="information" label="In transit" />
              <StatusLabel tone="success" label="Confirmed" />
              <StatusLabel tone="danger" label="Needs attention" />
            </View>
            <AppText variant="supporting" color="textSecondary">Color supports the label. It never replaces it.</AppText>
          </Section>
          <TypeSpecimen />
          <SpacingSpecimen />
        </View>
        <View style={[styles.example, wide && { width: Layout.exampleWidth }]}>
          <View style={styles.exampleHeader}>
            <AppText variant="label">In context</AppText>
            <Host matchContents colorScheme={scheme} seedColor={colors.action}>
              <Picker selectedValue={state} onValueChange={setState} accessibilityLabel="Delivery preview state" testID="state-picker">
                <Picker.Item label="Awaiting reply" value="awaiting" />
                <Picker.Item label="Confirmed" value="confirmed" />
                <Picker.Item label="Receiver pending" value="receiver" />
                <Picker.Item label="Offline error" value="error" />
              </Picker>
            </Host>
          </View>
          <DeliveryPreview state={state} setState={setState} />
          <View style={styles.notes}>
            <AppText variant="supporting" color="textSecondary">Shared tokens. Native controls.</AppText>
            <AppText variant="supporting" color="textSecondary">Light and dark appearances use the same roles. Buttons follow the platform through Expo UI.</AppText>
          </View>
        </View>
      </View>
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  scrollContent: { alignItems: 'center' },
  page: { width: '100%', maxWidth: Layout.previewMax, gap: Spacing.fortyEight },
  pageHeader: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start', flexWrap: 'wrap' },
  intro: { marginTop: Spacing.two },
  appearance: { minHeight: Interaction.minTarget },
  columns: { gap: Spacing.fortyEight, alignItems: 'stretch' },
  flex: { flex: 1, minWidth: 0 },
  foundation: { flex: 1, minWidth: 0, gap: Spacing.five },
  section: { borderTopWidth: Border.thin, paddingTop: Spacing.four, gap: Spacing.three },
  brandSwatch: { borderRadius: Radius.medium, padding: Spacing.four,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three, flexWrap: 'wrap' },
  swatches: { flexDirection: 'row', gap: Spacing.twelve, flexWrap: 'wrap' },
  swatchItem: { flex: 1, minWidth: Spacing.six, gap: Spacing.one },
  swatch: { height: Spacing.fortyEight, borderRadius: Radius.small, borderWidth: Border.thin, marginBottom: Spacing.one },
  statuses: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  spacingRow: { flexDirection: 'row', gap: Spacing.four, alignItems: 'flex-end', paddingTop: Spacing.two },
  spacingItem: { gap: Spacing.two, alignItems: 'center' },
  spacingBar: { width: Spacing.four, borderRadius: Radius.small },
  example: { gap: Spacing.three, minWidth: 0 },
  exampleHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two, alignItems: 'center', flexWrap: 'wrap' },
  delivery: { borderRadius: Radius.panel, overflow: 'hidden' },
  deliveryHeader: { padding: Spacing.four, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, flexWrap: 'wrap' },
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  deliveryBody: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.four, gap: Spacing.four },
  deliveryTitle: { gap: Spacing.one },
  availability: { borderRadius: Radius.medium, padding: Spacing.three, gap: Spacing.twelve },
  controls: { width: '100%', alignSelf: 'stretch' },
  action: { width: '100%' as const, height: undefined, paddingVertical: Spacing.twelve },
  journey: { gap: Spacing.three },
  journeyRow: { flexDirection: 'row', gap: Spacing.twelve, alignItems: 'flex-start' },
  notes: { gap: Spacing.two, paddingHorizontal: Spacing.one },
});
