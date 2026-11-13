export type Role = 'sender' | 'recipient' | 'rider' | 'receiver';
/** A mock perspective, never a replacement for a connected authentication session. */
export type Actor = { id: string; role: Role };
export type Person = { id: string; displayName: string; roles: Role[] };
export type TransportStatus = 'booked' | 'accepted' | 'picked_up' | 'out_for_delivery' | 'delivered' | 'cancelled';
export type AvailabilityStatus = 'pending' | 'available' | 'unavailable' | 'alternative_confirmed';
export type DeliveryWindow = { start: string; end: string; version: number };
export type Address = { label: string; address: string; latitude?: number; longitude?: number };
export type EntranceGuidance = { instructions: string; photoPath?: string; latitude?: number; longitude?: number };
export type ReceiverAuthorization = {
  id: string; receiverId: string; status: 'pending' | 'accepted' | 'declined' | 'revoked';
  windowVersion: number; expiresAt: string;
};
export type DeliveryEvent = { id: string; deliveryId: string; actorId: string; type: string; message: string; createdAt: string };
export type RescheduleRequest = {
  start: string; end: string; requestedBy: string; acknowledgements: string[];
};
export type Delivery = {
  id: string; reference: string; senderId: string; recipientId: string; riderId: string | null;
  description: string; size: 'small' | 'medium' | 'large'; pickup: Address; dropoff: Address;
  window: DeliveryWindow; status: TransportStatus;
  availability: { status: AvailabilityStatus; windowVersion: number; respondedAt: string | null };
  receiver: ReceiverAuthorization | null; entrance: EntranceGuidance;
  reschedule: RescheduleRequest | null; events: DeliveryEvent[];
  createdAt: string; updatedAt: string; deliveredAt: string | null;
};
/** Discovery deliberately omits addresses and entrance data until assignment. */
export type JobSummary = Pick<Delivery, 'id' | 'reference' | 'description' | 'size' | 'window' | 'status'>;
export type Notification = { id: string; userId: string; deliveryId: string; title: string; body: string; createdAt: string; readAt: string | null };
export type BookingInput = {
  recipientId: string; description: string; size: Delivery['size']; pickup: Address; dropoff: Address;
  window: Pick<DeliveryWindow, 'start' | 'end'>; entrance?: EntranceGuidance;
};
export type DeliveryCommand =
  | { type: 'book'; input: BookingInput }
  | { type: 'respond_availability'; deliveryId: string; available: boolean }
  | { type: 'invite_receiver'; deliveryId: string; receiverId: string }
  | { type: 'respond_receiver'; deliveryId: string; accept: boolean }
  | { type: 'revoke_receiver'; deliveryId: string }
  | { type: 'accept_job'; deliveryId: string }
  | { type: 'pickup'; deliveryId: string }
  | { type: 'dispatch'; deliveryId: string }
  | { type: 'verify_handoff'; deliveryId: string; code: string; idempotencyKey?: string }
  | { type: 'cancel'; deliveryId: string }
  | { type: 'request_reschedule'; deliveryId: string; window: Pick<DeliveryWindow, 'start' | 'end'> }
  | { type: 'acknowledge_reschedule'; deliveryId: string }
  | { type: 'update_entrance'; deliveryId: string; entrance: EntranceGuidance };
export type IssuedHandoffCode = { code: string; expiresAt: string; simulated: boolean };
export type DomainErrorCode = 'forbidden' | 'not_found' | 'invalid_input' | 'invalid_transition' | 'confirmation_required' | 'invitation_expired' | 'code_invalid' | 'code_expired' | 'code_locked' | 'code_revoked' | 'code_used' | 'rate_limited' | 'offline' | 'unavailable';
export class DeliveryError extends Error {
  readonly code: DomainErrorCode;
  constructor(code: DomainErrorCode, message: string) { super(message); this.name = 'DeliveryError'; this.code = code; }
}
export type LoadState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T; stale: boolean }
  | { status: 'error'; error: string; cached?: T };
