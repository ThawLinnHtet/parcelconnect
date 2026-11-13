import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppText } from '@/components/ui/app-text';
import { Action, Choice, Field, Notice, Page, Section } from '@/components/ui/product-ui';
import { DEMO_ACTORS } from '@/features/deliveries';
import type { BookingInput } from '@/features/deliveries';
import { useDemo } from '@/features/demo/demo-provider';
import { localInput, parseLocal, tomorrowWindow } from '@/features/demo/display';

export function BookingFormScreen() {
  const { actor, draft, setDraft } = useDemo(); const initial = draft?.window ?? tomorrowWindow();
  const [description, setDescription] = useState(draft?.description ?? 'A small parcel');
  const [pickup, setPickup] = useState(draft?.pickup.address ?? '10 Market Street, Sample Town');
  const [dropoff, setDropoff] = useState(draft?.dropoff.address ?? '24 Garden Lane, Sample Town');
  const [instructions, setInstructions] = useState(draft?.entrance?.instructions ?? 'Use the side entrance beside the gate.');
  const [size, setSize] = useState<BookingInput['size']>(draft?.size ?? 'small');
  const [start, setStart] = useState(localInput(initial.start)); const [end, setEnd] = useState(localInput(initial.end));
  const [error, setError] = useState('');
  const review = useCallback(() => {
    const startISO = parseLocal(start); const endISO = parseLocal(end);
    if (!description.trim() || !pickup.trim() || !dropoff.trim()) { setError('Enter a parcel description, pickup address, and drop-off address.'); return; }
    if (!startISO || !endISO || new Date(startISO) <= new Date() || endISO <= startISO) { setError('Choose a future start time and an end time after it. Use YYYY-MM-DD HH:mm.'); return; }
    setDraft({ recipientId: DEMO_ACTORS.recipient.id, description: description.trim(), size,
      pickup: { label: 'Sample shop', address: pickup.trim() }, dropoff: { label: 'Sample home', address: dropoff.trim() },
      window: { start: startISO, end: endISO }, entrance: { instructions: instructions.trim() } });
    router.push('/book/review');
  }, [description, pickup, dropoff, start, end, size, instructions, setDraft]);
  if (actor.role !== 'sender') return <Page><Notice text="Switch to the sender perspective to book a parcel." /></Page>;
  return <Page><Section title="Where is it going?"><AppText color="textSecondary">Use fictional addresses for this portfolio demo.</AppText></Section>
    {error && <Notice text={error} danger />}
    <Field label="Parcel description" value={description} onChange={setDescription} />
    <Choice label="Parcel size" value={size} onChange={setSize} options={['small','medium','large'].map(value => ({label: value[0].toUpperCase()+value.slice(1), value: value as BookingInput['size']}))} />
    <Field label="Pickup address" value={pickup} onChange={setPickup} multiline />
    <Field label="Drop-off address" value={dropoff} onChange={setDropoff} multiline />
    <AppText variant="label">Recipient: Sam (seeded demo account)</AppText>
    <Field label="Delivery window starts" value={start} onChange={setStart} hint="Local time. Format: YYYY-MM-DD HH:mm" />
    <Field label="Delivery window ends" value={end} onChange={setEnd} hint="The requested window is not a live ETA guarantee." />
    <Field label="Entrance instructions" value={instructions} onChange={setInstructions} multiline />
    <Action title="Review booking" onPress={review} testID="review-booking" />
  </Page>;
}
