const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createMockGateway } = require('./mock-gateway.ts');
const { DEMO_ACTORS: actors, DEMO_DELIVERY_ID: id } = require('./fixtures.ts');
const { getAllowedActions, isConfirmationCurrent } = require('./rules.ts');
const start = Date.parse('2026-11-13T08:00:00Z');
function setup() {
  let clock = start;
  const gateway = createMockGateway({ now: () => clock });
  return { gateway, advance(ms) { clock += ms; } };
}
const command = (type, extra = {}) => ({ type, deliveryId: id, ...extra });
const rejectsCode = (promise, code) => assert.rejects(promise, error => error.code === code);
async function dispatch(gateway, alternative = false) {
  if (alternative) {
    await gateway.execute(actors.recipient, command('invite_receiver', { receiverId: actors.receiver.id }));
    await gateway.execute(actors.receiver, command('respond_receiver', { accept: true }));
  } else await gateway.execute(actors.recipient, command('respond_availability', { available: true }));
  await gateway.execute(actors.rider, command('accept_job'));
  await gateway.execute(actors.rider, command('pickup'));
  await gateway.execute(actors.rider, command('dispatch'));
}

test('recipient happy path, challenge privacy and idempotent completion', async () => {
  const { gateway } = setup(); await dispatch(gateway);
  await rejectsCode(gateway.issueHandoffCode(actors.rider, id), 'forbidden');
  const issued = await gateway.issueHandoffCode(actors.recipient, id);
  assert.equal(issued.simulated, true); assert.match(issued.code, /^\d{6}$/);
  assert.ok(!JSON.stringify(await gateway.getDelivery(actors.rider, id)).includes(issued.code));
  const verified = await gateway.execute(actors.rider, command('verify_handoff', { code: issued.code, idempotencyKey: 'handoff-1' }));
  assert.equal(verified.status, 'delivered');
  const repeated = await gateway.execute(actors.rider, command('verify_handoff', { code: issued.code, idempotencyKey: 'handoff-1' }));
  assert.equal(repeated.events.filter(event => event.type === 'verify_handoff').length, 1);
  await rejectsCode(gateway.execute(actors.rider, command('verify_handoff', { code: issued.code })), 'code_used');
});

test('only accepted trusted receiver may issue code; recipient cannot act as receiver', async () => {
  const { gateway } = setup(); await dispatch(gateway, true);
  await rejectsCode(gateway.issueHandoffCode(actors.recipient, id), 'forbidden');
  const issued = await gateway.issueHandoffCode(actors.receiver, id);
  assert.equal((await gateway.execute(actors.rider, command('verify_handoff', { code: issued.code }))).status, 'delivered');
});

test('missing confirmation and pending receiver invitation block pickup', async () => {
  const { gateway } = setup(); await gateway.execute(actors.rider, command('accept_job'));
  await rejectsCode(gateway.execute(actors.rider, command('pickup')), 'confirmation_required');
  await gateway.execute(actors.recipient, command('invite_receiver', { receiverId: actors.receiver.id }));
  const pending = await gateway.getDelivery(actors.receiver, id);
  assert.equal(pending.entrance.instructions, '');
  assert.ok(!pending.dropoff.address.includes('42 Example'));
  await rejectsCode(gateway.execute(actors.rider, command('pickup')), 'confirmation_required');
  assert.equal((await gateway.getDelivery(actors.sender, id)).status, 'accepted');
});

test('job discovery exposes summaries only and unrelated users cannot query parcels', async () => {
  const { gateway } = setup();
  const jobs = await gateway.listAvailableJobs(actors.rider);
  assert.equal(jobs.length, 1); assert.equal(jobs[0].pickup, undefined);
  await rejectsCode(gateway.getDelivery(actors.rider, id), 'forbidden');
  await rejectsCode(gateway.getDelivery(actors.unrelated, id), 'forbidden');
  await rejectsCode(gateway.execute(actors.unrelated, command('cancel')), 'forbidden');
  assert.deepEqual(await gateway.listDeliveries(actors.unrelated), []);
  await rejectsCode(gateway.listAvailableJobs({ id: actors.recipient.id, role: 'rider' }), 'forbidden');
});

test('commands require the correct participant and cannot skip transport steps', async () => {
  const { gateway } = setup();
  await rejectsCode(gateway.execute(actors.sender, command('respond_availability', { available: true })), 'forbidden');
  await gateway.execute(actors.rider, command('accept_job'));
  await rejectsCode(gateway.execute(actors.sender, command('pickup')), 'forbidden');
  await rejectsCode(gateway.execute(actors.rider, command('dispatch')), 'invalid_transition');
  assert.equal((await gateway.getDelivery(actors.sender, id)).status, 'accepted');
});

test('competing accept requests result in exactly one acceptance', async () => {
  const { gateway } = setup();
  const results = await Promise.allSettled([gateway.execute(actors.rider, command('accept_job')), gateway.execute(actors.rider, command('accept_job'))]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  const parcel = await gateway.getDelivery(actors.rider, id);
  assert.equal(parcel.events.filter(event => event.type === 'accept_job').length, 1);
});

test('code failures accumulate, lock on fifth attempt and regeneration invalidates old code', async () => {
  const { gateway, advance } = setup(); await dispatch(gateway);
  const original = await gateway.issueHandoffCode(actors.recipient, id);
  for (let attempt = 0; attempt < 4; attempt++) await rejectsCode(gateway.execute(actors.rider, command('verify_handoff', { code: '000000' })), 'code_invalid');
  await rejectsCode(gateway.execute(actors.rider, command('verify_handoff', { code: '000000' })), 'code_locked');
  await rejectsCode(gateway.execute(actors.rider, command('verify_handoff', { code: original.code })), 'code_locked');
  await rejectsCode(gateway.issueHandoffCode(actors.recipient, id), 'rate_limited');
  advance(31_000);
  const replacement = await gateway.issueHandoffCode(actors.recipient, id);
  assert.notEqual(replacement.code, original.code);
  await rejectsCode(gateway.execute(actors.rider, command('verify_handoff', { code: original.code })), 'code_invalid');
  assert.equal((await gateway.execute(actors.rider, command('verify_handoff', { code: replacement.code }))).status, 'delivered');
});

test('expired challenge cannot complete delivery', async () => {
  const { gateway, advance } = setup(); await dispatch(gateway);
  const issued = await gateway.issueHandoffCode(actors.recipient, id); advance(900_001);
  await rejectsCode(gateway.execute(actors.rider, command('verify_handoff', { code: issued.code })), 'code_expired');
  assert.equal((await gateway.getDelivery(actors.sender, id)).status, 'out_for_delivery');
});

test('receiver revocation removes access and invalidates an issued code', async () => {
  const { gateway } = setup(); await dispatch(gateway, true);
  const issued = await gateway.issueHandoffCode(actors.receiver, id);
  await gateway.execute(actors.recipient, command('revoke_receiver'));
  await rejectsCode(gateway.getDelivery(actors.receiver, id), 'forbidden');
  await rejectsCode(gateway.execute(actors.rider, command('verify_handoff', { code: issued.code })), 'code_revoked');
  const inbox = await gateway.listNotifications(actors.receiver);
  assert.ok(inbox.some(item => item.title.includes('revoked')));
});

test('recipient becoming unavailable after pickup blocks handoff without cancelling', async () => {
  const { gateway } = setup(); await dispatch(gateway);
  const issued = await gateway.issueHandoffCode(actors.recipient, id);
  await gateway.execute(actors.recipient, command('respond_availability', { available: false }));
  await rejectsCode(gateway.execute(actors.rider, command('verify_handoff', { code: issued.code })), 'code_revoked');
  assert.equal((await gateway.getDelivery(actors.sender, id)).status, 'out_for_delivery');
  await rejectsCode(gateway.execute(actors.sender, command('cancel')), 'invalid_transition');
});

test('rescheduling requires sender and assigned rider; new window invalidates confirmation', async () => {
  const { gateway } = setup(); await dispatch(gateway);
  const before = await gateway.getDelivery(actors.recipient, id);
  await gateway.execute(actors.recipient, command('request_reschedule', { window: { start: new Date(start + 14_400_000).toISOString(), end: new Date(start + 18_000_000).toISOString() } }));
  const partial = await gateway.execute(actors.sender, command('acknowledge_reschedule'));
  assert.equal(partial.window.version, before.window.version);
  const changed = await gateway.execute(actors.rider, command('acknowledge_reschedule'));
  assert.equal(changed.window.version, before.window.version + 1);
  assert.equal(changed.availability.status, 'pending');
  assert.equal(isConfirmationCurrent(changed, start), false);
  assert.deepEqual(getAllowedActions(actors.rider, changed, start).filter(action => action === 'verify_handoff'), []);
});

test('expired invitations cannot be accepted and never confirm dispatch', async () => {
  const { gateway, advance } = setup();
  await gateway.execute(actors.recipient, command('invite_receiver', { receiverId: actors.receiver.id }));
  advance(10_800_001);
  await rejectsCode(gateway.execute(actors.receiver, command('respond_receiver', { accept: true })), 'forbidden');
  assert.equal((await gateway.getDelivery(actors.recipient, id)).availability.status, 'unavailable');
});

test('booking validates chronology and creates independent records; callers cannot mutate state', async () => {
  const { gateway } = setup(); const seed = await gateway.getDelivery(actors.sender, id);
  const input = { recipientId: actors.recipient.id, description: 'Demo books', size: 'small', pickup: seed.pickup, dropoff: seed.dropoff, window: seed.window };
  await rejectsCode(gateway.execute(actors.sender, { type: 'book', input: { ...input, window: { start: 'invalid', end: 'invalid' } } }), 'invalid_input');
  const booked = await gateway.execute(actors.sender, { type: 'book', input });
  assert.notEqual(booked.id, id); booked.pickup.address = 'Injected';
  assert.notEqual((await gateway.getDelivery(actors.sender, booked.id)).pickup.address, 'Injected');
  assert.equal((await gateway.listDeliveries(actors.sender)).length, 2);
});

test('notification ownership, offline error recovery, and reset are explicit', async () => {
  const { gateway } = setup();
  const notification = (await gateway.listNotifications(actors.recipient))[0];
  await rejectsCode(gateway.markNotificationRead(actors.sender, notification.id), 'not_found');
  await gateway.markNotificationRead(actors.recipient, notification.id);
  assert.ok((await gateway.listNotifications(actors.recipient))[0].readAt);
  gateway.setOnline(false); await rejectsCode(gateway.getDelivery(actors.sender, id), 'offline');
  await gateway.resetDemo();
  const reset = await gateway.getDelivery(actors.sender, id);
  assert.equal(reset.status, 'booked'); assert.equal(reset.availability.status, 'pending');
  assert.equal((await gateway.listNotifications(actors.recipient))[0].readAt, null);
});

test('cancelled and delivered records are terminal', async () => {
  const { gateway } = setup(); await gateway.execute(actors.sender, command('cancel'));
  await rejectsCode(gateway.execute(actors.recipient, command('respond_availability', { available: true })), 'invalid_transition');
  assert.equal((await gateway.getDelivery(actors.sender, id)).status, 'cancelled');
  assert.deepEqual(getAllowedActions(actors.sender, await gateway.getDelivery(actors.sender, id), start), []);
});


test('switching back to recipient availability notifies the revoked receiver', async () => {
  const { gateway } = setup();
  await gateway.execute(actors.recipient, command('invite_receiver', { receiverId: actors.receiver.id }));
  await gateway.execute(actors.receiver, command('respond_receiver', { accept: true }));
  const count = (await gateway.listNotifications(actors.receiver)).length;
  await gateway.execute(actors.recipient, command('respond_availability', { available: true }));
  const inbox = await gateway.listNotifications(actors.receiver);
  assert.equal(inbox.length, count + 1);
  assert.ok(inbox[inbox.length - 1].title.includes('revoked'));
  await rejectsCode(gateway.getDelivery(actors.receiver, id), 'forbidden');
});
