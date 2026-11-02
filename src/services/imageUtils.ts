/**
 * FloraLog — Image Preparation & Compression Utility
 * Uses `expo-image-manipulator` to downsample, resize (<= 1024x1024),
 * and compress camera/gallery photos to JPEG/WebP prior to AI multimodal inference.
 */

import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

export interface PreparedPlantImage {
  uri: string;
  width: number;
  height: number;
  mimeType: 'image/jpeg' | 'image/webp';
  base64?: string;
}

export async function prepareImageForAI(sourceUri: string): Promise<PreparedPlantImage> {
  const targetFormat = Platform.OS === 'web' ? SaveFormat.WEBP : SaveFormat.JPEG;
  const mimeType = targetFormat === SaveFormat.WEBP ? 'image/webp' : 'image/jpeg';

  try {
    const result = await manipulateAsync(
      sourceUri,
      [{ resize: { width: 1024 } }],
      {
        format: targetFormat,
        compress: 0.82,
        base64: true,
      }
    );

    return {
      uri: result.uri,
      width: result.width,
      height: result.height,
      mimeType,
      base64: result.base64,
    };
  } catch {
    // If manipulateAsync fails (e.g., remote URL or already a data URI), extract or fetch base64
    let fallbackBase64: string | undefined;

    if (sourceUri.startsWith('data:')) {
      const commaIdx = sourceUri.indexOf(',');
      if (commaIdx >= 0) {
        fallbackBase64 = sourceUri.slice(commaIdx + 1);
      }
    } else if (sourceUri.startsWith('http://') || sourceUri.startsWith('https://')) {
      try {
        const resp = await fetch(sourceUri);
        const blob = await resp.blob();
        fallbackBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const res = (reader.result as string) || '';
            const idx = res.indexOf(',');
            resolve(idx >= 0 ? res.slice(idx + 1) : res);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch {
        // Ignore fetch errors
      }
    }

    return {
      uri: sourceUri,
      width: 1024,
      height: 1024,
      mimeType: 'image/jpeg',
      base64: fallbackBase64,
    };
  }
}
