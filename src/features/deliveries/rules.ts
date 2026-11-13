import type { Actor, Delivery, DeliveryCommand } from './types';

export function isTerminal(delivery: Delivery) {
  return delivery.status === 'delivered' || delivery.status === 'cancelled';
}
export function hasActiveReceiver(delivery: Delivery, now = Date.now()) {
  return !!delivery.receiver && ['pending', 'accepted'].includes(delivery.receiver.status)
    && delivery.receiver.windowVersion === delivery.window.version
    && Date.parse(delivery.receiver.expiresAt) > now;
}
export function canAccessDelivery(actor: Actor, delivery: Delivery, now = Date.now()) {
  return delivery.senderId === actor.id || delivery.recipientId === actor.id
    || delivery.riderId === actor.id
    || (delivery.receiver?.receiverId === actor.id && hasActiveReceiver(delivery, now));
}
export function isConfirmationCurrent(delivery: Delivery, now = Date.now()) {
  if (delivery.availability.windowVersion !== delivery.window.version || Date.parse(delivery.window.end) <= now) return false;
  return delivery.availability.status === 'available'
    || (delivery.availability.status === 'alternative_confirmed'
      && delivery.receiver?.status === 'accepted' && hasActiveReceiver(delivery, now));
}
/** UI hints only. Each gateway must authorize every command independently. */
export function getAllowedActions(actor: Actor, delivery: Delivery, now = Date.now()): DeliveryCommand['type'][] {
  if (isTerminal(delivery)) return [];
  const actions: DeliveryCommand['type'][] = [];
  if (actor.id === delivery.senderId && ['booked', 'accepted'].includes(delivery.status)) actions.push('cancel');
  if (actor.id === delivery.recipientId) {
    actions.push('respond_availability', 'invite_receiver', 'request_reschedule', 'update_entrance');
    if (hasActiveReceiver(delivery, now)) actions.push('revoke_receiver');
  }
  if (actor.id === delivery.receiver?.receiverId && delivery.receiver.status === 'pending' && hasActiveReceiver(delivery, now)) actions.push('respond_receiver');
  if (actor.role === 'rider' && delivery.status === 'booked' && !delivery.riderId) actions.push('accept_job');
  if (actor.id === delivery.riderId && isConfirmationCurrent(delivery, now)) {
    if (delivery.status === 'accepted') actions.push('pickup');
    if (delivery.status === 'picked_up') actions.push('dispatch');
    if (delivery.status === 'out_for_delivery') actions.push('verify_handoff');
  }
  if (delivery.reschedule && (actor.id === delivery.senderId || actor.id === delivery.riderId)) actions.push('acknowledge_reschedule');
  return actions;
}
