const test = require('node:test');
const assert = require('node:assert/strict');
const { readSupabaseConfig } = require('../config.ts');
const jwt = role => `header.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature`;

test('missing config keeps connected mode unavailable without manufacturing demo success', () => {
  assert.equal(readSupabaseConfig({}).status, 'missing');
});
test('server secret and legacy service-role keys are rejected', () => {
  assert.equal(readSupabaseConfig({ url: 'https://example.supabase.co', publishableKey: 'sb_secret_private' }).status, 'invalid');
  assert.equal(readSupabaseConfig({ url: 'https://example.supabase.co', publishableKey: jwt('service_role') }).status, 'invalid');
});
test('publishable keys and local anon keys are allowed but insecure remote URLs are not', () => {
  assert.equal(readSupabaseConfig({ url: 'https://example.supabase.co/', publishableKey: 'sb_publishable_example' }).config.url, 'https://example.supabase.co');
  assert.equal(readSupabaseConfig({ url: 'http://192.168.1.2:54321', publishableKey: jwt('anon') }).status, 'ready');
  assert.equal(readSupabaseConfig({ url: 'http://public.example.com', publishableKey: 'sb_publishable_example' }).status, 'invalid');
});
