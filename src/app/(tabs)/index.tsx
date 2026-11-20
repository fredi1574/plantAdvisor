import { router } from 'expo-router';
import { LayoutGrid, LayoutList, MapPin, Sprout } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  GardenControlsCard,
  type GardenFilterMode,
  type GardenSortMode,
  type GardenStats,
} from '@/components/garden/garden-controls-card';
import { GardenEmptyState } from '@/components/garden/garden-empty-state';
import { PlantGridCard } from '@/components/garden/plant-grid-card';
import { SwipeablePlantCard } from '@/components/garden/swipeable-plant-card';
import { EditPlantModal } from '@/components/modals/edit-plant-modal';
import { AnimatedEntrance } from '@/components/ui/animated-wrappers';
import { BotanicalBackground } from '@/components/ui/botanical-background';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SyncStatusBanner } from '@/components/ui/sync-status-banner';
import {
  BorderWidth,
  BottomTabInset,
  MaxContentWidth,
  Radius,
  Spacing,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { useToast } from '@/hooks/use-toast';
import { confirmAction } from '@/services/dialogs';
import { countLocalOnlyPhotos } from '@/store/syncQueue';
import { useAuthStore } from '@/store/useAuthStore';
import {
  doesPlantNeedWatering,
  getDaysUntilNextWater,
  usePlantStore,
} from '@/store/usePlantStore';
import type { HealthStatus, UserPlant } from '@/types/plant';

type ViewMode = 'list' | 'grid';

const HEALTH_PRIORITY: Record<HealthStatus, number> = {
  critical: 0,
  needs_attention: 1,
  thriving: 2,
};

export default function MyGardenScreen() {
  const palette = usePalette();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const plants = usePlantStore((s) => s.plants);
  const entries = usePlantStore((s) => s.entries);
  const isSyncing = usePlantStore((s) => s.isSyncing);
  const pendingSyncCount = usePlantStore((s) => s.pendingSyncCount);
  const syncError = usePlantStore((s) => s.syncError);
  const syncWithSupabase = usePlantStore((s) => s.syncWithSupabase);
  const waterPlantNow = usePlantStore((s) => s.waterPlantNow);
  const deletePlant = usePlantStore((s) => s.deletePlant);

  const localPhotoCount = useMemo(
    () => countLocalOnlyPhotos(plants, entries),
    [plants, entries]
  );

  const [filter, setFilter] = useState<GardenFilterMode>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<GardenSortMode>('needs_water');
  const [groupByLocation, setGroupByLocation] = useState(false);
  const [editingPlant, setEditingPlant] = useState<UserPlant | null>(null);

  const { message: feedbackMessage, showToast } = useToast();

  const userName =
    profile?.displayName?.trim() ||
    (user?.user_metadata?.display_name as string)?.trim() ||
    (user?.user_metadata?.name as string)?.trim() ||
    (user?.user_metadata?.full_name as string)?.trim() ||
    user?.email?.split('@')[0]?.trim() ||
    'Gardener';

  const stats: GardenStats = useMemo(() => {
    let needsWaterCount = 0;
    let needsAttentionCount = 0;
    let succulentCount = 0;
    let propagationCount = 0;
    let foliageCount = 0;
    let floweringCount = 0;

    for (const plant of plants) {
      if (doesPlantNeedWatering(plant)) needsWaterCount += 1;
      const health = plant.latestHealthAssessment?.healthStatus;
      if (health === 'needs_attention' || health === 'critical') {
        needsAttentionCount += 1;
      }
      if (plant.species.plantType === 'succulent') succulentCount += 1;
      else if (plant.species.plantType === 'propagation') propagationCount += 1;
      else if (plant.species.plantType === 'foliage') foliageCount += 1;
      else if (plant.species.plantType === 'flowering') floweringCount += 1;
    }

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

  const handleDeletePlant = (plant: UserPlant) => {
    confirmAction({
      title: 'Delete Plant',
      message: `Are you sure you want to delete "${plant.nickname}" (${plant.species.commonName}) and its care history?`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => {
        deletePlant(plant.id);
        showToast(`Removed "${plant.nickname}" from My Garden.`);
      },
    });
  };

  const filteredPlants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = plants.filter((plant) => {
      if (q) {
        const matchesQuery =
          plant.nickname.toLowerCase().includes(q) ||
          plant.species.commonName.toLowerCase().includes(q) ||
          plant.species.scientificName.toLowerCase().includes(q) ||
          plant.location.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }
      if (filter === 'needs_water') return doesPlantNeedWatering(plant);
      if (filter === 'needs_attention') {
        const status = plant.latestHealthAssessment?.healthStatus;
        return status === 'needs_attention' || status === 'critical';
      }
      if (filter !== 'all') {
        return plant.species.plantType === filter;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'needs_water') {
        return getDaysUntilNextWater(a) - getDaysUntilNextWater(b);
      }
      if (sortBy === 'health') {
        const pa = a.latestHealthAssessment
          ? HEALTH_PRIORITY[a.latestHealthAssessment.healthStatus]
          : 3;
        const pb = b.latestHealthAssessment
          ? HEALTH_PRIORITY[b.latestHealthAssessment.healthStatus]
          : 3;
        if (pa !== pb) return pa - pb;
        return getDaysUntilNextWater(a) - getDaysUntilNextWater(b);
      }
      if (sortBy === 'alpha') {
        return a.nickname.localeCompare(b.nickname);
      }
      return (
        new Date(b.acquiredAt).getTime() - new Date(a.acquiredAt).getTime()
      );
    });
  }, [plants, filter, searchQuery, sortBy]);

  const plantsByLocation = useMemo(() => {
    const map = new Map<string, UserPlant[]>();
    for (const plant of filteredPlants) {
      const loc = plant.location.trim() || 'Unspecified Spot';
      const existing = map.get(loc);
      if (existing) {
        existing.push(plant);
      } else {
        map.set(loc, [plant]);
      }
    }
    return Array.from(map.entries()).map(([location, items]) => ({
      location,
      items,
    }));
  }, [filteredPlants]);

  const renderPlantCollection = (items: UserPlant[]) => {
    if (viewMode === 'list') {
      return (
        <View style={styles.listStack}>
          {items.map((plant, idx) => (
            <AnimatedEntrance key={plant.id} index={idx} animateLayout>
              <SwipeablePlantCard
                plant={plant}
                onPress={() => router.push(`/plant/${plant.id}`)}
                onWaterNow={() => {
                  waterPlantNow(plant.id);
                  showToast(`Watered "${plant.nickname}"!`);
                }}
                onEdit={setEditingPlant}
                onDelete={handleDeletePlant}
              />
            </AnimatedEntrance>
          ))}
        </View>
      );
    }

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
                onPress={() => router.push(`/plant/${plant.id}`)}
                onWaterNow={() => {
                  waterPlantNow(plant.id);
                  showToast(`Watered "${plant.nickname}"!`);
                }}
                onLongPress={() => setEditingPlant(plant)}
              />
            ))}
            {row.length === 1 && <View style={styles.gridSpacer} />}
          </AnimatedEntrance>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.bgPrimary }]}
      edges={['top']}>
      <BotanicalBackground variant="garden" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.maxContainer}>
          <ScreenHeader
            eyebrow="FLORALOG BOTANICAL NOTEBOOK"
            title={`Welcome, ${userName}`}
            icon={<Sprout size={16} color={palette.primary} />}
            rightSlot={
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
                    onPress={() => setViewMode('list')}
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
                        viewMode === 'list'
                          ? palette.textInverse
                          : palette.textSecondary
                      }
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => setViewMode('grid')}
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
                        viewMode === 'grid'
                          ? palette.textInverse
                          : palette.textSecondary
                      }
                    />
                  </Pressable>
                </View>
              </View>
            }
          />

          <FeedbackBanner message={feedbackMessage} />

          <SyncStatusBanner
            visible={Boolean(user)}
            isSyncing={isSyncing}
            pendingSyncCount={pendingSyncCount}
            localPhotoCount={localPhotoCount}
            syncError={syncError}
            onSyncNow={() => {
              void (async () => {
                await syncWithSupabase();
                const latestError = usePlantStore.getState().syncError;
                showToast(
                  latestError
                    ? latestError
                    : 'Garden synced with Supabase cloud!'
                );
              })();
            }}
          />

          <GardenControlsCard
            hasPlants={plants.length > 0}
            stats={stats}
            searchQuery={searchQuery}
            filter={filter}
            sortBy={sortBy}
            groupByLocation={groupByLocation}
            onChangeSearch={setSearchQuery}
            onSelectFilter={setFilter}
            onSelectSort={setSortBy}
            onToggleGroupByLocation={() => setGroupByLocation((prev) => !prev)}
          />

          {plants.length === 0 ? (
            <GardenEmptyState
              variant="empty-garden"
              onAction={() => router.push('/(tabs)/scan')}
            />
          ) : filteredPlants.length === 0 ? (
            <GardenEmptyState
              variant="no-matches"
              onAction={() => {
                setFilter('all');
                setSearchQuery('');
              }}
            />
          ) : groupByLocation ? (
            <View style={styles.locationGroups}>
              {plantsByLocation.map((group) => (
                <View key={group.location} style={styles.locationGroup}>
                  <View style={styles.locationHeaderRow}>
                    <MapPin size={14} color={palette.primary} />
                    <Text
                      style={[
                        styles.locationTitle,
                        { color: palette.textPrimary },
                      ]}>
                      {group.location}
                    </Text>
                    <Text
                      style={[
                        styles.locationCount,
                        { color: palette.textMuted },
                      ]}>
                      ({group.items.length})
                    </Text>
                  </View>
                  {renderPlantCollection(group.items)}
                </View>
              ))}
            </View>
          ) : (
            renderPlantCollection(filteredPlants)
          )}
        </View>
      </ScrollView>

      <EditPlantModal
        visible={Boolean(editingPlant)}
        plant={editingPlant}
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: BottomTabInset + Spacing.xl,
    alignItems: 'center',
  },
  maxContainer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.md,
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
  locationGroups: {
    gap: Spacing.lg,
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
});
