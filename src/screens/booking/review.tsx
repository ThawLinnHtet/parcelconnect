import { router } from 'expo-router';
import { useState } from 'react';
import { AppText } from '@/components/ui/app-text';
import { Action, Notice, Page, Panel, Section } from '@/components/ui/product-ui';
import { useDemo } from '@/features/demo/demo-provider';
import { dateTime } from '@/features/demo/display';

export function BookingReviewScreen() {
  const { draft, setDraft, gateway, actor, refresh } = useDemo(); const [pending, setPending] = useState(false); const [error, setError] = useState('');
  async function submit() {
    if (!draft || pending) return;
    setPending(true); setError('');
    try { const delivery = await gateway.execute(actor, { type: 'book', input: draft }); setDraft(null); refresh(); router.replace(`/deliveries/${delivery.id}`); }
    catch (e) { setError(e instanceof Error ? e.message : 'Your booking was not saved. Please try again.'); }
    finally { setPending(false); }
  }
  if (!draft) return <Page><Notice text="No booking draft is ready to review." /><Action title="Start a booking" onPress={() => router.replace('/book')} /></Page>;
  return <Page><Section title="Check the handoff details"><AppText color="textSecondary">Your recipient will be asked to confirm this window.</AppText></Section>
    <Panel><AppText variant="heading">{draft.description}</AppText><AppText>Size: {draft.size}</AppText>
      <AppText variant="label">Pickup</AppText><AppText>{draft.pickup.address}</AppText>
      <AppText variant="label">Drop-off</AppText><AppText>{draft.dropoff.address}</AppText>
      <AppText variant="label">Requested window</AppText><AppText>{dateTime(draft.window.start)} to {dateTime(draft.window.end)}</AppText>
      <AppText variant="label">Entrance</AppText><AppText>{draft.entrance?.instructions || 'No instructions added.'}</AppText>
    </Panel>{!!error && <Notice text={error} danger />}
    <Action title={pending ? 'Creating booking…' : 'Create demo booking'} disabled={pending} onPress={() => void submit()} testID="create-booking" />
    <Action title="Edit booking" secondary disabled={pending} onPress={() => router.back()} />
  </Page>;
}
