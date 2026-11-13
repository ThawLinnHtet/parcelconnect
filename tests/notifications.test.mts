import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createTokenLifecycle, parseDeliveryNotification, resolveNotificationTarget } from '../src/features/notifications/token-lifecycle.ts';
import { entrancePhotoPath, parseEntranceCoordinates, validateEntrancePhoto } from '../src/features/entrance/validation.ts';
import { createEntrancePhotoService, decodePickedJpeg } from '../src/features/entrance/photo-service.ts';
import { dispatchPushBatch, type PushJob, type PushResult } from '../supabase/functions/push-worker/core.ts';

const TOKEN = 'ExpoPushToken[device_token]';
test('disconnect waits for in-flight registration and removes its token before signout', async () => {
  let current: string | null = 'alice';
  const calls: string[] = [];
  let release: (() => void) | undefined;
  const lifecycle = createTokenLifecycle({ currentUserId: () => current,
    register: async () => { calls.push('register'); await new Promise<void>(resolve => { release = resolve; }); },
    unregister: async () => { calls.push('unregister'); },
  });
  const registration = lifecycle.register('alice', 'installation', async () => ({ state: 'ready', token: TOKEN }));
  while (!release) await new Promise(resolve => setImmediate(resolve));
  const disconnect = lifecycle.disconnect();
  release();
  await registration;
  await disconnect;
  current = null;
  assert.deepEqual(calls, ['register', 'unregister']);
});
test('a permission acquisition finishing after account change cannot register to the next account', async () => {
  let current = 'alice'; let finish: ((value: { state: 'ready'; token: string }) => void) | undefined;
  const calls: string[] = [];
  const lifecycle = createTokenLifecycle({ currentUserId: () => current,
    register: async () => { calls.push('register'); }, unregister: async () => {} });
  const registration = lifecycle.register('alice', 'installation', () => new Promise(resolve => { finish = resolve; }));
  while (!finish) await new Promise(resolve => setImmediate(resolve));
  current = 'bob'; finish({ state: 'ready', token: TOKEN });
  await assert.rejects(registration, /Session changed/);
  assert.deepEqual(calls, []);
});
test('denied permission never registers a token or throws away the inbox', async () => {
  let called = false;
  const lifecycle = createTokenLifecycle({ currentUserId: () => 'alice', register: async () => { called = true; }, unregister: async () => {} });
  assert.deepEqual(await lifecycle.register('alice', 'device', async () => ({ state: 'denied' })), { state: 'denied' });
  assert.equal(called, false);
});
test('notification taps reject URL injection and require live delivery authorization', async () => {
  assert.equal(parseDeliveryNotification({ deliveryId: '../other', notificationId: 'n1' }), null);
  assert.equal(parseDeliveryNotification({ url: 'https://evil.example' }), null);
  await assert.rejects(resolveNotificationTarget({ deliveryId: 'parcel-1', notificationId: 'note-1' }, async () => { throw new Error('Access denied'); }), /Access denied/);
});
test('photo and pin validation rejects unsafe paths, wrong types, oversized files, and partial coordinates', () => {
  assert.equal(validateEntrancePhoto('image/jpeg', 100), 'image/jpeg');
  assert.throws(() => validateEntrancePhoto('image/svg+xml', 100));
  assert.throws(() => validateEntrancePhoto('image/jpeg', 6 * 1024 * 1024));
  assert.throws(() => entrancePhotoPath('../parcel', 'user', 'file', 'image/jpeg'));
  assert.equal(entrancePhotoPath('parcel', 'user', 'file', 'image/jpeg'), 'parcel/user/file.jpg');
  assert.equal(parseEntranceCoordinates('', ''), null);
  assert.throws(() => parseEntranceCoordinates('10', ''));
  assert.throws(() => parseEntranceCoordinates('91', '1'));
  assert.deepEqual(parseEntranceCoordinates('16.8', '96.1'), { latitude: 16.8, longitude: 96.1 });
});
const job: PushJob = { id: 'job', lease_id: 'lease', attempts: 1, token: TOKEN,
  notification_id: 'note', user_id: 'alice', delivery_id: 'parcel', title: 'secret address', body: 'secret code', receipt_id: null };
function storeFor(rows: PushJob[]) {
  const outcomes: { result: PushResult; receipt: string | null; retryAt: string | null }[] = [];
  return { outcomes, store: { claim: async () => rows,
    record: async (_job: PushJob, result: PushResult, receipt: string | null, retryAt: string | null) => { outcomes.push({ result, receipt, retryAt }); } } };
}
test('a send is not completion until its Expo receipt is checked and private text is excluded', async () => {
  const { store, outcomes } = storeFor([job]);
  await dispatchPushBatch(store, { send: async payload => {
    assert.equal(payload.title, 'ParcelConnect update');
    assert.equal(payload.body, 'Open ParcelConnect to view your delivery update.');
    assert.deepEqual(payload.data, { deliveryId: 'parcel', notificationId: 'note' });
    return { data: { status: 'ok', id: 'ticket' } };
  }, receipt: async () => { throw new Error('not yet'); } }, 0);
  assert.equal(outcomes[0].result, 'sent'); assert.equal(outcomes[0].receipt, 'ticket');
  const checked = storeFor([{ ...job, receipt_id: 'ticket' }]);
  await dispatchPushBatch(checked.store, { send: async () => { throw new Error('must not resend'); },
    receipt: async () => ({ data: { ticket: { status: 'ok' } } }) }, 0);
  assert.equal(checked.outcomes[0].result, 'delivered');
});
test('transport failures retry with a bound; invalid device tokens are pruned', async () => {
  const attempt = storeFor([job, { ...job, attempts: 8 }]);
  await dispatchPushBatch(attempt.store, { send: async () => { throw new Error('offline'); }, receipt: async () => ({}) }, 0);
  assert.equal(attempt.outcomes[0].result, 'retry');
  assert.equal(attempt.outcomes[0].retryAt, '1970-01-01T00:00:30.000Z');
  assert.equal(attempt.outcomes[1].result, 'failed');
  const invalid = storeFor([job]);
  await dispatchPushBatch(invalid.store, { send: async () => ({ data: { status: 'error', details: { error: 'DeviceNotRegistered' } } }), receipt: async () => ({}) });
  assert.equal(invalid.outcomes[0].result, 'invalid_token');
});
test('a pending receipt is polled again without resending and retains its ticket', async () => {
  const state = storeFor([{ ...job, receipt_id: 'pending' }]);
  await dispatchPushBatch(state.store, { send: async () => { throw new Error('must not resend'); }, receipt: async () => ({ data: {} }) }, 0);
  assert.deepEqual(state.outcomes[0], { result: 'retry', receipt: 'pending', retryAt: '1970-01-01T00:00:30.000Z' });
});

test('failed delivery attachment removes only its staged object and retains the old photo', async () => {
  const removed: string[][] = [];
  const service = createEntrancePhotoService({ upload: async () => ({ error: null }),
    remove: async paths => { removed.push(paths); return { error: null }; },
    createSignedUrl: async () => ({ data: null, error: { message: 'denied' } }),
  }, () => 'alice', () => 'fresh');
  await assert.rejects(service.uploadAndAttach('parcel', { bytes: new Uint8Array([1]).buffer, mime: 'image/jpeg' }, async () => { throw new Error('Access denied'); }), /Access denied/);
  assert.deepEqual(removed, [['parcel/alice/fresh.jpg']]);
});
test('picked bytes must actually be JPEG data', () => {
  assert.throws(() => decodePickedJpeg('aGVsbG8='), /JPEG/);
  assert.equal(decodePickedJpeg('/9j/AA==').bytes.byteLength, 4);
});

test('failed token unlink keeps its association so a logout retry can remove it', async () => {
  let attempts = 0;
  const lifecycle = createTokenLifecycle({ currentUserId: () => 'alice', register: async () => {},
    unregister: async () => { if (++attempts === 1) throw new Error('Network unavailable'); } });
  await lifecycle.register('alice', 'device', async () => ({ state: 'ready', token: TOKEN }));
  await assert.rejects(lifecycle.disconnect(), /Network unavailable/);
  await lifecycle.disconnect();
  assert.equal(attempts, 2);
});
test('same device token registration is deduplicated for the same account', async () => {
  let registrations = 0;
  const lifecycle = createTokenLifecycle({ currentUserId: () => 'alice', register: async () => { registrations++; }, unregister: async () => {} });
  const acquire = async () => ({ state: 'ready' as const, token: TOKEN });
  await lifecycle.register('alice', 'device', acquire);
  await lifecycle.register('alice', 'device', acquire);
  assert.equal(registrations, 1);
});
test('an account change after upload cannot attach the staged photo', async () => {
  let user = 'alice', attached = false;
  const removed: string[][] = [];
  const service = createEntrancePhotoService({ upload: async () => { user = 'bob'; return { error: null }; },
    remove: async paths => { removed.push(paths); return { error: null }; },
    createSignedUrl: async () => ({ data: null, error: null }),
  }, () => user, () => 'photo');
  await assert.rejects(service.uploadAndAttach('parcel', { bytes: new Uint8Array([1]).buffer, mime: 'image/jpeg' }, async () => { attached = true; }), /account changed/);
  assert.equal(attached, false);
  assert.deepEqual(removed, [['parcel/alice/photo.jpg']]);
});
