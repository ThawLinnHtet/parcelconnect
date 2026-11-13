import { entrancePhotoPath, validateEntrancePhoto, type EntranceImageMime } from './validation.ts';

export interface EntranceStorage {
  upload(path: string, bytes: ArrayBuffer, options: { contentType: string; upsert: boolean }): Promise<{ error: { message: string } | null }>;
  remove(paths: string[]): Promise<{ error: { message: string } | null }>;
  createSignedUrl(path: string, expiresIn: number): Promise<{ data: { signedUrl: string } | null; error: { message: string } | null }>;
}
export interface EntrancePhoto { bytes: ArrayBuffer; mime: EntranceImageMime }
export function createEntrancePhotoService(storage: EntranceStorage, currentUserId: () => string | null, randomId: () => string) {
  return {
    async uploadAndAttach<T>(deliveryId: string, photo: EntrancePhoto, attach: (path: string) => Promise<T>) {
      const userId = currentUserId();
      if (!userId) throw new Error('Sign in before adding a photo.');
      validateEntrancePhoto(photo.mime, photo.bytes.byteLength);
      const path = entrancePhotoPath(deliveryId, userId, randomId(), photo.mime);
      const uploaded = await storage.upload(path, photo.bytes, { contentType: photo.mime, upsert: false });
      if (uploaded.error) throw new Error('The photo could not be uploaded. Please try again.');
      try {
        if (currentUserId() !== userId) throw new Error('The account changed before the photo was saved.');
        // The delivery update is independently authorized by the backend. A
        // successful object upload alone must not attach an entrance image.
        const data = await attach(path);
        return { path, data };
      } catch (error) {
        // Delete only the newly staged upload, never the previously attached image.
        try { await storage.remove([path]); } catch { /* Best effort orphan cleanup. */ }
        throw error;
      }
    },
    async signedUrl(path: string) {
      if (!currentUserId()) throw new Error('Sign in to view this entrance photo.');
      const result = await storage.createSignedUrl(path, 60);
      if (result.error || !result.data) throw new Error('This photo is unavailable or your access has changed.');
      return result.data.signedUrl;
    },
  };
}

/** The picker returns JPEG base64; upload bytes, not a React Native Blob/FormData. */
export function decodePickedJpeg(base64: string): EntrancePhoto {
  const normalized = base64.replace(/\s/g, '');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized) || normalized.length % 4 !== 0) throw new Error('The selected photo could not be read.');
  const estimated = Math.floor(normalized.length * 3 / 4) - (normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0);
  validateEntrancePhoto('image/jpeg', estimated);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const output = new Uint8Array(estimated);
  let offset = 0;
  for (let i = 0; i < normalized.length; i += 4) {
    const a = alphabet.indexOf(normalized[i]), b = alphabet.indexOf(normalized[i + 1]);
    const c = normalized[i + 2] === '=' ? 0 : alphabet.indexOf(normalized[i + 2]);
    const d = normalized[i + 3] === '=' ? 0 : alphabet.indexOf(normalized[i + 3]);
    const block = (a << 18) | (b << 12) | (c << 6) | d;
    if (offset < estimated) output[offset++] = block >> 16;
    if (offset < estimated) output[offset++] = block >> 8;
    if (offset < estimated) output[offset++] = block;
  }
  // Reject arbitrary files disguised as a JPEG by a caller-controlled MIME label.
  if (output[0] !== 0xff || output[1] !== 0xd8 || output[2] !== 0xff) throw new Error('Choose a JPEG photo.');
  return { bytes: output.buffer, mime: 'image/jpeg' };
}
