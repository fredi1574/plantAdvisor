import * as ImagePicker from 'expo-image-picker';

import {
  prepareImageForAI,
  type PreparedPlantImage,
} from '@/services/imageUtils';

export type ImagePickSource = 'camera' | 'library';

export interface PickPlantImageOptions {
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
  prepareForAI?: boolean;
}

export type PickPlantImageResult =
  | { ok: true; uri: string; prepared?: PreparedPlantImage }
  | {
      ok: false;
      reason: 'canceled' | 'permission_denied' | 'error';
      message?: string;
    };

/**
 * Requests camera or photo-library permission, launches Expo ImagePicker,
 * and optionally resizes/compresses the result via `prepareImageForAI`.
 */
export async function pickPlantImage(
  source: ImagePickSource,
  options: PickPlantImageOptions = {}
): Promise<PickPlantImageResult> {
  const {
    allowsEditing = false,
    aspect,
    quality = 0.85,
    prepareForAI = false,
  } = options;

  try {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      return {
        ok: false,
        reason: 'permission_denied',
        message:
          source === 'camera'
            ? 'Camera permission is required to snap a photo.'
            : 'Photo library permission is required to pick a photo.',
      };
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing,
            aspect,
            quality,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing,
            aspect,
            quality,
          });

    const assetUri = result.canceled ? undefined : result.assets[0]?.uri;
    if (!assetUri) {
      return { ok: false, reason: 'canceled' };
    }

    if (prepareForAI) {
      const prepared = await prepareImageForAI(assetUri);
      return { ok: true, uri: prepared.uri, prepared };
    }

    return { ok: true, uri: assetUri };
  } catch {
    return {
      ok: false,
      reason: 'error',
      message: 'Unable to select photo right now.',
    };
  }
}
