import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Action, Busy, Notice, Page, Panel, Section, styles } from '@/components/ui/product-ui';
import { StatusLabel } from '@/components/ui/status-label';
import { useDemo } from '@/features/demo/demo-provider';
import { useResource } from '@/features/demo/use-resource';
import { dateTime, statusText, statusTone, windowText } from '@/features/demo/display';
import { getAllowedActions, isConfirmationCurrent, type DeliveryCommand } from '@/features/deliveries';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

function ask(title: string, message: string, proceed: () => void) {
  if (Platform.OS === 'web') { if (window.confirm(`${title}\n\n${message}`)) proceed(); }
  else Alert.alert(title, message, [{ text: 'Keep delivery', style: 'cancel' }, { text: 'Confirm', style: 'destructive', onPress: proceed }]);
}
export function DeliveryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const { gateway, actor, refresh } = useDemo(); const c = useTheme();
  const load = useCallback(() => gateway.getDelivery(actor, id), [gateway, actor, id]);
  const { data: d, error: loadError, loading } = useResource(load);
  const [mutation, setMutation] = useState<{ actorId: string; error?: string; pending: boolean }>();
  const pending = mutation?.pending ?? false; const error = mutation?.actorId === actor.id ? mutation.error : undefined;
  async function run(command: DeliveryCommand) {
    if (pending) return; setMutation({ actorId: actor.id, pending: true });
    try { await gateway.execute(actor, command); refresh(); setMutation({ actorId: actor.id, pending: false }); }
    catch (e) { setMutation({ actorId: actor.id, pending: false, error: e instanceof Error ? e.message : 'This change was not saved. Try again.' }); }
  }
  if (loading) return <Page><Busy /></Page>;
  if (!d || loadError) return <Page><Notice text={loadError ?? 'This delivery is unavailable.'} danger /><Action title="Back to deliveries" onPress={() => router.replace('/deliveries')} /></Page>;
  const sender = actor.id === d.senderId && actor.role === 'sender';
  const recipient = actor.id === d.recipientId && actor.role === 'recipient';
  const rider = actor.id === d.riderId && actor.role === 'rider';
  const receiver = actor.id === d.receiver?.receiverId && actor.role === 'receiver';
  const terminal = d.status === 'delivered' || d.status === 'cancelled';
  const confirmed = isConfirmationCurrent(d);
  const allowed = getAllowedActions(actor, d);
  const codeHolder = d.availability.status === 'available' ? d.recipientId : d.receiver?.status === 'accepted' ? d.receiver.receiverId : null;
  return <Page>
    <View style={styles.row}><AppText variant="label" style={styles.grow}>{d.reference}</AppText><StatusLabel label={statusText(d.status)} tone={statusTone(d.status)} /></View>
    <Section title={d.description}><AppText variant="title">{windowText(d.window)}</AppText><AppText color="textSecondary">Requested delivery window · {d.size} parcel</AppText></Section>
    {!!error && <Notice text={error} danger />}{pending && <Notice text="Saving this change…" />}
    {!terminal && <Panel>
      <StatusLabel tone={confirmed ? 'success' : 'attention'} label={confirmed ? 'Availability confirmed' : 'Handoff confirmation needed'} />
      <AppText variant="heading">{recipient ? 'Will you be there?' : 'Coordinate the handoff'}</AppText>
      <AppText color="textSecondary">{confirmed ? 'A recipient or accepted receiver is available for this window.' : 'Pickup and departure stay blocked until someone confirms this window.'}</AppText>
      {recipient && <>
        <Action title="Manage availability" onPress={() => router.push(`/deliveries/${id}/availability`)} />
        <Action title="Choose or manage receiver" secondary onPress={() => router.push(`/deliveries/${id}/receiver`)} />
      </>}
      {receiver && allowed.includes('respond_receiver') && <>
        <Action title="Accept receiver invitation" disabled={pending} onPress={() => void run({ type: 'respond_receiver', deliveryId: id, accept: true })} testID="accept-receiver" />
        <Action title="Decline invitation" secondary disabled={pending} onPress={() => void run({ type: 'respond_receiver', deliveryId: id, accept: false })} />
      </>}
      {d.receiver && <AppText variant="supporting" color="textSecondary">Trusted receiver authorization: {d.receiver.status}. Only an accepted authorization applies to this window.</AppText>}
      {rider && d.status === 'accepted' && <Action title="Mark parcel picked up" disabled={pending || !confirmed} onPress={() => void run({ type: 'pickup', deliveryId: id })} testID="mark-picked-up" />}
      {rider && d.status === 'picked_up' && <Action title="Start delivery" disabled={pending || !confirmed} onPress={() => void run({ type: 'dispatch', deliveryId: id })} testID="start-delivery" />}
      {d.status === 'out_for_delivery' && (rider || (actor.id === codeHolder && confirmed)) &&
        <Action title={rider ? 'Enter handoff code' : 'Open handoff code'} onPress={() => router.push(`/deliveries/${id}/handoff`)} testID="open-handoff" />}
      {sender && ['booked','accepted'].includes(d.status) && <Action title="Cancel delivery" secondary disabled={pending}
        onPress={() => ask('Cancel this delivery?', 'The booking and any receiver invitation or handoff code will be cancelled.', () => void run({ type: 'cancel', deliveryId: id }))} />}
    </Panel>}
    {d.reschedule && <Panel><AppText variant="heading">A new window was requested</AppText><AppText>{dateTime(d.reschedule.start)} to {dateTime(d.reschedule.end)}</AppText>
      <AppText color="textSecondary">The current window stays active until all required participants acknowledge the request. A new window needs fresh availability confirmation.</AppText>
      {(sender || rider) && <Action title="Acknowledge new window" disabled={pending || d.reschedule.acknowledgements.includes(actor.id)} onPress={() => void run({ type: 'acknowledge_reschedule', deliveryId: id })} />}
    </Panel>}
    <Panel><AppText variant="heading">The journey</AppText><AppText variant="label">Pickup · {d.pickup.label}</AppText><AppText selectable>{d.pickup.address}</AppText>
      <View style={[styles.divider, { borderColor: c.separator }]} />
      <AppText variant="label">Drop-off · {d.dropoff.label}</AppText><AppText selectable>{d.dropoff.address}</AppText>
      <AppText variant="label">Entrance guidance</AppText><AppText>{d.entrance.instructions || 'No entrance instructions yet.'}</AppText>
      {recipient && !terminal && <Action title="Edit entrance guidance" secondary onPress={() => router.push(`/deliveries/${id}/entrance`)} />}
    </Panel>
    <Section title="Latest updates">{[...d.events].reverse().map(event => <View key={event.id} style={{ gap: Spacing.one }}><AppText>{event.message}</AppText><AppText variant="supporting" color="textSecondary">{dateTime(event.createdAt)}</AppText></View>)}</Section>
    {d.deliveredAt && <Notice text={`Handoff completed ${dateTime(d.deliveredAt)}. This is a demo delivery record.`} />}
    <Action title="Back to deliveries" secondary onPress={() => router.replace('/deliveries')} />
  </Page>;
}
