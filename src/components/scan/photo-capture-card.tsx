import { Image } from 'expo-image';
import { Camera, Image as ImageIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SurfaceCard } from '@/components/ui/surface-card';
import { BorderWidth, Radius, Spacing, Typography } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { pickPlantImage, type ImagePickSource } from '@/services/imagePicker';

interface PhotoCaptureCardProps {
  imageUri: string;
  imageDimensions: string;
  onImageSelected: (uri: string, dimensions: string) => void;
  onError: (message: string | null) => void;
}

/**
 * Step 1 photo capture/upload card for AI plant identification and health scans.
 */
export function PhotoCaptureCard({
  imageUri,
  imageDimensions,
  onImageSelected,
  onError,
}: PhotoCaptureCardProps) {
  const palette = usePalette();

  const handlePickPhoto = async (source: ImagePickSource) => {
    onError(null);
    const result = await pickPlantImage(source, {
      allowsEditing: true,
      quality: 0.9,
      prepareForAI: true,
    });

    if (!result.ok) {
      if (result.reason !== 'canceled' && result.message) {
        onError(result.message);
      }
      return;
    }

    const dimensions = result.prepared
      ? `${result.prepared.width}×${result.prepared.height}px (${result.prepared.mimeType})`
      : '';
    onImageSelected(result.uri, dimensions);
  };

  return (
    <SurfaceCard>
      <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
        Step 1 — Photo or Sample Preset
      </Text>

      {imageUri ? (
        <View
          style={[styles.previewWrapper, { backgroundColor: palette.bgSubtle }]}>
          <Image
            source={{ uri: imageUri }}
            style={styles.previewImage}
            contentFit="cover"
          />
          {Boolean(imageDimensions) && (
            <View style={styles.compressionBadge}>
              <Text
                style={[
                  styles.compressionBadgeText,
                  { color: palette.textInverse },
                ]}>
                Optimized ≤1024px: {imageDimensions}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View
          style={[
            styles.emptyPreviewBox,
            {
              borderColor: palette.borderSubtle,
              backgroundColor: palette.bgPrimary,
            },
          ]}>
          <Camera size={28} color={palette.primaryMuted} />
          <Text
            style={[styles.emptyPreviewTitle, { color: palette.textPrimary }]}>
            Snap a leaf photo or choose a sample below
          </Text>
          <Text style={[styles.emptyPreviewSub, { color: palette.textMuted }]}>
            Auto-resized & compressed to ≤1024×1024 via expo-image-manipulator
          </Text>
        </View>
      )}

      <View style={styles.mediaButtonsRow}>
        <Pressable
          onPress={() => void handlePickPhoto('camera')}
          style={({ pressed }) => [
            styles.secondaryMediaBtn,
            {
              backgroundColor: palette.primarySoft,
              borderColor: palette.primaryBorder,
            },
            pressed && { opacity: 0.8 },
          ]}>
          <Camera size={16} color={palette.primary} />
          <Text
            style={[styles.secondaryMediaBtnText, { color: palette.primary }]}>
            Camera
          </Text>
        </Pressable>

        <Pressable
          onPress={() => void handlePickPhoto('library')}
          style={({ pressed }) => [
            styles.secondaryMediaBtn,
            {
              backgroundColor: palette.primarySoft,
              borderColor: palette.primaryBorder,
            },
            pressed && { opacity: 0.8 },
          ]}>
          <ImageIcon size={16} color={palette.primary} />
          <Text
            style={[styles.secondaryMediaBtnText, { color: palette.primary }]}>
            Photo Library
          </Text>
        </Pressable>
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    ...Typography.cardTitle,
  },
  previewWrapper: {
    position: 'relative',
    borderRadius: Radius.md,
    overflow: 'hidden',
    height: 190,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  compressionBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(28, 40, 32, 0.82)',
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  compressionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyPreviewBox: {
    borderWidth: BorderWidth.hairline,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: 6,
  },
  emptyPreviewTitle: {
    ...Typography.body,
    fontWeight: '600',
  },
  emptyPreviewSub: {
    ...Typography.caption,
    textAlign: 'center',
  },
  mediaButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  secondaryMediaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: BorderWidth.hairline,
  },
  secondaryMediaBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
