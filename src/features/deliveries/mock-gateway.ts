import { DEMO_PEOPLE, createDemoDelivery } from './fixtures';
import type { DeliveryGateway } from './gateway';
import { canAccessDelivery, hasActiveReceiver, isConfirmationCurrent, isTerminal } from './rules';
import { DeliveryError } from './types';
import type { Actor, Delivery, DeliveryCommand, EntranceGuidance, IssuedHandoffCode, Notification } from './types';

type Challenge = { code: string; expiresAt: number; windowVersion: number; receiverId: string;
  failures: number; consumed: boolean; revoked: boolean; completionKey?: string };
export interface MockDeliveryGateway extends DeliveryGateway {
  readonly mode: 'mock';
  resetDemo(): Promise<void>;
  setOnline(online: boolean): void;
}
export type MockGatewayOptions = { now?: () => number; latencyMs?: number };
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
function fail(code: ConstructorParameters<typeof DeliveryError>[0], message: string): never { throw new DeliveryError(code, message); }

/** Fictional demonstration only. Challenges are NOT a secure verification service. */
export function createMockGateway(options: MockGatewayOptions = {}): MockDeliveryGateway {
  const now = options.now ?? Date.now;
  let deliveries = new Map<string, Delivery>();
  let notifications: Notification[] = [];
  let challenges = new Map<string, Challenge>();
  let issuances = new Map<string, number[]>();
  let sequence = 0;
  let online = true;
  let generation = 0;
  const listeners = new Set<() => void>();
  const nextId = (prefix: string) => `${prefix}-${++sequence}`;
  const timestamp = () => new Date(now()).toISOString();
  const emit = () => { for (const listener of listeners) listener(); };
  function seed() {
    sequence = 0; challenges = new Map(); issuances = new Map();
    const delivery = createDemoDelivery(now()); deliveries = new Map([[delivery.id, delivery]]);
    notifications = [{ id: 'seed-notification-1', userId: delivery.recipientId, deliveryId: delivery.id,
      title: 'Can you receive your parcel?', body: 'Confirm your availability before pickup.', createdAt: timestamp(), readAt: null }];
  }
  seed();
  async function ready() {
    const operation = generation;
    if (options.latencyMs) await new Promise(resolve => setTimeout(resolve, options.latencyMs));
    return operation;
  }
  function ensureCurrent(operation: number) {
    // Check after the caller's await as well: even zero-latency promises yield.
    if (operation !== generation) fail('unavailable', 'The demo was reset. Refresh and try again.');
    if (!online) fail('offline', 'You are offline. Reconnect and try again.');
  }
  function identify(actor: Actor) {
    if (!DEMO_PEOPLE.some(person => person.id === actor.id && person.roles.includes(actor.role))) fail('forbidden', 'This demo identity cannot use that perspective.');
  }
  function find(id: string) {
    const delivery = deliveries.get(id);
    if (!delivery) return fail('not_found', 'Delivery not found.');
    return delivery;
  }
  function authorize(actor: Actor, delivery: Delivery) {
    if (!canAccessDelivery(actor, delivery, now())) fail('forbidden', 'You cannot access this delivery.');
  }
  function mutable(delivery: Delivery) {
    if (isTerminal(delivery)) fail('invalid_transition', 'This delivery is already completed or cancelled.');
  }
  function recipient(actor: Actor, delivery: Delivery) {
    if (actor.id !== delivery.recipientId) fail('forbidden', 'Only the recipient can change this handoff.');
  }
  function assignedRider(actor: Actor, delivery: Delivery) {
    if (actor.role !== 'rider' || actor.id !== delivery.riderId) fail('forbidden', 'Only the assigned rider can perform this action.');
  }
  function invalidate(id: string) { const challenge = challenges.get(id); if (challenge) challenge.revoked = true; }
  function redact(actor: Actor, delivery: Delivery) {
    const result = copy(delivery);
    if (actor.id === result.receiver?.receiverId && actor.id !== result.recipientId) {
      result.pickup = { label: 'Sender pickup', address: 'Visible to the delivery participants only' };
      if (result.receiver.status !== 'accepted') {
        result.dropoff = { label: 'Recipient location', address: 'Available after you accept the invitation' };
        result.entrance = { instructions: '' };
      }
    }
    return result;
  }
  function record(delivery: Delivery, actorId: string, type: string, message: string, extraRecipients: string[] = []) {
    delivery.updatedAt = timestamp();
    delivery.events.push({ id: nextId('event'), deliveryId: delivery.id, actorId, type, message, createdAt: timestamp() });
    const recipients = new Set([delivery.senderId, delivery.recipientId, delivery.riderId,
      hasActiveReceiver(delivery, now()) ? delivery.receiver?.receiverId : null, ...extraRecipients]);
    for (const userId of recipients) if (userId && userId !== actorId) notifications.push({
      id: nextId('notification'), userId, deliveryId: delivery.id, title: message,
      body: 'Open the delivery for details.', createdAt: timestamp(), readAt: null,
    });
  }
  function validateWindow(window: { start: string; end: string }) {
    const start = Date.parse(window.start), end = Date.parse(window.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end <= now()) fail('invalid_input', 'Choose a valid delivery window ending after its start and after now.');
  }
  function validateEntrance(entrance: EntranceGuidance) {
    if (entrance.instructions.length > 1000) fail('invalid_input', 'Keep entrance instructions within 1,000 characters.');
    validateCoordinates(entrance);
    if (entrance.photoPath && (entrance.photoPath.startsWith('http') || entrance.photoPath.length > 500)) fail('invalid_input', 'Use a private storage object path for the entrance photo.');
  }
  function validateCoordinates(value: { latitude?: number; longitude?: number }) {
    if ((value.latitude === undefined) !== (value.longitude === undefined)
      || (value.latitude !== undefined && (!Number.isFinite(value.latitude) || Math.abs(value.latitude) > 90))
      || (value.longitude !== undefined && (!Number.isFinite(value.longitude) || Math.abs(value.longitude) > 180))) fail('invalid_input', 'Choose valid latitude and longitude coordinates.');
  }
  function issueAllowed(actor: Actor, delivery: Delivery) {
    if (delivery.status !== 'out_for_delivery') fail('invalid_transition', 'The parcel must be out for delivery before issuing a handoff code.');
    if (!isConfirmationCurrent(delivery, now())) fail('confirmation_required', 'Confirm the active delivery window first.');
    const holder = delivery.availability.status === 'available' ? delivery.recipientId : delivery.receiver?.receiverId;
    if (!holder || actor.id !== holder) fail('forbidden', 'Only the active recipient or accepted receiver can issue the code.');
    return holder;
  }
  return {
    mode: 'mock',
    setOnline(value) { online = value; emit(); },
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    async resetDemo() { generation += 1; seed(); online = true; emit(); },
    async listPeople(actor) { const operation = await ready(); ensureCurrent(operation); identify(actor); return copy(DEMO_PEOPLE); },
    async listDeliveries(actor) {
      const operation = await ready(); ensureCurrent(operation); identify(actor);
      return [...deliveries.values()].filter(delivery => canAccessDelivery(actor, delivery, now())).map(delivery => redact(actor, delivery));
    },
    async listAvailableJobs(actor) {
      const operation = await ready(); ensureCurrent(operation); identify(actor); if (actor.role !== 'rider') fail('forbidden', 'Only a rider can discover available jobs.');
      return [...deliveries.values()].filter(delivery => delivery.status === 'booked' && !delivery.riderId).map(delivery => copy({
        id: delivery.id, reference: delivery.reference, description: delivery.description, size: delivery.size,
        window: delivery.window, status: delivery.status,
      }));
    },
    async getDelivery(actor, id) { const operation = await ready(); ensureCurrent(operation); identify(actor); const delivery = find(id); authorize(actor, delivery); return redact(actor, delivery); },
    async listNotifications(actor) { const operation = await ready(); ensureCurrent(operation); identify(actor); return copy(notifications.filter(item => item.userId === actor.id)); },
    async markNotificationRead(actor, id) {
      const operation = await ready(); ensureCurrent(operation); identify(actor); const notification = notifications.find(item => item.id === id && item.userId === actor.id);
      if (!notification) fail('not_found', 'Notification not found.');
      notification.readAt ??= timestamp(); emit();
    },
    async issueHandoffCode(actor, id): Promise<IssuedHandoffCode> {
      const operation = await ready(); ensureCurrent(operation); identify(actor); const delivery = find(id); authorize(actor, delivery); mutable(delivery);
      const holder = issueAllowed(actor, delivery);
      const recent = (issuances.get(id) ?? []).filter(time => now() - time < 900_000);
      if (recent.length >= 5 || (recent.length > 0 && now() - recent[recent.length - 1] < 30_000)) fail('rate_limited', 'Wait before issuing another demonstration code.');
      recent.push(now()); issuances.set(id, recent);
      // Deterministic plaintext is intentionally private to this in-memory mock adapter.
      const code = String(100_000 + (++sequence % 900_000));
      const expiresAt = Math.min(now() + 900_000, Date.parse(delivery.window.end));
      challenges.set(id, { code, expiresAt, receiverId: holder, windowVersion: delivery.window.version,
        failures: 0, consumed: false, revoked: false });
      return { code, expiresAt: new Date(expiresAt).toISOString(), simulated: true };
    },
    async execute(actor, command: DeliveryCommand) {
      const operation = await ready(); ensureCurrent(operation); identify(actor);
      if (command.type === 'book') {
        if (actor.role !== 'sender') fail('forbidden', 'Only a sender can book a parcel.');
        const input = command.input; validateWindow(input.window);
        if (!DEMO_PEOPLE.some(person => person.id === input.recipientId && person.roles.includes('recipient'))) fail('invalid_input', 'Choose an existing demo recipient.');
        if (!input.description.trim() || input.description.length > 300 || !['small', 'medium', 'large'].includes(input.size)) fail('invalid_input', 'Enter a parcel description and valid size.');
        for (const address of [input.pickup, input.dropoff]) {
          if (!address.label.trim() || !address.address.trim() || address.address.length > 500) fail('invalid_input', 'Enter pickup and destination addresses.');
          validateCoordinates(address);
        }
        const entrance = input.entrance ?? { instructions: '' }; validateEntrance(entrance);
        const delivery: Delivery = {
          id: nextId('delivery'), reference: `PC-${1043 + sequence}`, senderId: actor.id,
          recipientId: input.recipientId, riderId: null, description: input.description.trim(), size: input.size,
          pickup: copy(input.pickup), dropoff: copy(input.dropoff), window: { ...copy(input.window), version: 1 },
          status: 'booked', availability: { status: 'pending', windowVersion: 1, respondedAt: null },
          receiver: null, entrance: copy(entrance), reschedule: null, events: [], createdAt: timestamp(), updatedAt: timestamp(), deliveredAt: null,
        };
        record(delivery, actor.id, 'booked', 'Parcel booked. Availability confirmation needed.');
        deliveries.set(delivery.id, delivery); emit(); return redact(actor, delivery);
      }
      const current = find(command.deliveryId);
      if (command.type !== 'accept_job') authorize(actor, current);
      // A repeated successful verification is idempotent only for its assigned rider and same key.
      if (command.type === 'verify_handoff' && current.status === 'delivered') {
        assignedRider(actor, current); const challenge = challenges.get(current.id);
        if (command.idempotencyKey && challenge?.completionKey === command.idempotencyKey) return redact(actor, current);
        return fail('code_used', 'This delivery has already been verified.');
      }
      mutable(current); const delivery = copy(current); let message: string; const extraRecipients: string[] = [];
      switch (command.type) {
        case 'respond_availability':
          recipient(actor, delivery); invalidate(delivery.id);
          if (delivery.receiver) {
            if (hasActiveReceiver(delivery, now())) extraRecipients.push(delivery.receiver.receiverId);
            delivery.receiver.status = 'revoked';
          }
          delivery.availability = { status: command.available ? 'available' : 'unavailable', windowVersion: delivery.window.version, respondedAt: timestamp() };
          message = command.available ? 'Recipient availability confirmed.' : 'Recipient is unavailable. Handoff coordination needed.';
          if (extraRecipients.length) message += ' Previous receiver authorization revoked.';
          break;
        case 'invite_receiver':
          recipient(actor, delivery);
          if (!DEMO_PEOPLE.some(person => person.id === command.receiverId && person.roles.includes('receiver')) || command.receiverId === delivery.recipientId) fail('invalid_input', 'Choose an existing trusted receiver.');
          if (Date.parse(delivery.window.end) <= now()) fail('invalid_input', 'Request a current delivery window before inviting a receiver.');
          invalidate(delivery.id);
          if (delivery.receiver && hasActiveReceiver(delivery, now())) extraRecipients.push(delivery.receiver.receiverId);
          delivery.receiver = { id: nextId('authorization'), receiverId: command.receiverId, status: 'pending', windowVersion: delivery.window.version, expiresAt: delivery.window.end };
          delivery.availability = { status: 'unavailable', windowVersion: delivery.window.version, respondedAt: timestamp() };
          message = 'Trusted receiver invited. Waiting for acceptance.'; break;
        case 'respond_receiver':
          if (actor.id !== delivery.receiver?.receiverId || delivery.receiver.status !== 'pending') fail('forbidden', 'This invitation is not pending for your account.');
          if (!hasActiveReceiver(delivery, now())) fail('invitation_expired', 'This receiver invitation has expired.');
          delivery.receiver.status = command.accept ? 'accepted' : 'declined';
          delivery.availability = { status: command.accept ? 'alternative_confirmed' : 'unavailable', windowVersion: delivery.window.version, respondedAt: timestamp() };
          message = command.accept ? 'Trusted receiver accepted the handoff.' : 'Trusted receiver declined the invitation.'; break;
        case 'revoke_receiver':
          recipient(actor, delivery); if (!delivery.receiver || !hasActiveReceiver(delivery, now())) fail('invalid_transition', 'There is no active receiver authorization.');
          extraRecipients.push(delivery.receiver.receiverId); delivery.receiver.status = 'revoked'; invalidate(delivery.id);
          delivery.availability = { status: 'unavailable', windowVersion: delivery.window.version, respondedAt: timestamp() };
          message = 'Receiver authorization revoked. Confirm a new handoff.'; break;
        case 'accept_job':
          if (actor.role !== 'rider') fail('forbidden', 'Only an eligible rider can accept a job.');
          if (delivery.status !== 'booked' || delivery.riderId) fail('invalid_transition', 'Another rider has already accepted this job.');
          delivery.riderId = actor.id; delivery.status = 'accepted'; message = 'A rider accepted the delivery.'; break;
        case 'pickup':
        case 'dispatch':
          assignedRider(actor, delivery);
          if (delivery.status !== (command.type === 'pickup' ? 'accepted' : 'picked_up')) fail('invalid_transition', 'Follow the delivery steps in order.');
          if (!isConfirmationCurrent(delivery, now())) fail('confirmation_required', 'Confirm availability for the active window before proceeding.');
          delivery.status = command.type === 'pickup' ? 'picked_up' : 'out_for_delivery';
          message = command.type === 'pickup' ? 'Parcel picked up.' : 'Parcel is out for delivery.'; break;
        case 'verify_handoff': {
          assignedRider(actor, delivery);
          if (delivery.status !== 'out_for_delivery') fail('invalid_transition', 'The parcel is not out for delivery.');
          const challenge = challenges.get(delivery.id);
          if (!challenge) fail('code_invalid', 'Ask the authorized receiver to issue a demonstration code.');
          if (challenge.consumed) fail('code_used', 'This code was already used.');
          if (challenge.revoked || challenge.windowVersion !== delivery.window.version) fail('code_revoked', 'This code was revoked. Ask for a new code.');
          if (challenge.expiresAt <= now()) fail('code_expired', 'This code expired. Ask for a new code.');
          if (challenge.failures >= 5) fail('code_locked', 'Too many incorrect attempts. Ask for a replacement code.');
          if (!isConfirmationCurrent(delivery, now()) || challenge.receiverId !== (delivery.availability.status === 'available' ? delivery.recipientId : delivery.receiver?.receiverId)) fail('code_revoked', 'The authorized handoff has changed.');
          if (!/^\d{6}$/.test(command.code) || command.code !== challenge.code) {
            challenge.failures += 1;
            fail(challenge.failures >= 5 ? 'code_locked' : 'code_invalid', challenge.failures >= 5 ? 'Too many incorrect attempts. Ask for a replacement code.' : 'The demonstration code does not match.');
          }
          challenge.consumed = true; challenge.completionKey = command.idempotencyKey;
          delivery.status = 'delivered'; delivery.deliveredAt = timestamp(); message = 'Delivery completed with handoff verification.'; break;
        }
        case 'cancel':
          if (actor.id !== delivery.senderId) fail('forbidden', 'Only the sender can cancel the delivery.');
          if (!['booked', 'accepted'].includes(delivery.status)) fail('invalid_transition', 'Cancellation is unavailable after pickup.');
          invalidate(delivery.id); delivery.status = 'cancelled'; if (delivery.receiver) { extraRecipients.push(delivery.receiver.receiverId); delivery.receiver.status = 'revoked'; }
          message = 'Delivery cancelled before pickup.'; break;
        case 'request_reschedule':
          recipient(actor, delivery); validateWindow(command.window);
          delivery.reschedule = { ...copy(command.window), requestedBy: actor.id, acknowledgements: [] };
          delivery.availability = { status: 'unavailable', windowVersion: delivery.window.version, respondedAt: timestamp() };
          invalidate(delivery.id); message = 'A different delivery window was requested.'; break;
        case 'acknowledge_reschedule': {
          if (actor.id !== delivery.senderId && actor.id !== delivery.riderId) fail('forbidden', 'Only the sender and assigned rider can acknowledge this request.');
          if (!delivery.reschedule) fail('invalid_transition', 'There is no pending window request.');
          validateWindow(delivery.reschedule);
          if (!delivery.reschedule.acknowledgements.includes(actor.id)) delivery.reschedule.acknowledgements.push(actor.id);
          const required = [delivery.senderId, delivery.riderId].filter((value): value is string => value !== null);
          if (required.every(id => delivery.reschedule?.acknowledgements.includes(id))) {
            delivery.window = { start: delivery.reschedule.start, end: delivery.reschedule.end, version: delivery.window.version + 1 };
            delivery.reschedule = null; delivery.availability = { status: 'pending', windowVersion: delivery.window.version, respondedAt: null };
            if (delivery.receiver) { extraRecipients.push(delivery.receiver.receiverId); delivery.receiver.status = 'revoked'; }
            invalidate(delivery.id); message = 'New window agreed. Fresh availability confirmation needed.';
          } else message = 'Window request acknowledged. Waiting for the other participant.';
          break;
        }
        case 'update_entrance':
          recipient(actor, delivery); validateEntrance(command.entrance); delivery.entrance = copy(command.entrance);
          message = 'Entrance guidance updated.'; break;
      }
      record(delivery, actor.id, command.type, message, extraRecipients);
      deliveries.set(delivery.id, delivery); emit(); return redact(actor, delivery);
    },
  };
}
