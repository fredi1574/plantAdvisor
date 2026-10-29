import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Droplets,
  MapPin,
  Plus,
  RotateCcw,
  Sparkles,
  Sprout,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CardShadow,
  HealthBadgeTheme,
  MaxContentWidth,
  Palette,
  Radius,
  Spacing,
} from '@/constants/theme';
import { isMockAiEnabled } from '@/services/aiPlantService';
import {
  doesPlantNeedWatering,
  getDaysUntilNextWater,
  usePlantStore,
} from '@/store/usePlantStore';
import type { UserPlant } from '@/types/plant';

type FilterMode = 'all' | 'needs_water' | 'succulent' | 'propagation';

const PLANT_TYPE_LABELS: Record<UserPlant['species']['plantType'], string> = {
  succulent: 'Succulent',
  propagation: 'Propagation',
  foliage: 'Foliage',
  flowering: 'Flowering',
};

export default function MyGardenScreen() {
  const plants = usePlantStore((s) => s.plants);
  const waterPlantNow = usePlantStore((s) => s.waterPlantNow);
  const resetToSeedData = usePlantStore((s) => s.resetToSeedData);
  const [filter, setFilter] = useState<FilterMode>('all');

  const stats = useMemo(() => {
    const needsWaterCount = plants.filter(doesPlantNeedWatering).length;
    const needsAttentionCount = plants.filter(
      (p) =>
        p.latestHealthAssessment?.healthStatus === 'needs_attention' ||
        p.latestHealthAssessment?.healthStatus === 'critical'
    ).length;
    return {
      total: plants.length,
      needsWaterCount,
      needsAttentionCount,
    };
  }, [plants]);

  const filteredPlants = useMemo(() => {
    return plants.filter((plant) => {
      if (filter === 'needs_water') return doesPlantNeedWatering(plant);
      if (filter === 'succulent') return plant.species.plantType === 'succulent';
      if (filter === 'propagation') return plant.species.plantType === 'propagation';
      return true;
    });
  }, [plants, filter]);

  const mockActive = isMockAiEnabled();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.maxContainer}>
          {/* Top Header */}
          <View style={styles.headerRow}>
            <View style={styles.brandBlock}>
              <View style={styles.brandBadgeRow}>
                <Sprout size={18} color={Palette.primary} />
                <Text style={styles.brandEyebrow}>FLORALOG BOTANICAL NOTEBOOK</Text>
              </View>
              <Text style={styles.headerTitle}>My Garden</Text>
            </View>

            <View style={styles.headerActions}>
              <Pressable
                onPress={resetToSeedData}
                style={({ pressed }) => [
                  styles.iconGhostBtn,
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityLabel="Reset demo garden">
                <RotateCcw size={16} color={Palette.textSecondary} />
              </Pressable>

              <Pressable
                onPress={() => router.push('/(tabs)/scan')}
                style={({ pressed }) => [
                  styles.addPlantCta,
                  pressed && { opacity: 0.85 },
                ]}>
                <Plus size={16} color={Palette.textInverse} />
                <Text style={styles.addPlantCtaText}>AI Scan</Text>
              </Pressable>
            </View>
          </View>

          {/* AI Engine Mode Banner */}
          <View style={styles.aiBanner}>
            <Sparkles size={15} color={Palette.primary} />
            <Text style={styles.aiBannerText}>
              {mockActive
                ? 'Mock AI Botanical Engine Active (EXPO_PUBLIC_USE_MOCK_AI=true) • Crassulaceae Guardrails On'
                : 'Live Gemini Multimodal AI Connected • Crassulaceae Guardrails On'}
            </Text>
          </View>

          {/* Summary KPI Row */}
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiValue}>{stats.total}</Text>
              <Text style={styles.kpiLabel}>Active Specimens</Text>
            </View>

            <View
              style={[
                styles.kpiCard,
                stats.needsWaterCount > 0 && styles.kpiCardWaterAlert,
              ]}>
              <View style={styles.kpiInline}>
                <Droplets
                  size={16}
                  color={
                    stats.needsWaterCount > 0
                      ? Palette.waterAlertText
                      : Palette.waterBlue
                  }
                />
                <Text
                  style={[
                    styles.kpiValue,
                    stats.needsWaterCount > 0 && { color: Palette.waterAlertText },
                  ]}>
                  {stats.needsWaterCount}
                </Text>
              </View>
              <Text style={styles.kpiLabel}>Needs Watering</Text>
            </View>

            <View
              style={[
                styles.kpiCard,
                stats.needsAttentionCount > 0 && styles.kpiCardAttention,
              ]}>
              <View style={styles.kpiInline}>
                <AlertTriangle
                  size={16}
                  color={
                    stats.needsAttentionCount > 0
                      ? Palette.attentionText
                      : Palette.primaryMuted
                  }
                />
                <Text
                  style={[
                    styles.kpiValue,
                    stats.needsAttentionCount > 0 && {
                      color: Palette.attentionText,
                    },
                  ]}>
                  {stats.needsAttentionCount}
                </Text>
              </View>
              <Text style={styles.kpiLabel}>Health Alerts</Text>
            </View>
          </View>

          {/* Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterBar}>
            {(
              [
                { key: 'all', label: `All Plants (${plants.length})` },
                {
                  key: 'needs_water',
                  label: `Needs Watering (${stats.needsWaterCount})`,
                },
                { key: 'succulent', label: 'Succulents' },
                { key: 'propagation', label: 'Propagations' },
              ] as const
            ).map((item) => {
              const active = filter === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setFilter(item.key)}
                  style={[
                    styles.filterPill,
                    active && styles.filterPillActive,
                  ]}>
                  <Text
                    style={[
                      styles.filterPillText,
                      active && styles.filterPillTextActive,
                    ]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Plant Cards List */}
          <View style={styles.cardsColumn}>
            {filteredPlants.map((plant) => {
              const healthStatus =
                plant.latestHealthAssessment?.healthStatus ?? 'thriving';
              const badge = HealthBadgeTheme[healthStatus];
              const daysUntilWater = getDaysUntilNextWater(plant);
              const needsWater = daysUntilWater <= 0;

              return (
                <Pressable
                  key={plant.id}
                  onPress={() =>
                    router.push({
                      pathname: '/plant/[id]',
                      params: { id: plant.id },
                    })
                  }
                  style={({ pressed }) => [
                    styles.plantCard,
                    pressed && styles.plantCardPressed,
                  ]}>
                  {/* Top Row: Thumbnail + Title + Health Status Badge */}
                  <View style={styles.cardTopRow}>
                    <Image
                      source={{ uri: plant.photoUri }}
                      style={styles.thumbnail}
                      contentFit="cover"
                    />

                    <View style={styles.cardHeaderMeta}>
                      <View style={styles.titleBadgeRow}>
                        <Text style={styles.plantNickname} numberOfLines={1}>
                          {plant.nickname}
                        </Text>

                        <View
                          style={[
                            styles.healthBadge,
                            {
                              backgroundColor: badge.bg,
                              borderColor: badge.border,
                            },
                          ]}>
                          <View
                            style={[
                              styles.statusDot,
                              { backgroundColor: badge.dot },
                            ]}
                          />
                          <Text
                            style={[
                              styles.healthBadgeText,
                              { color: badge.text },
                            ]}>
                            {badge.label}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.speciesLine} numberOfLines={1}>
                        {plant.species.commonName} •{' '}
                        <Text style={styles.scientificItalic}>
                          {plant.species.scientificName}
                        </Text>
                      </Text>

                      <View style={styles.metaChipsRow}>
                        <View style={styles.typeChip}>
                          <Text style={styles.typeChipText}>
                            {PLANT_TYPE_LABELS[plant.species.plantType]}
                          </Text>
                        </View>

                        <View style={styles.locationChip}>
                          <MapPin size={12} color={Palette.textSecondary} />
                          <Text style={styles.locationText} numberOfLines={1}>
                            {plant.location}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Latest AI Health Summary Snippet */}
                  {plant.latestHealthAssessment && (
                    <View style={styles.diagnosisSnippetBox}>
                      <Text style={styles.diagnosisSnippetText} numberOfLines={2}>
                        <Text style={styles.diagnosisSnippetPrefix}>AI Note: </Text>
                        {plant.latestHealthAssessment.diagnosisSummary}
                      </Text>
                    </View>
                  )}

                  {/* Footer Strip: Watering Indicator + Quick Water Action */}
                  <View style={styles.cardFooter}>
                    {needsWater ? (
                      <View style={styles.needsWaterBadge}>
                        <Droplets size={14} color={Palette.waterAlertText} />
                        <Text style={styles.needsWaterBadgeText}>
                          {daysUntilWater === 0
                            ? 'Needs Watering Today'
                            : `Needs Watering (${Math.abs(daysUntilWater)}d overdue)`}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.waterScheduleInfo}>
                        <CheckCircle2 size={14} color={Palette.primaryMuted} />
                        <Text style={styles.waterScheduleText}>
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
                            waterPlantNow(plant.id);
                          }}
                          style={({ pressed }) => [
                            styles.quickWaterBtn,
                            pressed && { opacity: 0.8 },
                          ]}>
                          <Droplets size={13} color={Palette.textInverse} />
                          <Text style={styles.quickWaterBtnText}>
                            {plant.species.plantType === 'propagation'
                              ? 'Refresh Water'
                              : 'Log Water'}
                          </Text>
                        </Pressable>
                      )}

                      <View style={styles.openNotebookLink}>
                        <Text style={styles.openNotebookText}>Notebook</Text>
                        <ChevronRight size={15} color={Palette.primary} />
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.bgPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl * 1.5,
    alignItems: 'center',
  },
  maxContainer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  brandBlock: {
    gap: 2,
  },
  brandBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: Palette.primary,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconGhostBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: Palette.bgSubtle,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPlantCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.full,
  },
  addPlantCtaText: {
    color: Palette.textInverse,
    fontSize: 13,
    fontWeight: '700',
  },
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Palette.primarySoft,
    borderColor: '#C5DEC9',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
  },
  aiBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: Palette.primary,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: Palette.bgSurface,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 2,
    ...CardShadow,
  },
  kpiCardWaterAlert: {
    backgroundColor: Palette.waterAlertBg,
    borderColor: Palette.waterAlertBorder,
  },
  kpiCardAttention: {
    backgroundColor: Palette.attentionBg,
    borderColor: Palette.attentionBorder,
  },
  kpiInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Palette.textSecondary,
  },
  filterBar: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Palette.bgSubtle,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
  },
  filterPillActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  filterPillTextActive: {
    color: Palette.textInverse,
  },
  cardsColumn: {
    gap: Spacing.md,
  },
  plantCard: {
    backgroundColor: Palette.bgSurface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...CardShadow,
  },
  plantCardPressed: {
    backgroundColor: '#FAF8F4',
  },
  cardTopRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  thumbnail: {
    width: 78,
    height: 78,
    borderRadius: 14,
    backgroundColor: Palette.bgSubtle,
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
    color: Palette.textPrimary,
  },
  healthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  healthBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  speciesLine: {
    fontSize: 13,
    color: Palette.textSecondary,
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
    backgroundColor: Palette.bgSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.primary,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  diagnosisSnippetBox: {
    backgroundColor: Palette.bgPrimary,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
  },
  diagnosisSnippetPrefix: {
    fontWeight: '700',
    color: Palette.primary,
  },
  diagnosisSnippetText: {
    fontSize: 13,
    lineHeight: 19,
    color: Palette.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: Palette.bgSubtle,
  },
  needsWaterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.waterAlertBg,
    borderColor: Palette.waterAlertBorder,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  needsWaterBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.waterAlertText,
  },
  waterScheduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  waterScheduleText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textSecondary,
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
    backgroundColor: Palette.waterBlue,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  quickWaterBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.textInverse,
  },
  openNotebookLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  openNotebookText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.primary,
  },
});

