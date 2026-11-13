import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { IconSize } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function ProductTabs() {
  const c = useTheme();
  return <Tabs screenOptions={{ tabBarActiveTintColor: c.action, tabBarInactiveTintColor: c.textSecondary,
    tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.separator },
    headerStyle: { backgroundColor: c.surface }, headerTintColor: c.text }}>
    <Tabs.Screen name="deliveries" options={{ title: 'Deliveries', tabBarIcon: ({color}) => <SymbolView name={{ios:'shippingbox',android:'package_2',web:'package_2'}} tintColor={color} size={IconSize.large} /> }} />
    <Tabs.Screen name="notifications" options={{ title: 'Notifications', tabBarIcon: ({color}) => <SymbolView name={{ios:'bell',android:'notifications',web:'notifications'}} tintColor={color} size={IconSize.large} /> }} />
    <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: ({color}) => <SymbolView name={{ios:'person.crop.circle',android:'account_circle',web:'account_circle'}} tintColor={color} size={IconSize.large} /> }} />
  </Tabs>;
}
