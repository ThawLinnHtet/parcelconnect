export const MAX_ENTRANCE_PHOTO_BYTES = 5 * 1024 * 1024;
const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as const;
export type EntranceImageMime = keyof typeof extensions;
export function validateEntrancePhoto(mime: string | undefined, bytes: number): EntranceImageMime {
  if (!mime || !Object.hasOwn(extensions, mime)) throw new Error('Choose a JPEG, PNG, or WebP photo.');
  if (!Number.isSafeInteger(bytes) || bytes <= 0 || bytes > MAX_ENTRANCE_PHOTO_BYTES) {
    throw new Error('Choose a photo smaller than 5 MB.');
  }
  return mime as EntranceImageMime;
}
export function entrancePhotoPath(deliveryId: string, userId: string, fileId: string, mime: EntranceImageMime) {
  for (const segment of [deliveryId, userId, fileId]) {
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(segment)) throw new Error('Invalid photo location.');
  }
  return `${deliveryId}/${userId}/${fileId}.${extensions[mime]}`;
}
export function parseEntranceCoordinates(latitude: string, longitude: string) {
  if (!latitude.trim() && !longitude.trim()) return null;
  if (!latitude.trim() || !longitude.trim()) throw new Error('Enter both latitude and longitude, or leave both empty.');
  const lat = Number(latitude), lng = Number(longitude);
  if (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180) {
    throw new Error('Latitude must be between -90 and 90; longitude between -180 and 180.');
  }
  return { latitude: lat, longitude: lng };
}
