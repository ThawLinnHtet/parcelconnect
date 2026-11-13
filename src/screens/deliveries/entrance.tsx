import { randomUUID } from 'expo-crypto';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { AppText } from '@/components/ui/app-text';
import { Action, Busy, Field, Notice, Page } from '@/components/ui/product-ui';
import type { Delivery } from '@/features/deliveries';
import { useAuth } from '@/features/auth/auth-provider';
import { useConnection } from '@/features/auth/connection-provider';
import { createEntrancePhotoService } from '@/features/entrance/photo-service';
import { pickEntrancePhoto } from '@/features/entrance/pick-photo';
import { parseEntranceCoordinates } from '@/features/entrance/validation';
import { useDemo } from '@/features/demo/demo-provider';
import { useResource } from '@/features/demo/use-resource';
import { getSupabaseClient } from '@/lib/supabase/client';

function EntranceForm({ delivery }: { delivery: Delivery }) {
  const { gateway, actor, refresh } = useDemo();
  const { mode } = useConnection();
  const auth = useAuth();
  const [text, setText] = useState(delivery.entrance.instructions);
  const [latitude, setLatitude] = useState(delivery.entrance.latitude?.toString() ?? '');
  const [longitude, setLongitude] = useState(delivery.entrance.longitude?.toString() ?? '');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [photo, setPhoto] = useState<{ path: string; url: string } | null>(null);
  const [photoError, setPhotoError] = useState<{ path: string; message: string } | null>(null);
  const photos = useMemo(() => createEntrancePhotoService({
    upload: (path, bytes, options) => getSupabaseClient().storage.from('entrance-photos').upload(path, bytes, options),
    remove: paths => getSupabaseClient().storage.from('entrance-photos').remove(paths),
    createSignedUrl: (path, expiresIn) => getSupabaseClient().storage.from('entrance-photos').createSignedUrl(path, expiresIn),
  }, () => auth.user?.id ?? null, randomUUID), [auth.user?.id]);

  useEffect(() => {
    let active = true;
    if (mode === 'connected' && delivery.entrance.photoPath) {
      const path = delivery.entrance.photoPath;
      void photos.signedUrl(path).then(url => { if (active) setPhoto({ path, url }); })
        .catch(error => { if (active) setPhotoError({ path, message: error instanceof Error ? error.message : 'Entrance photo unavailable.' }); });
    }
    return () => { active = false; };
  }, [delivery.entrance.photoPath, mode, photos]);

  async function save() {
    if (pending) return;
    setPending(true); setMessage('');
    try {
      const coordinates = parseEntranceCoordinates(latitude, longitude);
      await gateway.execute(actor, { type: 'update_entrance', deliveryId: delivery.id, entrance: {
        ...delivery.entrance, instructions: text.trim(), ...(coordinates ?? { latitude: undefined, longitude: undefined }),
      } });
      refresh(); setMessage('Entrance guidance saved.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The guidance was not saved.'); }
    finally { setPending(false); }
  }

  async function addPhoto() {
    if (pending) return;
    setPending(true); setMessage('');
    try {
      const photo = await pickEntrancePhoto();
      if (!photo) return;
      const { path } = await photos.uploadAndAttach(delivery.id, photo, async photoPath => {
        await gateway.execute(actor, { type: 'update_entrance', deliveryId: delivery.id,
          entrance: { ...delivery.entrance, instructions: text.trim(), photoPath } });
      });
      setPhoto({ path, url: await photos.signedUrl(path) }); refresh(); setMessage('Entrance photo saved privately.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The photo was not saved.'); }
    finally { setPending(false); }
  }

  const savedPhoto = photo && photo.path === delivery.entrance.photoPath ? photo : null;
  const savedPhotoError = photoError && photoError.path === delivery.entrance.photoPath ? photoError.message : '';

  return <>
    <Field label="Entrance instructions" value={text} onChange={setText} multiline hint="Describe the entrance or a helpful landmark. Do not include private door access codes." />
    <Field label="Latitude (optional)" value={latitude} onChange={setLatitude} keyboardType="decimal-pad" />
    <Field label="Longitude (optional)" value={longitude} onChange={setLongitude} keyboardType="decimal-pad" />
    {mode === 'connected' && <>
      <AppText color="textSecondary">Coordinates are an entrance pin, not live rider tracking. Photos stay in private storage and require delivery access.</AppText>
      {savedPhoto ? <Image source={{ uri: savedPhoto.url }} contentFit="cover" accessibilityLabel="Saved entrance photo" style={{ width: '100%', height: 180, borderRadius: 12 }} /> : null}
      {savedPhotoError ? <Notice text={savedPhotoError} /> : null}
      <Action title={pending ? 'Saving photo…' : 'Add entrance photo'} secondary disabled={pending} onPress={() => void addPhoto()} testID="entrance-photo" />
    </>}
    {mode === 'mock' && <AppText color="textSecondary">The portfolio demo stores instructions and coordinates in local sample data. Private photo upload is available in connected mode.</AppText>}
    {message ? <Notice text={message} /> : null}
    <Action title={pending ? 'Saving…' : 'Save entrance guidance'} disabled={pending} onPress={() => void save()} />
  </>;
}

export function EntranceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { gateway, actor } = useDemo();
  const load = useCallback(() => gateway.getDelivery(actor, id), [gateway, actor, id]);
  const { data, loading, error } = useResource(load);
  return <Page><AppText variant="title">Help the rider find you</AppText>{loading ? <Busy /> : error || !data ? <Notice text={error ?? 'Delivery unavailable.'} danger /> : actor.id !== data.recipientId || actor.role !== 'recipient' ? <Notice text="Only the recipient can edit entrance guidance." /> : <EntranceForm key={`${id}-${actor.id}`} delivery={data} />}</Page>;
}
