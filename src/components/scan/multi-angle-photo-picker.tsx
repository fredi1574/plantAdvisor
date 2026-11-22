import { Image } from 'expo-image';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Images,
  X,
} from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SpringPressable } from '@/components/ui/animated-wrappers';
import { BorderWidth, Radius, Spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { triggerLightHaptic } from '@/services/haptics';
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
 * Collapsible three-slot diagnostic angle photo picker (Canopy, Leaf/Stem Close-Up, Soil Surface).
 */
export function MultiAnglePhotoPicker({
  photos,
  onPickPhoto,
  onClearPhoto,
}: MultiAnglePhotoPickerProps) {
  const palette = usePalette();
  const [expanded, setExpanded] = useState(false);

  const attachedCount = DIAGNOSTIC_ANGLE_SLOTS.filter((slot) =>
    Boolean(photos[slot.angle])
  ).length;

  return (
    <View
      style={[
        styles.accordion,
        {
          backgroundColor: palette.bgSurface,
          borderColor: palette.borderSubtle,
        },
      ]}>
      <Pressable
        onPress={() => {
          triggerLightHaptic();
          setExpanded((prev) => !prev);
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel="Toggle multi-angle diagnostic photos"
        style={({ pressed }) => [
          styles.accordionHeader,
          pressed && { opacity: 0.78 },
        ]}>
        <View style={styles.accordionHeaderLeft}>
          <Images size={15} color={palette.primary} />
          <View style={styles.flex}>
            <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
              Multi-Angle Diagnostic Photos (Optional)
            </Text>
            <Text style={[styles.accordionHint, { color: palette.textMuted }]}>
              {attachedCount > 0
                ? `${attachedCount} of 3 angles attached`
                : 'Add canopy, leaf close-up, or soil shots'}
            </Text>
          </View>
        </View>
        {expanded ? (
          <ChevronUp size={16} color={palette.textMuted} />
        ) : (
          <ChevronDown size={16} color={palette.textMuted} />
        )}
      </Pressable>

      {expanded && (
        <View
          style={[
            styles.angleGrid,
            { borderTopColor: palette.borderSubtle },
          ]}>
          {DIAGNOSTIC_ANGLE_SLOTS.map((slot) => {
            const uri = photos[slot.angle];
            return (
              <View
                key={slot.angle}
                style={[
                  styles.angleSlot,
                  {
                    backgroundColor: palette.bgPrimary,
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
                      style={[
                        styles.angleSlotHint,
                        { color: palette.textMuted },
                      ]}>
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
                    <SpringPressable
                      onPress={() => {
                        triggerLightHaptic();
                        onPickPhoto(slot.angle, 'camera');
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Capture ${slot.label} with camera`}
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
                    </SpringPressable>
                    <SpringPressable
                      onPress={() => {
                        triggerLightHaptic();
                        onPickPhoto(slot.angle, 'library');
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Choose ${slot.label} from library`}
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
                    </SpringPressable>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  accordion: {
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    gap: Spacing.sm,
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    flex: 1,
  },
  accordionHint: {
    fontSize: 11,
    marginTop: 1,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  angleGrid: {
    borderTopWidth: BorderWidth.hairline,
    padding: Spacing.sm,
    gap: Spacing.xs + 2,
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
