import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { IconSize, Spacing } from '@/constants/theme';
import { AppText } from '@/components/ui/app-text';
import { Action, Page, Panel, Section } from '@/components/ui/product-ui';
import { useTheme } from '@/hooks/use-theme';

export function WelcomeScreen() {
  const c = useTheme();
  return <Page role={false}>
    <SymbolView name={{ ios: 'shippingbox', android: 'package_2', web: 'package_2' }} size={IconSize.large} tintColor={c.action} />
    <Section title="ParcelConnect"><AppText variant="title">A better handoff starts before the doorstep.</AppText>
      <AppText color="textSecondary">Book a parcel, confirm who will receive it, and keep everyone in the loop.</AppText></Section>
    <Panel><AppText variant="heading">Explore the portfolio demo</AppText>
      <AppText>Try the sender, recipient, rider, and trusted receiver perspectives. All people and deliveries are fictional.</AppText>
      <Action title="Open delivery demo" onPress={() => router.push('/deliveries')} testID="open-demo" />
      <AppText variant="supporting" color="textSecondary">No account needed. No real deliveries, live tracking, or remote notifications.</AppText>
    </Panel>
    <Action title="View design system" secondary onPress={() => router.push('/design-system')} />
    <AppText color="textSecondary" style={{ marginTop: Spacing.three }}>The connected service is a separate integration. This demo never asks for your real address.</AppText>
  </Page>;
}
