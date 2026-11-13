import type { Actor, Delivery, Person } from './types';

export const DEMO_PEOPLE: Person[] = [
  { id: '00000000-0000-4000-8000-000000000001', displayName: 'Alex · Sender', roles: ['sender'] },
  { id: '00000000-0000-4000-8000-000000000002', displayName: 'Sam · Recipient', roles: ['recipient'] },
  { id: '00000000-0000-4000-8000-000000000003', displayName: 'Riley · Rider', roles: ['rider'] },
  { id: '00000000-0000-4000-8000-000000000004', displayName: 'Maya · Trusted receiver', roles: ['receiver'] },
  { id: '00000000-0000-4000-8000-000000000005', displayName: 'Other demo account', roles: ['recipient'] },
];
export const DEMO_ACTORS = {
  sender: { id: DEMO_PEOPLE[0].id, role: 'sender' },
  recipient: { id: DEMO_PEOPLE[1].id, role: 'recipient' },
  rider: { id: DEMO_PEOPLE[2].id, role: 'rider' },
  receiver: { id: DEMO_PEOPLE[3].id, role: 'receiver' },
  unrelated: { id: DEMO_PEOPLE[4].id, role: 'recipient' },
} satisfies Record<string, Actor>;
export const DEMO_DELIVERY_ID = '00000000-0000-4000-8000-000000001042';

export function createDemoDelivery(now: number): Delivery {
  const createdAt = new Date(now).toISOString();
  return {
    id: DEMO_DELIVERY_ID, reference: 'PC-1042', senderId: DEMO_ACTORS.sender.id,
    recipientId: DEMO_ACTORS.recipient.id, riderId: null,
    description: 'A small parcel from Sample shop', size: 'small',
    pickup: { label: 'Sample shop', address: '12 Demo Market Street' },
    dropoff: { label: 'Sample home', address: '42 Example Lane' },
    window: { start: new Date(now + 3_600_000).toISOString(), end: new Date(now + 10_800_000).toISOString(), version: 1 },
    status: 'booked', availability: { status: 'pending', windowVersion: 1, respondedAt: null },
    receiver: null, entrance: { instructions: 'Use the side entrance beside the gate.' },
    reschedule: null, createdAt, updatedAt: createdAt, deliveredAt: null,
    events: [{ id: 'seed-event-1', deliveryId: DEMO_DELIVERY_ID, actorId: DEMO_ACTORS.sender.id,
      type: 'booked', message: 'Parcel booked. Waiting for availability confirmation.', createdAt }],
  };
}
