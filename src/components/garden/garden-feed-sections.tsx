import {
  Droplets,
  LayoutGrid,
  LayoutList,
  MapPin,
  Sprout,
} from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { GardenFilterMode } from '@/components/garden/garden-controls-card';
import { PlantGridCard } from '@/components/garden/plant-grid-card';
import { PROPAGATION_READY_ROOT_CM } from '@/components/garden/propagation-readiness-bar';
import { SwipeablePlantCard } from '@/components/garden/swipeable-plant-card';
import {
  AnimatedEntrance,
  SpringPressable,
} from '@/components/ui/animated-wrappers';
import { BorderWidth, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import type { GardenViewMode } from '@/hooks/use-garden-feed';
import { usePalette } from '@/hooks/use-theme';
import { localizeLocation } from '@/i18n/plantDisplay';
import type { UserPlant } from '@/types/plant';

interface GardenViewToggleProps {
  viewMode: GardenViewMode;
  onChange: (mode: GardenViewMode) => void;
}

export function GardenViewToggle({
  viewMode,
  onChange,
}: GardenViewToggleProps) {
  const palette = usePalette();

  return (
    <View style={styles.headerControls}>
      <View
        style={[
          styles.viewToggleGroup,
          {
            backgroundColor: palette.bgSurface,
            borderColor: palette.borderSubtle,
          },
        ]}>
        <Pressable
          onPress={() => onChange('list')}
          style={[
            styles.viewToggleBtn,
            viewMode === 'list' && {
              backgroundColor: palette.primary,
            },
          ]}
          accessibilityRole="button"
          accessibilityState={{ selected: viewMode === 'list' }}
          accessibilityLabel="List view">
          <LayoutList
            size={16}
            color={
              viewMode === 'list' ? palette.textInverse : palette.textSecondary
            }
          />
        </Pressable>
        <Pressable
          onPress={() => onChange('grid')}
          style={[
            styles.viewToggleBtn,
            viewMode === 'grid' && {
              backgroundColor: palette.primary,
            },
          ]}
          accessibilityRole="button"
          accessibilityState={{ selected: viewMode === 'grid' }}
          accessibilityLabel="Two-column grid view">
          <LayoutGrid
            size={16}
            color={
              viewMode === 'grid' ? palette.textInverse : palette.textSecondary
            }
          />
        </Pressable>
      </View>
    </View>
  );
}

interface GardenContextBannersProps {
  filter: GardenFilterMode;
  filteredCount: number;
  isPropagationBench: boolean;
  propagationReadyCount: number;
  onWaterAllThirsty: () => void;
}

export function GardenContextBanners({
  filter,
  filteredCount,
  isPropagationBench,
  propagationReadyCount,
  onWaterAllThirsty,
}: GardenContextBannersProps) {
  const { t } = useTranslation();
  const palette = usePalette();

  return (
    <>
      {filter === 'needs_water' && filteredCount > 0 && (
        <View
          style={[
            styles.thirstyBanner,
            {
              backgroundColor: palette.waterAlertBg,
              borderColor: palette.waterAlertBorder,
            },
          ]}>
          <View style={styles.thirstyBannerLeft}>
            <Droplets size={15} color={palette.waterBlue} />
            <Text
              style={[
                styles.thirstyBannerText,
                { color: palette.waterAlertText },
              ]}>
              {t('garden.thirstyBanner', { count: filteredCount })}
            </Text>
          </View>
          <SpringPressable
            onPress={onWaterAllThirsty}
            accessibilityRole="button"
            accessibilityLabel="Water all thirsty plants"
            style={[
              styles.waterAllBtn,
              { backgroundColor: palette.waterBlue },
            ]}>
            <Droplets size={13} color={palette.textInverse} />
            <Text
              style={[
                styles.waterAllBtnText,
                { color: palette.textInverse },
              ]}>
              {t('garden.waterAllBtn')}
            </Text>
          </SpringPressable>
        </View>
      )}

      {isPropagationBench && filteredCount > 0 && (
        <View
          style={[
            styles.propBenchBanner,
            {
              backgroundColor: palette.primarySoft,
              borderColor: palette.primaryBorder,
            },
          ]}>
          <Sprout size={15} color={palette.primary} />
          <Text style={[styles.propBenchText, { color: palette.textPrimary }]}>
            {t('garden.propBenchBanner', {
              ready: propagationReadyCount,
              total: filteredCount,
              target: PROPAGATION_READY_ROOT_CM,
            })}
          </Text>
        </View>
      )}
    </>
  );
}

interface GardenLocationGroupProps {
  location: string;
  items: UserPlant[];
  viewMode: GardenViewMode;
  isPropagationBench: boolean;
  latestRootLengthByPlantId: Map<string, number | null>;
  onOpenPlant: (plantId: string) => void;
  onQuickWater: (plant: UserPlant) => void;
  onSnooze: (plant: UserPlant) => void;
  onEdit: (plant: UserPlant) => void;
  onDelete: (plant: UserPlant) => void;
}

export function GardenLocationGroup({
  location,
  items,
  viewMode,
  isPropagationBench,
  latestRootLengthByPlantId,
  onOpenPlant,
  onQuickWater,
  onSnooze,
  onEdit,
  onDelete,
}: GardenLocationGroupProps) {
  const { i18n } = useTranslation();
  const palette = usePalette();

  const renderGridBlock = () => {
    const rows: UserPlant[][] = [];
    for (let i = 0; i < items.length; i += 2) {
      rows.push(items.slice(i, i + 2));
    }

    return (
      <View style={styles.gridStack}>
        {rows.map((row, rowIndex) => (
          <AnimatedEntrance
            key={row.map((p) => p.id).join('-')}
            index={rowIndex}
            animateLayout
            style={styles.gridRow}>
            {row.map((plant) => (
              <PlantGridCard
                key={plant.id}
                plant={plant}
                onPress={() => onOpenPlant(plant.id)}
                onWaterNow={() => onQuickWater(plant)}
                onLongPress={() => onEdit(plant)}
                showPropagationProgress={isPropagationBench}
                latestRootLengthCm={
                  latestRootLengthByPlantId.get(plant.id) ?? null
                }
              />
            ))}
            {row.length === 1 && <View style={styles.gridSpacer} />}
          </AnimatedEntrance>
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.maxWidthWrap, styles.locationGroup]}>
      <View style={styles.locationHeaderRow}>
        <MapPin size={14} color={palette.primary} />
        <Text style={[styles.locationTitle, { color: palette.textPrimary }]}>
          {localizeLocation(location, i18n.language)}
        </Text>
        <Text style={[styles.locationCount, { color: palette.textMuted }]}>
          ({items.length})
        </Text>
      </View>

      {viewMode === 'grid' ? (
        renderGridBlock()
      ) : (
        <View style={styles.listStack}>
          {items.map((plant, idx) => (
            <AnimatedEntrance key={plant.id} index={idx} animateLayout>
              <SwipeablePlantCard
                plant={plant}
                onPress={() => onOpenPlant(plant.id)}
                onWaterNow={() => onQuickWater(plant)}
                onSnooze={() => onSnooze(plant)}
                onEdit={onEdit}
                onDelete={onDelete}
                showPropagationProgress={isPropagationBench}
                latestRootLengthCm={
                  latestRootLengthByPlantId.get(plant.id) ?? null
                }
              />
            </AnimatedEntrance>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  maxWidthWrap: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  viewToggleGroup: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    borderWidth: BorderWidth.hairline,
    padding: Spacing.half,
    gap: Spacing.half,
  },
  viewToggleBtn: {
    width: 32,
    height: 30,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listStack: {
    gap: Spacing.md,
  },
  gridStack: {
    gap: Spacing.md,
  },
  gridRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  gridSpacer: {
    flex: 1,
  },
  locationGroup: {
    gap: Spacing.sm,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  locationCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  propBenchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  propBenchText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  thirstyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  thirstyBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  thirstyBannerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  waterAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  waterAllBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
