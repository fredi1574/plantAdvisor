import { prepareImageForAI } from '@/services/imageUtils';
import { getCurrentUserId, supabase } from '@/services/supabase/client';

function base64ToUint8Array(base64: string): Uint8Array {
  const clean = base64.replace(/^data:[^;]+;base64,/, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Uploads a local camera/gallery URI to the `plant-photos` Supabase Storage bucket
 * and returns its public HTTPS URL. Remote HTTP(S) URLs are returned unchanged.
 */
export async function uploadPlantPhotoIfNeeded(
  photoUri: string | undefined,
  plantId: string
): Promise<string | undefined> {
  if (!photoUri || !supabase) return photoUri;
  if (photoUri.startsWith('http://') || photoUri.startsWith('https://')) {
    return photoUri;
  }

  try {
    const userId = await getCurrentUserId();
    if (!userId) return photoUri;

    const prepared = await prepareImageForAI(photoUri);
    if (!prepared.base64) return photoUri;

    const ext = prepared.mimeType === 'image/webp' ? 'webp' : 'jpg';
    const filePath = `${userId}/${plantId}/${Date.now()}.${ext}`;
    const fileBytes = base64ToUint8Array(prepared.base64);

    const { error } = await supabase.storage
      .from('plant-photos')
      .upload(filePath, fileBytes, {
        contentType: prepared.mimeType,
        upsert: true,
      });

    if (error) {
      return photoUri;
    }

    const { data } = supabase.storage
      .from('plant-photos')
      .getPublicUrl(filePath);
    return data.publicUrl || photoUri;
  } catch {
    return photoUri;
  }
}

export async function cleanupPlantStorageFolder(
  userId: string,
  plantId: string
): Promise<void> {
  if (!supabase) return;
  try {
    const folder = `${userId}/${plantId}`;
    const { data: items, error } = await supabase.storage
      .from('plant-photos')
      .list(folder, { limit: 100 });
    if (error || !items || items.length === 0) return;

    const paths = items
      .filter((item) => item.name)
      .map((item) => `${folder}/${item.name}`);
    if (paths.length > 0) {
      await supabase.storage.from('plant-photos').remove(paths);
    }
  } catch (err) {
    console.warn('[Supabase] cleanupPlantStorageFolder error:', err);
  }
}

export async function deletePlantPhotoByUrl(photoUrl?: string): Promise<void> {
  if (!supabase || !photoUrl) return;
  try {
    const marker = '/storage/v1/object/public/plant-photos/';
    const idx = photoUrl.indexOf(marker);
    if (idx === -1) return;
    const objectPath = decodeURIComponent(
      photoUrl.slice(idx + marker.length).split('?')[0]
    );
    if (objectPath) {
      await supabase.storage.from('plant-photos').remove([objectPath]);
    }
  } catch (err) {
    console.warn('[Supabase] deletePlantPhotoByUrl error:', err);
  }
}
