import {
  ArrowUpDown,
  Droplets,
  FlaskConical,
  Flower2,
  Leaf,
  MapPin,
  Search,
  ShieldAlert,
  Sprout,
  Sun,
  X,
} from 'lucide-react-native';
import React, { type ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Chip } from '@/components/ui/chip';
import { BorderWidth, Radius, Spacing, Typography } from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { triggerLightHaptic } from '@/services/haptics';

export type GardenFilterMode =
  | 'all'
  | 'needs_water'
  | 'needs_attention'
  | 'succulent'
  | 'propagation'
  | 'foliage'
  | 'flowering';

export type GardenSortMode = 'needs_water' | 'health' | 'alpha' | 'recent';

export interface GardenStats {
  total: number;
  needsWaterCount: number;
  needsAttentionCount: number;
  succulentCount: number;
  propagationCount: number;
  foliageCount: number;
  floweringCount: number;
}

const SORT_KEYS: GardenSortMode[] = [
  'needs_water',
  'health',
  'alpha',
  'recent',
];

interface GardenControlsCardProps {
  hasPlants: boolean;
  stats: GardenStats;
  searchQuery: string;
  filter: GardenFilterMode;
  sortBy: GardenSortMode;
  groupByLocation: boolean;
  onChangeSearch: (query: string) => void;
  onSelectFilter: (mode: GardenFilterMode) => void;
  onSelectSort: (mode: GardenSortMode) => void;
  onToggleGroupByLocation: () => void;
}

/**
 * Unified search, category filter chips, sort controls, and room-grouping bar for My Garden.
 */
export function GardenControlsCard({
  hasPlants,
  stats,
  searchQuery,
  filter,
  sortBy,
  groupByLocation,
  onChangeSearch,
  onSelectFilter,
  onSelectSort,
  onToggleGroupByLocation,
}: GardenControlsCardProps) {
  const { t } = useTranslation();
  const palette = usePalette();

  const filterChips: {
    key: GardenFilterMode;
    label: string;
    count: number;
    softBg: string;
    softBorder: string;
    accentColor: string;
    renderIcon: (color: string) => ReactNode;
  }[] = useMemo(
    () => [
      {
        key: 'all',
        label: t('garden.controls.filters.all'),
        count: stats.total,
        softBg: palette.primarySoft,
        softBorder: palette.primaryBorder,
        accentColor: palette.primary,
        renderIcon: (color) => <Sprout size={13} color={color} />,
      },
      {
        key: 'needs_water',
        label: t('garden.controls.filters.needs_water'),
        count: stats.needsWaterCount,
        softBg: palette.waterAlertBg,
        softBorder: palette.waterAlertBorder,
        accentColor: palette.waterBlue,
        renderIcon: (color) => <Droplets size={13} color={color} />,
      },
      {
        key: 'needs_attention',
        label: t('garden.controls.filters.needs_attention'),
        count: stats.needsAttentionCount,
        softBg: palette.attentionBg,
        softBorder: palette.attentionBorder,
        accentColor: palette.attentionText,
        renderIcon: (color) => <ShieldAlert size={13} color={color} />,
      },
      {
        key: 'foliage',
        label: t('garden.controls.filters.foliage'),
        count: stats.foliageCount,
        softBg: palette.thrivingBg,
        softBorder: palette.thrivingBorder,
        accentColor: palette.thrivingText,
        renderIcon: (color) => <Leaf size={13} color={color} />,
      },
      {
        key: 'succulent',
        label: t('garden.controls.filters.succulent'),
        count: stats.succulentCount,
        softBg: palette.accentTerracottaSoft,
        softBorder: palette.borderSubtle,
        accentColor: palette.accentTerracotta,
        renderIcon: (color) => <Sun size={13} color={color} />,
      },
      {
        key: 'propagation',
        label: t('garden.controls.filters.propagation'),
        count: stats.propagationCount,
        softBg: palette.waterBlueSoft,
        softBorder: palette.waterAlertBorder,
        accentColor: palette.waterBlue,
        renderIcon: (color) => <FlaskConical size={13} color={color} />,
      },
      {
        key: 'flowering',
        label: t('garden.controls.filters.flowering'),
        count: stats.floweringCount,
        softBg: palette.accentTerracottaSoft,
        softBorder: palette.borderSubtle,
        accentColor: palette.accentTerracotta,
        renderIcon: (color) => <Flower2 size={13} color={color} />,
      },
    ],
    [stats, palette, t]
  );

  return (
    <View style={styles.container}>
      {hasPlants && (
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: palette.bgSurface,
              borderColor: palette.borderSubtle,
            },
          ]}>
          <Search size={15} color={palette.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={onChangeSearch}
            placeholder={t('garden.controls.searchPlaceholder')}
            placeholderTextColor={palette.textMuted}
            style={[styles.searchInput, { color: palette.textPrimary }]}
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => onChangeSearch('')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear search">
              <X size={15} color={palette.textMuted} />
            </Pressable>
          )}
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}>
        {filterChips.map((chip) => {
          const isSelected = filter === chip.key;
          const contentColor = isSelected
            ? palette.textInverse
            : chip.accentColor;

          return (
            <Pressable
              key={chip.key}
              onPress={() => {
                triggerLightHaptic();
                onSelectFilter(chip.key);
              }}
              style={({ pressed }) => [
                styles.filterChip,
                {
                  backgroundColor: isSelected ? chip.accentColor : chip.softBg,
                  borderColor: isSelected ? chip.accentColor : chip.softBorder,
                },
                pressed && styles.pressedScale,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}>
              {chip.renderIcon(contentColor)}
              <Text style={[styles.filterChipText, { color: contentColor }]}>
                {chip.label} ({chip.count})
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {hasPlants && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sortRow}>
          <View style={styles.sortLabelGroup}>
            <ArrowUpDown size={13} color={palette.textSecondary} />
            <Text style={[styles.sortLabel, { color: palette.textSecondary }]}>
              {t('garden.controls.sortLabel')}
            </Text>
          </View>

          {SORT_KEYS.map((sortKey) => (
            <Chip
              key={sortKey}
              label={t(`garden.controls.sorts.${sortKey}`)}
              variant="subtle"
              selected={sortBy === sortKey}
              onPress={() => {
                triggerLightHaptic();
                onSelectSort(sortKey);
              }}
            />
          ))}

          <Chip
            label={t('garden.controls.byRoom')}
            variant="subtle"
            selected={groupByLocation}
            selectedStyle="solid"
            icon={
              <MapPin
                size={12}
                color={
                  groupByLocation ? palette.textInverse : palette.textSecondary
                }
              />
            }
            onPress={() => {
              triggerLightHaptic();
              onToggleGroupByLocation();
            }}
          />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm + 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: BorderWidth.hairline,
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: Platform.OS === 'ios' ? 9 : 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 4,
  },
  filterRow: {
    gap: Spacing.sm,
    paddingVertical: Spacing.half,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + Spacing.half,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + Spacing.half,
    borderRadius: Radius.full,
    borderWidth: BorderWidth.hairline,
  },
  filterChipText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  pressedScale: {
    opacity: 0.86,
    transform: [{ scale: 0.97 }],
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sortLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 2,
  },
  sortLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
});
