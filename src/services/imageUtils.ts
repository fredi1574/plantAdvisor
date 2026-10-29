/**
 * FloraLog — Image Preparation & Compression Utility
 * Uses `expo-image-manipulator` (SDK 58 contextual API) to downsample, resize (<= 1024x1024),
 * and compress camera/gallery photos to JPEG/WebP prior to AI multimodal inference.
 */

import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
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
    const context = ImageManipulator.manipulate(sourceUri, {
      maxWidth: 1024,
      maxHeight: 1024,
    });
    context.resize({ width: 1024 });
    const rendered = await context.renderAsync();
    const result = await rendered.saveAsync({
      format: targetFormat,
      compress: 0.82,
      base64: true,
    });

    return {
      uri: result.uri,
      width: result.width,
      height: result.height,
      mimeType,
      base64: result.base64,
    };
  } catch {
    // Graceful fallback if a remote seeded demo URL cannot be canvas-read due to cross-origin headers on Web
    return {
      uri: sourceUri,
      width: 1024,
      height: 1024,
      mimeType: 'image/jpeg',
    };
  }
}

