/** Pure worker core. IO is injected; no device token or payload is logged. */
export interface PushJob {
  id: string; lease_id: string; attempts: number; token: string;
  notification_id: string; user_id: string; delivery_id: string;
  title: string; body: string; receipt_id: string | null;
}
export type PushResult = 'sent' | 'delivered' | 'retry' | 'invalid_token' | 'failed';
export interface WorkerStore {
  claim(limit: number): Promise<PushJob[]>;
  record(job: PushJob, result: PushResult, receiptId: string | null, retryAt: string | null): Promise<void>;
}
interface ExpoResponse { data?: unknown; errors?: unknown }
export interface ExpoTransport {
  send(payload: { to: string; title: string; body: string; data: { deliveryId: string; notificationId: string }; sound: 'default'; channelId: 'deliveries' }): Promise<ExpoResponse>;
  receipt(id: string): Promise<ExpoResponse>;
}
const MAX_ATTEMPTS = 8;
const asObject = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {};
function retryAt(attempts: number, now: number) {
  return new Date(now + Math.min(60 * 60, 30 * 2 ** Math.max(0, attempts - 1)) * 1000).toISOString();
}
export async function dispatchPushBatch(store: WorkerStore, transport: ExpoTransport, now = Date.now(), limit = 25) {
  const jobs = await store.claim(Math.max(1, Math.min(100, Math.trunc(limit))));
  let processed = 0;
  for (const job of jobs) {
    let result: PushResult = job.attempts >= MAX_ATTEMPTS ? 'failed' : 'retry';
    let receiptId = job.receipt_id;
    try {
      const response = receiptId
        ? await transport.receipt(receiptId)
        : await transport.send({ to: job.token, title: 'ParcelConnect update', body: 'Open ParcelConnect to view your delivery update.',
          data: { deliveryId: job.delivery_id, notificationId: job.notification_id },
          sound: 'default', channelId: 'deliveries' });
      const raw = asObject(response.data);
      const item = receiptId ? asObject(raw[receiptId]) : raw;
      if (item.status === 'ok') {
        if (receiptId) result = 'delivered'; // Expo receipt success, not proof of display.
        else if (typeof item.id === 'string') { receiptId = item.id; result = 'sent'; }
      } else if (asObject(item.details).error === 'DeviceNotRegistered') result = 'invalid_token';
      else if (item.status === 'error' && asObject(item.details).error === 'MessageTooBig') result = 'failed';
    } catch {
      // Transport failures stay retryable; committed inbox/delivery state is untouched.
    }
    if (result === 'retry' && job.attempts >= MAX_ATTEMPTS) result = 'failed';
    const next = result === 'retry' || result === 'sent' ? retryAt(job.attempts, now) : null;
    // Lease validation inside this RPC rejects a stale worker's acknowledgement.
    await store.record(job, result, receiptId, next);
    processed++;
  }
  return { processed };
}
