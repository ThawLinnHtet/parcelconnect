import type { Actor, Delivery, DeliveryCommand, IssuedHandoffCode, JobSummary, Notification, Person } from './types';

/** Screens consume this contract; each adapter owns transport/storage details. */
export interface DeliveryGateway {
  readonly mode: 'mock' | 'connected';
  listPeople(actor: Actor): Promise<Person[]>;
  listDeliveries(actor: Actor): Promise<Delivery[]>;
  listAvailableJobs(actor: Actor): Promise<JobSummary[]>;
  getDelivery(actor: Actor, id: string): Promise<Delivery>;
  execute(actor: Actor, command: DeliveryCommand): Promise<Delivery>;
  issueHandoffCode(actor: Actor, deliveryId: string): Promise<IssuedHandoffCode>;
  listNotifications(actor: Actor): Promise<Notification[]>;
  markNotificationRead(actor: Actor, notificationId: string): Promise<void>;
  /** An optional foreground invalidation signal, not a durable event stream. */
  subscribe?(listener: () => void): () => void;
  resetDemo?(): Promise<void>;
}
