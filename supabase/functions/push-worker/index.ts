import { dispatchPushBatch, type PushJob, type PushResult } from './core.ts';

declare const Deno: { env: { get(name: string): string | undefined }; serve(handler: (request: Request) => Promise<Response>): void };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
function secretMatches(actual: string, expected: string) {
  let difference = actual.length ^ expected.length;
  for (let i = 0; i < Math.max(actual.length, expected.length); i++) difference |= (actual.charCodeAt(i) || 0) ^ (expected.charCodeAt(i) || 0);
  return difference === 0;
}
Deno.serve(async request => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const workerSecret = Deno.env.get('PUSH_WORKER_SECRET');
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!workerSecret || workerSecret.length < 32 || !url || !key) return json({ error: 'Worker is not configured.' }, 503);
  if (!secretMatches(request.headers.get('authorization') ?? '', `Bearer ${workerSecret}`)) return json({ error: 'Unauthorized.' }, 401);
  const rpc = async <T>(name: string, args: Record<string, unknown>): Promise<T> => {
    const response = await fetch(`${url}/rest/v1/rpc/${name}`, { method: 'POST',
      headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: JSON.stringify(args) });
    if (!response.ok) throw new Error('Outbox operation failed.');
    return response.json() as Promise<T>;
  };
  const expo = async (path: string, body: unknown) => {
    const accessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
    const response = await fetch(`https://exp.host/--/api/v2/push/${path}`, { method: 'POST',
      headers: { 'content-type': 'application/json', ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}) },
      body: JSON.stringify(body), signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error('Push transport is temporarily unavailable.');
    return response.json();
  };
  try {
    const result = await dispatchPushBatch({
      claim: limit => rpc<PushJob[]>('notification_claim_batch', { p_limit: limit }),
      record: (job, result: PushResult, receiptId, retryAt) => rpc<void>('notification_record_result', {
        p_outbox_id: job.id, p_lease_id: job.lease_id, p_result: result, p_receipt_id: receiptId, p_retry_at: retryAt,
      }),
    }, { send: payload => expo('send', payload), receipt: id => expo('getReceipts', { ids: [id] }) });
    return json(result);
  } catch { return json({ error: 'Notification dispatch failed; pending work will be retried.' }, 503); }
});
