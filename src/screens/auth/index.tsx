import { router } from 'expo-router';
import { useState } from 'react';

import { AppText } from '@/components/ui/app-text';
import { Action, Field, Notice, Page, Panel } from '@/components/ui/product-ui';
import { useAuth } from '@/features/auth/auth-provider';
import { useConnection } from '@/features/auth/connection-provider';

export function AuthScreen({ signup = false }: { signup?: boolean }) {
  const auth = useAuth(); const connection = useConnection();
  const [name, setName] = useState(''); const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit() {
    if (busy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Enter a valid email address.'); return; }
    if (password.length < (signup ? 8 : 1)) { setError(signup ? 'Use at least eight characters for your password.' : 'Enter your password.'); return; }
    if (signup && !name.trim()) { setError('Enter your display name.'); return; }
    setBusy(true); setError('');
    try {
      if (signup) await auth.signUp(name, email, password); else await auth.signIn(email, password);
      connection.useConnected(); router.replace('/deliveries');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not connect. Please try again.'); }
    finally { setBusy(false); }
  }
  return <Page role={false}>
    <AppText variant="title">{signup ? 'Create an account' : 'Connect your account'}</AppText>
    <AppText color="textSecondary">Connected mode uses Supabase accounts and server-authorized deliveries. It never substitutes demo results for a failed request.</AppText>
    {!auth.configured ? <Panel>
      <Notice text={auth.error ?? 'Supabase configuration is missing.'} />
      <AppText>Add the project URL and publishable key from .env.example, restart the app, and apply the backend PR before testing connected mode.</AppText>
    </Panel> : <Panel>
      {signup && <Field label="Display name" value={name} onChange={setName} autoComplete="name" testID="auth-name" />}
      <Field label="Email address" value={email} onChange={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" testID="auth-email" />
      <Field label="Password" value={password} onChange={setPassword} secureTextEntry autoCapitalize="none" autoComplete={signup ? 'new-password' : 'current-password'} testID="auth-password" />
      {signup && <AppText variant="supporting" color="textSecondary">Portfolio signup skips email confirmation. Rider privileges are provisioned separately on the backend.</AppText>}
      {(error || auth.error) && <Notice text={error || auth.error || ''} danger />}
      <Action title={busy ? 'Connecting…' : signup ? 'Create account' : 'Sign in'} onPress={() => { void submit(); }} disabled={busy} testID="auth-submit" />
      <Action title={signup ? 'Already have an account? Sign in' : 'Create an account'} secondary
        onPress={() => router.replace(signup ? '/sign-in' : '/sign-up')} disabled={busy} />
      {auth.status === 'signedIn' && <Action title="Use signed-in account" secondary onPress={() => { connection.useConnected(); router.replace('/deliveries'); }} />}
      {auth.status === 'error' && <Action title="Retry account validation" secondary onPress={() => { void auth.retry(); }} />}
    </Panel>}
    <Action title="Use the mock demo instead" secondary onPress={() => { connection.useMock(); router.replace('/'); }} disabled={busy} />
  </Page>;
}
