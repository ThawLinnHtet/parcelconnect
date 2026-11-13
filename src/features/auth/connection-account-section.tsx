import { router } from 'expo-router';
import { useState } from 'react';

import { AppText } from '@/components/ui/app-text';
import { Action, Choice, Notice, Panel } from '@/components/ui/product-ui';

import { useAuth } from './auth-provider';
import { useConnection } from './connection-provider';

export function ConnectionAccountSection() {
  const auth = useAuth(); const connection = useConnection();
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function signOut() {
    if (busy) return;
    setBusy(true); setError('');
    try { await auth.signOut(); router.replace('/sign-in'); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not sign out. Try again.'); }
    finally { setBusy(false); }
  }
  return <Panel>
    <AppText variant="heading">{connection.mode === 'connected' ? 'Connected account' : 'Connect to Supabase'}</AppText>
    {connection.mode === 'connected' && auth.user ? <>
      <AppText selectable>{auth.user.email}</AppText>
      <Notice text="This view uses your signed-in identity. Changing the account view never grants server permissions." />
      <Choice label="Account view" value={auth.actor?.role ?? 'sender'} onChange={auth.selectRole}
        options={auth.roles.map(role => ({ value: role, label: role[0].toUpperCase() + role.slice(1) }))} testID="connected-view-picker" />
      {error && <Notice text={error} danger />}
      <Action title={busy ? 'Signing out…' : 'Sign out'} onPress={() => { void signOut(); }} disabled={busy} />
      <Action title="Switch to the mock demo" secondary onPress={() => { connection.useMock(); router.replace('/'); }} disabled={busy} />
    </> : <>
      <AppText color="textSecondary">The mock demo works without credentials. Connected mode uses your own account and requires the backend setup.</AppText>
      <Action title={auth.status === 'signedIn' ? 'Use signed-in account' : 'Sign in to connect'} onPress={() => {
        if (auth.status === 'signedIn') { connection.useConnected(); router.replace('/deliveries'); }
        else router.push('/sign-in');
      }} />
    </>}
  </Panel>;
}
