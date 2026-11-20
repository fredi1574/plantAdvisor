import { Image } from 'expo-image';
import { Camera, Image as ImageIcon, X } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BorderWidth, Radius, Spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import type { ImagePickSource } from '@/services/imagePicker';
import type { DiagnosticPhotoAngle } from '@/types/plant';

export const DIAGNOSTIC_ANGLE_SLOTS: {
  angle: DiagnosticPhotoAngle;
  label: string;
  hint: string;
}[] = [
  {
    angle: 'canopy',
    label: 'Whole Plant / Canopy',
    hint: 'Overall shape & light',
  },
  {
    angle: 'closeup',
    label: 'Leaf / Stem Close-Up',
    hint: 'Spots, pests, edema',
  },
  {
    angle: 'soil',
    label: 'Soil Surface & Pot Base',
    hint: 'Moisture & drainage',
  },
];

interface MultiAnglePhotoPickerProps {
  photos: Partial<Record<DiagnosticPhotoAngle, string>>;
  onPickPhoto: (angle: DiagnosticPhotoAngle, source: ImagePickSource) => void;
  onClearPhoto: (angle: DiagnosticPhotoAngle) => void;
}

/**
 * Three-slot diagnostic angle photo picker (Canopy, Leaf/Stem Close-Up, Soil Surface).
 */
export function MultiAnglePhotoPicker({
  photos,
  onPickPhoto,
  onClearPhoto,
}: MultiAnglePhotoPickerProps) {
  const palette = usePalette();

  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
        Multi-Angle Diagnostic Photos (Up to 3)
      </Text>
      <View style={styles.angleGrid}>
        {DIAGNOSTIC_ANGLE_SLOTS.map((slot) => {
          const uri = photos[slot.angle];
          return (
            <View
              key={slot.angle}
              style={[
                styles.angleSlot,
                {
                  backgroundColor: palette.bgSubtle,
                  borderColor: palette.borderSubtle,
                },
              ]}>
              <View style={styles.angleSlotHeader}>
                <View style={styles.flex}>
                  <Text
                    style={[
                      styles.angleSlotTitle,
                      { color: palette.textPrimary },
                    ]}>
                    {slot.label}
                  </Text>
                  <Text
                    style={[styles.angleSlotHint, { color: palette.textMuted }]}>
                    {slot.hint}
                  </Text>
                </View>
                {uri ? (
                  <Pressable
                    onPress={() => onClearPhoto(slot.angle)}
                    style={[
                      styles.angleClearBtn,
                      { backgroundColor: palette.bgSurface },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${slot.label} photo`}>
                    <X size={14} color={palette.textSecondary} />
                  </Pressable>
                ) : null}
              </View>

              {uri ? (
                <Image
                  source={{ uri }}
                  style={styles.anglePreview}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.angleActionsRow}>
                  <Pressable
                    onPress={() => onPickPhoto(slot.angle, 'camera')}
                    style={[
                      styles.anglePickBtn,
                      {
                        backgroundColor: palette.bgSurface,
                        borderColor: palette.borderSubtle,
                      },
                    ]}>
                    <Camera size={14} color={palette.primary} />
                    <Text
                      style={[
                        styles.anglePickBtnText,
                        { color: palette.primary },
                      ]}>
                      Camera
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onPickPhoto(slot.angle, 'library')}
                    style={[
                      styles.anglePickBtn,
                      {
                        backgroundColor: palette.bgSurface,
                        borderColor: palette.borderSubtle,
                      },
                    ]}>
                    <ImageIcon size={14} color={palette.primary} />
                    <Text
                      style={[
                        styles.anglePickBtnText,
                        { color: palette.primary },
                      ]}>
                      Library
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  angleGrid: {
    gap: Spacing.xs,
  },
  angleSlot: {
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  angleSlotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  angleSlotTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  angleSlotHint: {
    fontSize: 11,
  },
  angleClearBtn: {
    padding: Spacing.xs,
    borderRadius: Radius.full,
  },
  anglePreview: {
    width: '100%',
    height: 110,
    borderRadius: Radius.md,
  },
  angleActionsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  anglePickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
  },
  anglePickBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
