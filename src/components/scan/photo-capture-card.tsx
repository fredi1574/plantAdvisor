import { Image } from 'expo-image';
import { Camera, Image as ImageIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { SpringPressable } from '@/components/ui/animated-wrappers';
import { BorderWidth, Radius, Spacing, Typography } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { triggerLightHaptic } from '@/services/haptics';
import { pickPlantImage, type ImagePickSource } from '@/services/imagePicker';

interface PhotoCaptureCardProps {
  imageUri: string;
  imageDimensions: string;
  onImageSelected: (uri: string, dimensions: string) => void;
  onError: (message: string | null) => void;
  stepLabel?: string;
}

function ViewfinderBrackets({
  color,
  inset = 10,
}: {
  color: string;
  inset?: number;
}) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View
        style={[
          styles.bracket,
          styles.bracketTopLeft,
          { top: inset, left: inset, borderColor: color },
        ]}
      />
      <View
        style={[
          styles.bracket,
          styles.bracketTopRight,
          { top: inset, right: inset, borderColor: color },
        ]}
      />
      <View
        style={[
          styles.bracket,
          styles.bracketBottomLeft,
          { bottom: inset, left: inset, borderColor: color },
        ]}
      />
      <View
        style={[
          styles.bracket,
          styles.bracketBottomRight,
          { bottom: inset, right: inset, borderColor: color },
        ]}
      />
    </View>
  );
}

/**
 * Step 1 photo capture/upload card for AI plant identification and health scans.
 */
export function PhotoCaptureCard({
  imageUri,
  imageDimensions,
  onImageSelected,
  onError,
  stepLabel,
}: PhotoCaptureCardProps) {
  const { t } = useTranslation();
  const palette = usePalette();

  const handlePickPhoto = async (source: ImagePickSource) => {
    triggerLightHaptic();
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
    <View style={styles.section}>
      <Text style={[styles.eyebrow, { color: palette.textMuted }]}>
        {stepLabel ?? t('scan.photo.step1')}
      </Text>

      {imageUri ? (
        <View
          style={[
            styles.previewWrapper,
            {
              backgroundColor: palette.bgSubtle,
              borderColor: palette.borderSubtle,
            },
          ]}>
          <Image
            source={{ uri: imageUri }}
            style={styles.previewImage}
            contentFit="cover"
          />
          <ViewfinderBrackets color="rgba(255, 255, 255, 0.72)" inset={12} />
          {Boolean(imageDimensions) && (
            <View style={styles.compressionBadge}>
              <Text
                style={[
                  styles.compressionBadgeText,
                  { color: palette.textInverse },
                ]}>
                {t('scan.photo.optimized', { dimensions: imageDimensions })}
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
              backgroundColor: palette.bgSurface,
            },
          ]}>
          <ViewfinderBrackets color={palette.primaryMuted} inset={10} />
          <View
            style={[
              styles.reticleCircle,
              {
                backgroundColor: palette.primarySoft,
                borderColor: palette.primaryBorder,
              },
            ]}>
            <Camera size={24} color={palette.primary} />
          </View>
          <Text
            style={[styles.emptyPreviewTitle, { color: palette.textPrimary }]}>
            {t('scan.photo.emptyTitle')}
          </Text>
          <Text style={[styles.emptyPreviewSub, { color: palette.textMuted }]}>
            {t('scan.photo.emptySub')}
          </Text>
        </View>
      )}

      <View style={styles.mediaButtonsRow}>
        <SpringPressable
          onPress={() => void handlePickPhoto('camera')}
          accessibilityRole="button"
          accessibilityLabel="Capture photo with camera"
          style={[
            styles.secondaryMediaBtn,
            {
              backgroundColor: palette.bgSurface,
              borderColor: palette.primaryBorder,
            },
          ]}>
          <Camera size={16} color={palette.primary} />
          <Text
            style={[styles.secondaryMediaBtnText, { color: palette.primary }]}>
            {t('scan.photo.camera')}
          </Text>
        </SpringPressable>

        <SpringPressable
          onPress={() => void handlePickPhoto('library')}
          accessibilityRole="button"
          accessibilityLabel="Choose photo from library"
          style={[
            styles.secondaryMediaBtn,
            {
              backgroundColor: palette.bgSurface,
              borderColor: palette.primaryBorder,
            },
          ]}>
          <ImageIcon size={16} color={palette.primary} />
          <Text
            style={[styles.secondaryMediaBtnText, { color: palette.primary }]}>
            {t('scan.photo.library')}
          </Text>
        </SpringPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.sm + 2,
  },
  eyebrow: {
    ...Typography.eyebrow,
  },
  previewWrapper: {
    position: 'relative',
    borderRadius: Radius.lg,
    borderWidth: BorderWidth.hairline,
    overflow: 'hidden',
    height: 204,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  bracket: {
    position: 'absolute',
    width: 18,
    height: 18,
  },
  bracketTopLeft: {
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopLeftRadius: 5,
  },
  bracketTopRight: {
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderTopRightRadius: 5,
  },
  bracketBottomLeft: {
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderBottomLeftRadius: 5,
  },
  bracketBottomRight: {
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomRightRadius: 5,
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
    position: 'relative',
    borderWidth: BorderWidth.hairline,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: 6,
  },
  reticleCircle: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    borderWidth: BorderWidth.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyPreviewTitle: {
    ...Typography.body,
    fontWeight: '600',
    textAlign: 'center',
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
    paddingVertical: 11,
    borderRadius: Radius.md,
    borderWidth: BorderWidth.hairline,
  },
  secondaryMediaBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
