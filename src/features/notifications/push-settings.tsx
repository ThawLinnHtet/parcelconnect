import { AppText } from '@/components/ui/app-text';
import { Action, Notice, Panel } from '@/components/ui/product-ui';
import { useConnection } from '@/features/auth/connection-provider';

import { usePushNotifications } from './push-provider';

export function PushSettings() {
  const { mode } = useConnection();
  const { status, message, enable, disable } = usePushNotifications();
  return <Panel>
    <AppText variant="heading">Remote notifications</AppText>
    <AppText color="textSecondary">Your inbox keeps delivery requests even if you turn alerts off.</AppText>
    <Notice text={mode === 'mock' ? 'Demo notifications stay inside this app. Sign in to connected mode for device alerts.' : message} danger={status === 'error'} />
    {mode === 'connected' && <Action title={status === 'busy' ? 'Updating device…' : status === 'registered' ? 'Disable remote alerts' : 'Enable remote alerts'}
      disabled={status === 'busy'} onPress={() => { void (status === 'registered' ? disable().catch(() => {}) : enable()); }} testID="push-settings-action" />}
  </Panel>;
}
