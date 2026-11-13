const test = require('node:test');
const assert = require('node:assert/strict');
const { SessionScope, SessionChangedError, prepareSessionChange } = require('../session-scope.ts');
const { runBeforeSignOut, registerBeforeSignOut } = require('../session-lifecycle.ts');
const { createSupabaseGateway } = require('../../deliveries/supabase-gateway.ts');

function clientFor(userId = 'account-a') {
  let invocation;
  const events = []; let subscribed; let removed = 0;
  const channel = { on(_type, _filter, listener) { events.push(listener); return this; }, subscribe(listener) { subscribed = listener; return this; } };
  const client = {
    auth: { getSession: async () => ({ data: { session: { user: { id: userId }, access_token: 'captured-token' } }, error: null }),
      getUser: async () => ({ data: { user: { id: userId } }, error: null }) },
    functions: { invoke: async (name, options) => { invocation = { name, ...options }; return { data: { data: [] }, error: null }; } },
    channel: () => channel, removeChannel: async () => { removed += 1; },
  };
  return { client, invocation: () => invocation, emit: () => events[0](), reconnect: () => subscribed('SUBSCRIBED'), removed: () => removed };
}

test('token refresh preserves subscriptions while actual account changes invalidate them', () => {
  const scope = new SessionScope(); scope.setIdentity('account-a');
  const stamp = scope.capture('account-a'); let cleanups = 0;
  scope.onInvalidate(() => { cleanups += 1; });
  assert.equal(prepareSessionChange(scope, 'account-a', 'account-a'), 'account-a');
  scope.assertCurrent(stamp); assert.equal(cleanups, 0);
  assert.equal(prepareSessionChange(scope, 'account-a', 'account-b'), 'account-b');
  assert.throws(() => scope.assertCurrent(stamp), SessionChangedError);
  assert.equal(cleanups, 1);
});

test('gateway captures the token and never submits the actor or its claimed role', async () => {
  const fake = clientFor(); const scope = new SessionScope(); scope.setIdentity('account-a');
  const gateway = createSupabaseGateway(fake.client, scope);
  assert.deepEqual(await gateway.listDeliveries({ id: 'account-a', role: 'rider' }), []);
  assert.deepEqual(fake.invocation(), { name: 'delivery-api', body: { action: 'list_deliveries', payload: {} }, headers: { Authorization: 'Bearer captured-token' } });
});

test('stale verification is discarded before a request can run under a different account', async () => {
  const fake = clientFor(); const scope = new SessionScope(); scope.setIdentity('account-a');
  let release;
  fake.client.auth.getUser = () => new Promise(resolve => { release = resolve; });
  const pending = createSupabaseGateway(fake.client, scope).listDeliveries({ id: 'account-a', role: 'sender' });
  await new Promise(resolve => setImmediate(resolve));
  scope.setIdentity('account-b'); release({ data: { user: { id: 'account-a' } }, error: null });
  await assert.rejects(pending, SessionChangedError); assert.equal(fake.invocation(), undefined);
});

test('connected backend failures retain their error and do not return demo data', async () => {
  const fake = clientFor(); const scope = new SessionScope(); scope.setIdentity('account-a');
  fake.client.functions.invoke = async () => ({ data: { error: { code: 'invalid_transition', message: 'Pickup needs confirmation.' } }, error: null });
  await assert.rejects(createSupabaseGateway(fake.client, scope).listDeliveries({ id: 'account-a', role: 'sender' }), error => error.code === 'invalid_transition' && error.message === 'Pickup needs confirmation.');
});

test('realtime survives refresh and refetches on reconnect; logout removes old listeners', () => {
  const fake = clientFor(); const scope = new SessionScope(); scope.setIdentity('account-a');
  const gateway = createSupabaseGateway(fake.client, scope); let updates = 0;
  gateway.subscribe(() => { updates += 1; });
  fake.emit(); assert.equal(updates, 1);
  prepareSessionChange(scope, 'account-a', 'account-a');
  fake.reconnect(); assert.equal(updates, 2); assert.equal(fake.removed(), 0);
  prepareSessionChange(scope, 'account-a', null);
  assert.equal(fake.removed(), 1); fake.emit(); assert.equal(updates, 2);
});

test('device cleanup runs before signout and surfaces failure instead of silently proceeding', async () => {
  const order = [];
  const unregister = registerBeforeSignOut(async userId => { order.push(`unlink:${userId}`); });
  await runBeforeSignOut('account-a'); order.push('signout');
  assert.deepEqual(order, ['unlink:account-a', 'signout']); unregister();
  const removeFailure = registerBeforeSignOut(async () => { throw new Error('offline'); });
  await assert.rejects(runBeforeSignOut('account-a'), /offline/); removeFailure();
});
