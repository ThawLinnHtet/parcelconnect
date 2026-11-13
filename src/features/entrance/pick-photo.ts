import * as ImagePicker from 'expo-image-picker';

import { decodePickedJpeg, type EntrancePhoto } from './photo-service';

export async function pickEntrancePhoto(): Promise<EntrancePhoto | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Photo access was denied. You can still save entrance instructions and coordinates.');
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true,
    allowsEditing: true, quality: 0.7, allowsMultipleSelection: false });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset?.base64) throw new Error('The selected photo could not be read. Try a different photo.');
  return decodePickedJpeg(asset.base64);
}
