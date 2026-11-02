import { router } from 'expo-router';
import {
  ArrowLeftRight,
  CheckCircle2,
  Droplet,
  Droplets,
  Leaf,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sprout,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EditPlantModal } from '@/components/edit-plant-modal';
import { SwipeablePlantCard } from '@/components/swipeable-plant-card';
import {
  CardShadow,
  MaxContentWidth,
  Palette,
  Radius,
  Spacing,
} from '@/constants/theme';
import { isMockAiEnabled } from '@/services/aiPlantService';
import {
  doesPlantNeedWatering,
  usePlantStore,
} from '@/store/usePlantStore';
import type { UserPlant } from '@/types/plant';

type FilterMode =
  | 'all'
  | 'needs_water'
  | 'needs_attention'
  | 'succulent'
  | 'propagation';

export default function MyGardenScreen() {
  const plants = usePlantStore((s) => s.plants);
  const waterPlantNow = usePlantStore((s) => s.waterPlantNow);
  const waterAllNeedingWater = usePlantStore((s) => s.waterAllNeedingWater);
  const deletePlant = usePlantStore((s) => s.deletePlant);

  const [filter, setFilter] = useState<FilterMode>('all');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [editingPlant, setEditingPlant] = useState<UserPlant | null>(null);

  const showToast = (message: string) => {
    setFeedbackMessage(message);
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 3500);
  };

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

  const handleWaterAll = () => {
    if (stats.needsWaterCount === 0) return;

    const performWatering = () => {
      const count = waterAllNeedingWater();
      if (count > 0) {
        showToast(
          `All ${count} ${count === 1 ? 'plant' : 'plants'} marked as watered! 🌿`
        );
      }
    };

    const confirmText = `Mark all ${stats.needsWaterCount} ${
      stats.needsWaterCount === 1 ? 'plant' : 'plants'
    } needing water as watered?`;

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(confirmText)) {
        performWatering();
      }
    } else {
      Alert.alert('Water All Plants', confirmText, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark Watered', style: 'default', onPress: performWatering },
      ]);
    }
  };

  const handleDeletePlant = (plant: UserPlant) => {
    const performDelete = () => {
      deletePlant(plant.id);
      showToast(`Removed "${plant.nickname}" from My Garden.`);
    };

    const confirmText = `Are you sure you want to delete "${plant.nickname}" (${plant.species.commonName}) and its care history?`;

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(confirmText)) {
        performDelete();
      }
    } else {
      Alert.alert('Delete Plant', confirmText, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: performDelete },
      ]);
    }
  };

  const filteredPlants = useMemo(() => {
    return plants.filter((plant) => {
      if (filter === 'needs_water') return doesPlantNeedWatering(plant);
      if (filter === 'needs_attention') {
        const status = plant.latestHealthAssessment?.healthStatus;
        return status === 'needs_attention' || status === 'critical';
      }
      if (filter === 'succulent') return plant.species.plantType === 'succulent';
      if (filter === 'propagation')
        return plant.species.plantType === 'propagation';
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
                <Text style={styles.brandEyebrow}>
                  FLORALOG BOTANICAL NOTEBOOK
                </Text>
              </View>
              <Text style={styles.headerTitle}>My Garden</Text>
            </View>

            <Pressable
              onPress={handleWaterAll}
              disabled={stats.needsWaterCount === 0}
              style={({ pressed }) => [
                styles.headerWaterAllBtn,
                stats.needsWaterCount === 0
                  ? styles.headerWaterAllBtnDisabled
                  : styles.headerWaterAllBtnActive,
                pressed && styles.headerWaterAllBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                stats.needsWaterCount > 0
                  ? `Mark all ${stats.needsWaterCount} plants needing water as watered`
                  : 'All plants watered'
              }>
              {stats.needsWaterCount > 0 ? (
                <>
                  <Droplets size={15} color={Palette.textInverse} />
                  <Text style={styles.headerWaterAllText}>
                    Water All ({stats.needsWaterCount})
                  </Text>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} color="#15803D" />
                  <Text style={styles.headerWaterAllTextDisabled}>
                    All Watered
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          {/* User Feedback Toast */}
          {feedbackMessage && (
            <View style={styles.feedbackBanner}>
              <CheckCircle2 size={16} color="#15803D" />
              <Text style={styles.feedbackBannerText}>{feedbackMessage}</Text>
            </View>
          )}

          {/* AI Engine Mode Banner */}
          <View style={styles.aiBanner}>
            <Sparkles size={15} color={Palette.primary} />
            <Text style={styles.aiBannerText}>
              {mockActive
                ? 'Mock AI Botanical Engine Active (EXPO_PUBLIC_USE_MOCK_AI=true) • Crassulaceae Guardrails On'
                : 'Live Gemini Multimodal AI Connected • Crassulaceae Guardrails On'}
            </Text>
          </View>

          {/* Summary KPI Row — Themed Organic Botanical Cards */}
          <View style={styles.kpiRow}>
            {/* Card 1: Active Specimens (Leaf Silhouette) */}
            <Pressable
              onPress={() => setFilter('all')}
              style={({ pressed }) => [
                styles.kpiCardBase,
                styles.kpiCardLeaf,
                filter === 'all' && styles.kpiCardActiveRing,
                pressed && styles.kpiCardPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Active specimens: ${stats.total}. Tap to show all plants.`}>
              <View style={styles.kpiHeaderRow}>
                <View style={[styles.kpiIconPill, styles.kpiIconPillLeaf]}>
                  <Leaf size={14} color={Palette.primary} />
                </View>
                <Text style={[styles.kpiTag, styles.kpiTagLeaf]}>Garden</Text>
              </View>
              <Text style={[styles.kpiValue, styles.kpiValueLeaf]}>
                {stats.total}
              </Text>
              <Text style={styles.kpiLabel}>Active{'\n'}Specimens</Text>
            </Pressable>

            {/* Card 2: Needs Watering (Water Drop Silhouette) */}
            <Pressable
              onPress={() =>
                setFilter(filter === 'needs_water' ? 'all' : 'needs_water')
              }
              style={({ pressed }) => [
                styles.kpiCardBase,
                styles.kpiCardDrop,
                stats.needsWaterCount > 0
                  ? styles.kpiDropAlert
                  : styles.kpiDropCalm,
                filter === 'needs_water' && styles.kpiCardActiveRing,
                pressed && styles.kpiCardPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Needs watering: ${stats.needsWaterCount}. Tap to filter.`}>
              <View style={styles.kpiHeaderRow}>
                <View
                  style={[
                    styles.kpiIconPill,
                    stats.needsWaterCount > 0
                      ? styles.kpiIconPillDropAlert
                      : styles.kpiIconPillDropCalm,
                  ]}>
                  <Droplet
                    size={14}
                    color={stats.needsWaterCount > 0 ? '#0284C7' : '#0EA5E9'}
                    fill={stats.needsWaterCount > 0 ? '#38BDF8' : '#BAE6FD'}
                  />
                </View>
                <Text
                  style={[
                    styles.kpiTag,
                    stats.needsWaterCount > 0
                      ? styles.kpiTagDropAlert
                      : styles.kpiTagDropCalm,
                  ]}>
                  {stats.needsWaterCount > 0 ? 'Thirsty' : 'Good'}
                </Text>
              </View>
              <Text
                style={[
                  styles.kpiValue,
                  stats.needsWaterCount > 0
                    ? styles.kpiValueDropAlert
                    : styles.kpiValueDropCalm,
                ]}>
                {stats.needsWaterCount}
              </Text>
              <Text style={styles.kpiLabel}>Needs{'\n'}Watering</Text>
            </Pressable>

            {/* Card 3: Health Alerts (Vitality Shield Silhouette) */}
            <Pressable
              onPress={() =>
                setFilter(
                  filter === 'needs_attention' ? 'all' : 'needs_attention'
                )
              }
              style={({ pressed }) => [
                styles.kpiCardBase,
                styles.kpiCardShield,
                stats.needsAttentionCount > 0
                  ? styles.kpiShieldAlert
                  : styles.kpiShieldCalm,
                filter === 'needs_attention' && styles.kpiCardActiveRing,
                pressed && styles.kpiCardPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Health alerts: ${stats.needsAttentionCount}. Tap to filter.`}>
              <View style={styles.kpiHeaderRow}>
                <View
                  style={[
                    styles.kpiIconPill,
                    stats.needsAttentionCount > 0
                      ? styles.kpiIconPillShieldAlert
                      : styles.kpiIconPillShieldCalm,
                  ]}>
                  {stats.needsAttentionCount > 0 ? (
                    <ShieldAlert size={14} color="#B45309" fill="#FDE68A" />
                  ) : (
                    <ShieldCheck size={14} color="#16A34A" fill="#BBF7D0" />
                  )}
                </View>
                <Text
                  style={[
                    styles.kpiTag,
                    stats.needsAttentionCount > 0
                      ? styles.kpiTagShieldAlert
                      : styles.kpiTagShieldCalm,
                  ]}>
                  {stats.needsAttentionCount > 0 ? 'Alert' : 'Thriving'}
                </Text>
              </View>
              <Text
                style={[
                  styles.kpiValue,
                  stats.needsAttentionCount > 0
                    ? styles.kpiValueShieldAlert
                    : styles.kpiValueShieldCalm,
                ]}>
                {stats.needsAttentionCount}
              </Text>
              <Text style={styles.kpiLabel}>Health{'\n'}Alerts</Text>
            </Pressable>
          </View>

          {/* Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterBar}>
            {[
              { key: 'all' as const, label: `All Plants (${plants.length})` },
              {
                key: 'needs_water' as const,
                label: `Needs Watering (${stats.needsWaterCount})`,
              },
              ...(stats.needsAttentionCount > 0
                ? [
                    {
                      key: 'needs_attention' as const,
                      label: `Alerts (${stats.needsAttentionCount})`,
                    },
                  ]
                : []),
              { key: 'succulent' as const, label: 'Succulents' },
              { key: 'propagation' as const, label: 'Propagations' },
            ].map((item) => {
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

          {/* Dedicated Batch Watering Action Banner */}
          {stats.needsWaterCount > 0 && (
            <View style={styles.batchWaterBanner}>
              <View style={styles.batchWaterIconWrap}>
                <Droplets size={20} color="#0284C7" />
              </View>
              <View style={styles.batchWaterTextCol}>
                <Text style={styles.batchWaterTitle}>
                  {stats.needsWaterCount}{' '}
                  {stats.needsWaterCount === 1
                    ? 'plant needs water'
                    : 'plants need water'}
                </Text>
                <Text style={styles.batchWaterSubtitle}>
                  Hydrate all due specimens in one tap
                </Text>
              </View>
              <Pressable
                onPress={handleWaterAll}
                style={({ pressed }) => [
                  styles.batchWaterActionBtn,
                  pressed && styles.batchWaterActionBtnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Water all ${stats.needsWaterCount} plants needing water`}>
                <Droplets size={14} color={Palette.textInverse} />
                <Text style={styles.batchWaterActionBtnText}>Water All</Text>
              </Pressable>
            </View>
          )}

          {/* Swipe Gesture Helper Strip */}
          {filteredPlants.length > 0 && (
            <View style={styles.swipeHintRow}>
              <ArrowLeftRight size={13} color={Palette.textSecondary} />
              <Text style={styles.swipeHintText}>
                Swipe right to edit or swipe left to delete a plant
              </Text>
            </View>
          )}

          {/* Plant Cards List */}
          <View style={styles.cardsColumn}>
            {filteredPlants.length === 0 ? (
              <View style={styles.emptyFilterCard}>
                <View style={styles.emptyFilterIconWrap}>
                  <CheckCircle2 size={30} color="#15803D" />
                </View>
                <Text style={styles.emptyFilterTitle}>
                  {filter === 'needs_water'
                    ? 'All Plants Are Watered!'
                    : 'No Plants Found'}
                </Text>
                <Text style={styles.emptyFilterSubtitle}>
                  {filter === 'needs_water'
                    ? 'Every specimen in your garden is hydrated and healthy.'
                    : 'There are no specimens in this filter category.'}
                </Text>
                {filter !== 'all' && (
                  <Pressable
                    onPress={() => setFilter('all')}
                    style={styles.emptyFilterBtn}>
                    <Text style={styles.emptyFilterBtnText}>
                      View All Plants
                    </Text>
                  </Pressable>
                )}
              </View>
            ) : (
              filteredPlants.map((plant) => (
                <SwipeablePlantCard
                  key={plant.id}
                  plant={plant}
                  onPress={() =>
                    router.push({
                      pathname: '/plant/[id]',
                      params: { id: plant.id },
                    })
                  }
                  onWaterNow={() => waterPlantNow(plant.id)}
                  onEdit={(target) => setEditingPlant(target)}
                  onDelete={handleDeletePlant}
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <EditPlantModal
        plant={editingPlant}
        visible={Boolean(editingPlant)}
        onClose={() => setEditingPlant(null)}
        onSaved={(updatedName) =>
          showToast(`Updated "${updatedName}" details! 🌿`)
        }
        onRequestDelete={handleDeletePlant}
      />
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
  kpiCardBase: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1.5,
    minHeight: 114,
    justifyContent: 'space-between',
    ...CardShadow,
  },
  kpiCardPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  kpiCardActiveRing: {
    borderWidth: 2,
    borderColor: Palette.primary,
  },
  kpiCardLeaf: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 28,
    borderBottomLeftRadius: 8,
    backgroundColor: '#EDF5EF',
    borderColor: '#C3DEC8',
  },
  kpiCardDrop: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  kpiDropAlert: {
    backgroundColor: '#E0F2FE',
    borderColor: '#38BDF8',
  },
  kpiDropCalm: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  kpiCardShield: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 8,
  },
  kpiShieldAlert: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  kpiShieldCalm: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  kpiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  kpiIconPill: {
    width: 26,
    height: 26,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiIconPillLeaf: {
    backgroundColor: '#D8EBDE',
  },
  kpiIconPillDropAlert: {
    backgroundColor: '#BAE6FD',
  },
  kpiIconPillDropCalm: {
    backgroundColor: '#E0F2FE',
  },
  kpiIconPillShieldAlert: {
    backgroundColor: '#FDE68A',
  },
  kpiIconPillShieldCalm: {
    backgroundColor: '#DCFCE7',
  },
  kpiTag: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  kpiTagLeaf: {
    color: '#2D5A3C',
  },
  kpiTagDropAlert: {
    color: '#0369A1',
  },
  kpiTagDropCalm: {
    color: '#0284C7',
  },
  kpiTagShieldAlert: {
    color: '#B45309',
  },
  kpiTagShieldCalm: {
    color: '#15803D',
  },
  kpiValue: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  kpiValueLeaf: {
    color: '#1E3F2A',
  },
  kpiValueDropAlert: {
    color: '#0369A1',
  },
  kpiValueDropCalm: {
    color: '#0284C7',
  },
  kpiValueShieldAlert: {
    color: '#92400E',
  },
  kpiValueShieldCalm: {
    color: '#15803D',
  },
  kpiLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: Palette.textSecondary,
    marginTop: 2,
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
  swipeHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  swipeHintText: {
    fontSize: 12,
    fontWeight: '500',
    color: Palette.textSecondary,
  },
  cardsColumn: {
    gap: Spacing.md,
  },
  headerWaterAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    ...CardShadow,
  },
  headerWaterAllBtnActive: {
    backgroundColor: Palette.waterBlue,
  },
  headerWaterAllBtnDisabled: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  headerWaterAllBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  headerWaterAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.textInverse,
  },
  headerWaterAllTextDisabled: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  feedbackBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
  },
  batchWaterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    padding: 14,
    gap: 12,
    ...CardShadow,
  },
  batchWaterIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  batchWaterTextCol: {
    flex: 1,
    gap: 2,
  },
  batchWaterTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0369A1',
  },
  batchWaterSubtitle: {
    fontSize: 12,
    color: Palette.textSecondary,
  },
  batchWaterActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.waterBlue,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.full,
    ...CardShadow,
  },
  batchWaterActionBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  batchWaterActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textInverse,
  },
  emptyFilterCard: {
    backgroundColor: Palette.bgSurface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...CardShadow,
  },
  emptyFilterIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyFilterTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  emptyFilterSubtitle: {
    fontSize: 13,
    color: Palette.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 320,
  },
  emptyFilterBtn: {
    marginTop: 6,
    backgroundColor: Palette.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  emptyFilterBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textInverse,
  },
});
