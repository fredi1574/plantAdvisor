import { Image } from 'expo-image';
import {
  CheckCircle2,
  ChevronRight,
  Droplets,
  MapPin,
  Pencil,
  Trash2,
} from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HealthStatusBadge } from '@/components/ui/status-badges';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import {
  BorderWidth,
  CardShadow,
  Fonts,
  Radius,
  Spacing,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import type { UserPlant } from '@/types/plant';
import { getDaysUntilNextWater } from '@/utils/watering';

const PLANT_TYPE_LABELS: Record<UserPlant['species']['plantType'], string> = {
  succulent: 'Succulent',
  propagation: 'Propagation',
  foliage: 'Foliage',
  flowering: 'Flowering',
};

interface SwipeablePlantCardProps {
  plant: UserPlant;
  onPress: () => void;
  onWaterNow: () => void;
  onEdit: (plant: UserPlant) => void;
  onDelete: (plant: UserPlant) => void;
}

export function SwipeablePlantCard({
  plant,
  onPress,
  onWaterNow,
  onEdit,
  onDelete,
}: SwipeablePlantCardProps) {
  const palette = usePalette();
  const healthStatus =
    plant.latestHealthAssessment?.healthStatus ?? 'thriving';
  const daysUntilWater = getDaysUntilNextWater(plant);
  const needsWater = daysUntilWater <= 0;

  return (
    <SwipeableRow
      openWidth={96}
      borderRadius={Radius.lg}
      onPress={onPress}
      leftAction={{
        label: 'Edit',
        icon: <Pencil size={18} color={palette.textInverse} />,
        backgroundColor: palette.primary,
        accessibilityLabel: `Edit ${plant.nickname}`,
        onTrigger: () => onEdit(plant),
      }}
      rightAction={{
        label: 'Delete',
        icon: <Trash2 size={18} color={palette.textInverse} />,
        backgroundColor: palette.criticalDot,
        accessibilityLabel: `Delete ${plant.nickname}`,
        onTrigger: () => onDelete(plant),
      }}>
      {({ isOpen, pressed }) => (
        <View
          style={[
            styles.plantCard,
            {
              backgroundColor:
                pressed && !isOpen ? palette.bgSubtle : palette.bgSurface,
              borderColor: palette.borderSubtle,
            },
          ]}>
          <View style={styles.cardTopRow}>
            <Image
              source={{ uri: plant.photoUri }}
              style={[styles.thumbnail, { backgroundColor: palette.bgSubtle }]}
              contentFit="cover"
            />

            <View style={styles.cardHeaderMeta}>
              <View style={styles.titleBadgeRow}>
                <Text
                  style={[
                    styles.plantNickname,
                    { color: palette.textPrimary, fontFamily: Fonts?.serif },
                  ]}
                  numberOfLines={1}>
                  {plant.nickname}
                </Text>

                <HealthStatusBadge status={healthStatus} />
              </View>

              <Text
                style={[styles.speciesLine, { color: palette.textSecondary }]}
                numberOfLines={1}>
                {plant.species.commonName} •{' '}
                <Text style={styles.scientificItalic}>
                  {plant.species.scientificName}
                </Text>
              </Text>

              <View style={styles.metaChipsRow}>
                <View
                  style={[
                    styles.typeChip,
                    { backgroundColor: palette.bgSubtle },
                  ]}>
                  <Text
                    style={[styles.typeChipText, { color: palette.primary }]}>
                    {PLANT_TYPE_LABELS[plant.species.plantType]}
                  </Text>
                </View>

                <View style={styles.locationChip}>
                  <MapPin size={12} color={palette.textSecondary} />
                  <Text
                    style={[
                      styles.locationText,
                      { color: palette.textSecondary },
                    ]}
                    numberOfLines={1}>
                    {plant.location}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {plant.latestHealthAssessment && (
            <View
              style={[
                styles.diagnosisSnippetBox,
                {
                  backgroundColor: palette.bgPrimary,
                  borderColor: palette.borderSubtle,
                },
              ]}>
              <Text
                style={[
                  styles.diagnosisSnippetText,
                  { color: palette.textSecondary },
                ]}
                numberOfLines={2}>
                <Text
                  style={[
                    styles.diagnosisSnippetPrefix,
                    { color: palette.primary },
                  ]}>
                  AI Note:{' '}
                </Text>
                {plant.latestHealthAssessment.diagnosisSummary}
              </Text>
            </View>
          )}

          <View
            style={[styles.cardFooter, { borderTopColor: palette.bgSubtle }]}>
            {needsWater ? (
              <View
                style={[
                  styles.needsWaterBadge,
                  {
                    backgroundColor: palette.waterAlertBg,
                    borderColor: palette.waterAlertBorder,
                  },
                ]}>
                <Droplets size={14} color={palette.waterAlertText} />
                <Text
                  style={[
                    styles.needsWaterBadgeText,
                    { color: palette.waterAlertText },
                  ]}>
                  {daysUntilWater === 0
                    ? 'Needs Watering Today'
                    : `Needs Watering (${Math.abs(daysUntilWater)}d overdue)`}
                </Text>
              </View>
            ) : (
              <View style={styles.waterScheduleInfo}>
                <CheckCircle2 size={14} color={palette.primaryMuted} />
                <Text
                  style={[
                    styles.waterScheduleText,
                    { color: palette.textSecondary },
                  ]}>
                  Next water in {daysUntilWater}d (every{' '}
                  {plant.customWateringIntervalDays}d)
                </Text>
              </View>
            )}

            <View style={styles.cardFooterRight}>
              {needsWater && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    onWaterNow();
                  }}
                  style={({ pressed: btnPressed }) => [
                    styles.quickWaterBtn,
                    { backgroundColor: palette.waterBlue },
                    btnPressed && { opacity: 0.8 },
                  ]}>
                  <Droplets size={13} color={palette.textInverse} />
                  <Text
                    style={[
                      styles.quickWaterBtnText,
                      { color: palette.textInverse },
                    ]}>
                    {plant.species.plantType === 'propagation'
                      ? 'Refresh Water'
                      : 'Log Water'}
                  </Text>
                </Pressable>
              )}

              <View style={styles.openNotebookLink}>
                <Text
                  style={[styles.openNotebookText, { color: palette.primary }]}>
                  Notebook
                </Text>
                <ChevronRight size={15} color={palette.primary} />
              </View>
            </View>
          </View>
        </View>
      )}
    </SwipeableRow>
  );
}

const styles = StyleSheet.create({
  plantCard: {
    borderRadius: Radius.lg,
    borderWidth: BorderWidth.hairline,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.md,
    ...CardShadow,
  },
  cardTopRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  thumbnail: {
    width: 78,
    height: 78,
    borderRadius: 14,
  },
  cardHeaderMeta: {
    flex: 1,
    gap: 5,
    justifyContent: 'center',
  },
  titleBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  plantNickname: {
    flex: 1,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  speciesLine: {
    fontSize: 13,
    fontWeight: '500',
  },
  scientificItalic: {
    fontStyle: 'italic',
  },
  metaChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  typeChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '500',
  },
  diagnosisSnippetBox: {
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: BorderWidth.hairline,
  },
  diagnosisSnippetPrefix: {
    fontWeight: '700',
  },
  diagnosisSnippetText: {
    fontSize: 13,
    lineHeight: 19,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 4,
    borderTopWidth: BorderWidth.hairline,
  },
  needsWaterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: BorderWidth.hairline,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  needsWaterBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  waterScheduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  waterScheduleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quickWaterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  quickWaterBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  openNotebookLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  openNotebookText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
