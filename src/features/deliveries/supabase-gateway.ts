import type { Session, SupabaseClient } from '@supabase/supabase-js';

import { onForeground } from '../auth/foreground-events';
import { SessionScope, sessionScope as sharedScope, type SessionStamp } from '../auth/session-scope';
import type { DeliveryGateway } from './gateway';
import { DeliveryError, type Actor, type Delivery, type DeliveryCommand, type DomainErrorCode, type IssuedHandoffCode, type JobSummary, type Notification, type Person } from './types';

type ApiEnvelope<T> = { data: T } | { error: { code: string; message: string } };
const knownCodes = new Set<DomainErrorCode>(['forbidden', 'not_found', 'invalid_input', 'invalid_transition', 'confirmation_required', 'invitation_expired', 'code_invalid', 'code_expired', 'code_locked', 'code_revoked', 'code_used', 'rate_limited', 'offline', 'unavailable']);
function serverError(value: { code: string; message: string }) {
  return new DeliveryError(knownCodes.has(value.code as DomainErrorCode) ? value.code as DomainErrorCode : 'unavailable', value.message);
}

/** Shared authenticated API transport for delivery and device-registration adapters. */
export function createConnectedApi(client: SupabaseClient, scope: SessionScope = sharedScope) {
  async function identity(actor: Actor): Promise<{ session: Session; stamp: SessionStamp }> {
    const stamp = scope.capture(actor.id);
    const { data, error } = await client.auth.getSession();
    scope.assertCurrent(stamp);
    if (error || !data.session || data.session.user.id !== actor.id) throw new DeliveryError('forbidden', 'Sign in with this account before accessing its deliveries.');
    const session = data.session;
    const { data: verified, error: verificationError } = await client.auth.getUser(session.access_token);
    scope.assertCurrent(stamp);
    if (verificationError || verified.user?.id !== actor.id) throw new DeliveryError('forbidden', 'Your session could not be verified. Sign in again.');
    return { session, stamp };
  }

  async function request<T>(actor: Actor, action: string, payload: object = {}): Promise<T> {
    const { session, stamp } = await identity(actor);
    try {
      const { data, error } = await client.functions.invoke<ApiEnvelope<T>>('delivery-api', {
        body: { action, payload }, headers: { Authorization: `Bearer ${session.access_token}` },
      });
      scope.assertCurrent(stamp);
      if (error) {
        const context: unknown = 'context' in error ? error.context : null;
        if (context instanceof Response) {
          let envelope: unknown;
          try { envelope = await context.clone().json(); } catch { /* Retain transport error below. */ }
          scope.assertCurrent(stamp);
          if (typeof envelope === 'object' && envelope !== null && 'error' in envelope) {
            const detail = envelope.error;
            if (typeof detail === 'object' && detail !== null && 'code' in detail && 'message' in detail && typeof detail.code === 'string' && typeof detail.message === 'string') throw serverError({ code: detail.code, message: detail.message });
          }
        }
        throw new DeliveryError('unavailable', 'The delivery service did not complete this request. Check your connection and try again.');
      }
      if (!data || typeof data !== 'object') throw new DeliveryError('unavailable', 'The delivery service returned an unexpected response.');
      if ('error' in data) throw serverError(data.error);
      if (!('data' in data)) throw new DeliveryError('unavailable', 'The delivery service returned an incomplete response.');
      return data.data;
    } catch (error) {
      scope.assertCurrent(stamp);
      if (error instanceof DeliveryError) throw error;
      throw new DeliveryError('unavailable', 'The delivery request failed. It has not been replaced with a demo result.');
    }
  }

  return request;
}

/** Explicit connected adapter: backend errors never become mock successes. */
export function createSupabaseGateway(client: SupabaseClient, scope: SessionScope = sharedScope): DeliveryGateway {
  const request = createConnectedApi(client, scope);
  let stopSubscription: (() => void) | undefined;
  const listeners = new Set<() => void>();
  const notify = () => { for (const listener of [...listeners]) listener(); };
  return {
    mode: 'connected',
    listPeople: actor => request<Person[]>(actor, 'list_people'),
    listDeliveries: actor => request<Delivery[]>(actor, 'list_deliveries'),
    listAvailableJobs: actor => request<JobSummary[]>(actor, 'list_available_jobs'),
    getDelivery: (actor, id) => request<Delivery>(actor, 'get_delivery', { id }),
    async execute(actor: Actor, command: DeliveryCommand) {
      const result = await request<Delivery>(actor, 'execute', command); notify(); return result;
    },
    issueHandoffCode: (actor, deliveryId) => request<IssuedHandoffCode>(actor, 'issue_handoff_code', { deliveryId }),
    listNotifications: actor => request<Notification[]>(actor, 'list_notifications'),
    async markNotificationRead(actor, notificationId) {
      await request<null>(actor, 'mark_notification_read', { notificationId }); notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      if (!stopSubscription) {
        const channel = client.channel(`delivery-foreground-${Math.random().toString(36).slice(2)}`);
        for (const table of ['deliveries', 'receiver_authorizations', 'delivery_events', 'notifications']) {
          channel.on('postgres_changes', { event: '*', schema: 'public', table }, notify);
        }
        channel.subscribe(status => { if (status === 'SUBSCRIBED') notify(); });
        const stopForeground = onForeground(notify);
        const unregisterInvalidation = scope.onInvalidate(() => {
          stopForeground(); void client.removeChannel(channel); listeners.clear(); stopSubscription = undefined;
        });
        stopSubscription = () => {
          stopForeground(); unregisterInvalidation(); void client.removeChannel(channel); stopSubscription = undefined;
        };
      }
      return () => {
        listeners.delete(listener);
        if (!listeners.size) stopSubscription?.();
      };
    },
  };
}
