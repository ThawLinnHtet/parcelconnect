export type SupabaseConfig = { url: string; publishableKey: string };
export type SupabaseConfigResult =
  | { status: 'ready'; config: SupabaseConfig }
  | { status: 'missing' | 'invalid'; message: string };

function legacyRole(key: string): string | null {
  try {
    const payload = key.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
    if (!payload) return null;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let bits = 0; let value = 0; let decoded = '';
    for (const character of payload) {
      if (character === '=') break;
      const digit = alphabet.indexOf(character);
      if (digit < 0) return null;
      value = (value << 6) | digit; bits += 6;
      if (bits >= 8) { bits -= 8; decoded += String.fromCharCode((value >> bits) & 255); }
    }
    const claims: unknown = JSON.parse(decoded);
    return typeof claims === 'object' && claims !== null && 'role' in claims && typeof claims.role === 'string'
      ? claims.role : null;
  } catch { return null; }
}

/** Configuration is public. Reject server keys before any network client exists. */
export function readSupabaseConfig(values: { url?: string; publishableKey?: string }): SupabaseConfigResult {
  const url = values.url?.trim(); const publishableKey = values.publishableKey?.trim();
  if (!url || !publishableKey) return { status: 'missing', message: 'Connected mode needs a Supabase project URL and publishable key. The mock demo is available without them.' };
  try {
    const parsed = new URL(url);
    const local = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
      || /^10\./.test(parsed.hostname) || /^192\.168\./.test(parsed.hostname)
      || /^172\.(1[6-9]|2\d|3[01])\./.test(parsed.hostname);
    if (parsed.username || parsed.password || (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && local))) throw new Error('Invalid project URL');
  } catch { return { status: 'invalid', message: 'Use an HTTPS Supabase project URL, or an HTTP address on your local development network.' }; }
  const role = legacyRole(publishableKey);
  if (publishableKey.startsWith('sb_secret_') || role === 'service_role') {
    return { status: 'invalid', message: 'A server secret was supplied as a public key. Remove it, rotate the exposed secret, and use a publishable key.' };
  }
  if (!publishableKey.startsWith('sb_publishable_') && role !== 'anon') {
    return { status: 'invalid', message: 'Use a Supabase publishable key. Local development also supports the legacy anon key.' };
  }
  return { status: 'ready', config: { url: url.replace(/\/$/, ''), publishableKey } };
}
