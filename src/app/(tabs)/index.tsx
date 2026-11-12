import { router } from 'expo-router';
import { CheckCircle2, Droplets, Sprout } from 'lucide-react-native';
import { useMemo, useState } from 'react';
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
import {
  type FilterMode,
  GardenKpiRow,
  type GardenStats,
} from '@/components/garden-kpi-row';
import { GardenPlantsGrid } from '@/components/garden-plants-grid';
import { GardenPlantsList } from '@/components/garden-plants-list';
import {
  GardenViewToggle,
  type ViewMode,
} from '@/components/garden-view-toggle';
import {
  CardShadow,
  MaxContentWidth,
  Palette,
  Radius,
  Spacing,
} from '@/constants/theme';
import { doesPlantNeedWatering, usePlantStore } from '@/store/usePlantStore';
import type { UserPlant } from '@/types/plant';

export default function MyGardenScreen() {
  const plants = usePlantStore((s) => s.plants);
  const waterPlantNow = usePlantStore((s) => s.waterPlantNow);
  const waterAllNeedingWater = usePlantStore((s) => s.waterAllNeedingWater);
  const deletePlant = usePlantStore((s) => s.deletePlant);

  const [filter, setFilter] = useState<FilterMode>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [editingPlant, setEditingPlant] = useState<UserPlant | null>(null);

  const showToast = (message: string) => {
    setFeedbackMessage(message);
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 3500);
  };

  const stats: GardenStats = useMemo(() => {
    const needsWaterCount = plants.filter(doesPlantNeedWatering).length;
    const needsAttentionCount = plants.filter(
      (p) =>
        p.latestHealthAssessment?.healthStatus === 'needs_attention' ||
        p.latestHealthAssessment?.healthStatus === 'critical'
    ).length;
    const succulentCount = plants.filter(
      (p) => p.species.plantType === 'succulent'
    ).length;
    const propagationCount = plants.filter(
      (p) => p.species.plantType === 'propagation'
    ).length;
    const foliageCount = plants.filter(
      (p) => p.species.plantType === 'foliage'
    ).length;
    const floweringCount = plants.filter(
      (p) => p.species.plantType === 'flowering'
    ).length;

    return {
      total: plants.length,
      needsWaterCount,
      needsAttentionCount,
      succulentCount,
      propagationCount,
      foliageCount,
      floweringCount,
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

  const handleOpenPlant = (plantId: string) => {
    router.push({
      pathname: '/plant/[id]',
      params: { id: plantId },
    });
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
      if (filter === 'foliage') return plant.species.plantType === 'foliage';
      if (filter === 'flowering') return plant.species.plantType === 'flowering';
      return true;
    });
  }, [plants, filter]);

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

            <GardenViewToggle value={viewMode} onChange={setViewMode} />
          </View>

          {/* User Feedback Toast */}
          {feedbackMessage && (
            <View style={styles.feedbackBanner}>
              <CheckCircle2 size={16} color="#15803D" />
              <Text style={styles.feedbackBannerText}>{feedbackMessage}</Text>
            </View>
          )}

          {/* Swipeable KPI & Category Filter Cards Row */}
          <GardenKpiRow
            stats={stats}
            filter={filter}
            onSelectFilter={setFilter}
          />

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

          {/* Plant Collection View */}
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
          ) : viewMode === 'list' ? (
            <GardenPlantsList
              plants={filteredPlants}
              onPressPlant={handleOpenPlant}
              onWaterNow={waterPlantNow}
              onEdit={setEditingPlant}
              onDelete={handleDeletePlant}
            />
          ) : (
            <GardenPlantsGrid
              plants={filteredPlants}
              onPressPlant={handleOpenPlant}
              onWaterNow={waterPlantNow}
              onEdit={setEditingPlant}
            />
          )}
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
