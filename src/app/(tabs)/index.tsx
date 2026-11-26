import { router } from 'expo-router';
import { Sprout } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  GardenControlsCard,
  type GardenFilterMode,
  type GardenSortMode,
} from '@/components/garden/garden-controls-card';
import { GardenEmptyState } from '@/components/garden/garden-empty-state';
import {
  GardenContextBanners,
  GardenLocationGroup,
  GardenViewToggle,
} from '@/components/garden/garden-feed-sections';
import { PlantGridCard } from '@/components/garden/plant-grid-card';
import { SwipeablePlantCard } from '@/components/garden/swipeable-plant-card';
import { EditPlantModal } from '@/components/modals/edit-plant-modal';
import { OnboardingModal } from '@/components/modals/onboarding-modal';
import { AnimatedEntrance } from '@/components/ui/animated-wrappers';
import { BotanicalBackground } from '@/components/ui/botanical-background';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SyncStatusBanner } from '@/components/ui/sync-status-banner';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { type GardenViewMode, useGardenFeed } from '@/hooks/use-garden-feed';
import { usePalette } from '@/hooks/use-theme';
import { useToast } from '@/hooks/use-toast';
import { confirmAction } from '@/services/dialogs';
import { triggerLightHaptic } from '@/services/haptics';
import { countLocalOnlyPhotos } from '@/store/syncQueue';
import { useAuthStore } from '@/store/useAuthStore';
import { usePlantStore } from '@/store/usePlantStore';
import type { UserPlant } from '@/types/plant';

export default function MyGardenScreen() {
  const { t } = useTranslation();
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
  const snoozePlantWatering = usePlantStore((s) => s.snoozePlantWatering);
  const waterAllNeedingWater = usePlantStore((s) => s.waterAllNeedingWater);
  const undoWatering = usePlantStore((s) => s.undoWatering);
  const deletePlant = usePlantStore((s) => s.deletePlant);
  const hasCompletedOnboarding = usePlantStore((s) => s.hasCompletedOnboarding);
  const completeOnboarding = usePlantStore((s) => s.completeOnboarding);

  const [isStoreHydrated, setIsStoreHydrated] = useState(() =>
    usePlantStore.persist.hasHydrated()
  );
  useEffect(() => {
    if (isStoreHydrated) return;
    return usePlantStore.persist.onFinishHydration(() => {
      setIsStoreHydrated(true);
    });
  }, [isStoreHydrated]);

  const localPhotoCount = useMemo(
    () => countLocalOnlyPhotos(plants, entries),
    [plants, entries]
  );

  const [filter, setFilter] = useState<GardenFilterMode>('all');
  const [viewMode, setViewMode] = useState<GardenViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<GardenSortMode>('needs_water');
  const [groupByLocation, setGroupByLocation] = useState(false);
  const [editingPlant, setEditingPlant] = useState<UserPlant | null>(null);

  const {
    message: feedbackMessage,
    action: feedbackAction,
    showToast,
    dismissToast,
  } = useToast();

  const {
    stats,
    filteredPlants,
    feedData,
    isPropagationBench,
    latestRootLengthByPlantId,
    propagationReadyCount,
    numColumns,
  } = useGardenFeed({
    plants,
    entries,
    filter,
    searchQuery,
    sortBy,
    groupByLocation,
    viewMode,
  });

  const openPlantDetail = (plantId: string) => {
    router.push(`/plant/${plantId}`);
  };

  const handleQuickWater = (plant: UserPlant) => {
    const undoSnapshot = waterPlantNow(plant.id);
    showToast(t('garden.wateredToast', { name: plant.nickname }), {
      action: undoSnapshot
        ? {
            label: t('common.undo'),
            onPress: () => {
              undoWatering(undoSnapshot);
              showToast(t('garden.undoWateredToast', { name: plant.nickname }));
            },
          }
        : undefined,
    });
  };

  const handleSnoozePlant = (plant: UserPlant) => {
    const undoSnapshot = snoozePlantWatering(plant.id, 2);
    showToast(t('garden.snoozedToast', { name: plant.nickname, days: 2 }), {
      action: undoSnapshot
        ? {
            label: t('common.undo'),
            onPress: () => {
              undoWatering(undoSnapshot);
              showToast(t('garden.undoSnoozedToast', { name: plant.nickname }));
            },
          }
        : undefined,
    });
  };

  const userName =
    profile?.displayName?.trim() ||
    (user?.user_metadata?.display_name as string)?.trim() ||
    (user?.user_metadata?.name as string)?.trim() ||
    (user?.user_metadata?.full_name as string)?.trim() ||
    user?.email?.split('@')[0]?.trim() ||
    t('common.gardener');

  const handleWaterAllThirsty = () => {
    if (stats.needsWaterCount === 0) return;
    confirmAction({
      title: t('garden.waterAllTitle'),
      message: t('garden.waterAllMessage', { count: stats.needsWaterCount }),
      confirmLabel: t('garden.waterAllConfirm'),
      onConfirm: () => {
        const count = waterAllNeedingWater();
        if (count > 0) {
          const undoSnapshot = usePlantStore.getState().lastWateringUndo;
          showToast(t('garden.waterAllToast', { count }), {
            action: undoSnapshot
              ? {
                  label: t('common.undo'),
                  onPress: () => {
                    const restored = undoWatering(undoSnapshot);
                    showToast(
                      t('garden.undoWaterAllToast', { count: restored })
                    );
                  },
                }
              : undefined,
          });
        }
      },
    });
  };

  const handleDeletePlant = (plant: UserPlant) => {
    confirmAction({
      title: t('garden.deleteTitle'),
      message: t('garden.deleteMessage', { name: plant.nickname }),
      confirmLabel: t('garden.deleteConfirm'),
      destructive: true,
      onConfirm: () => {
        deletePlant(plant.id);
        showToast(t('garden.deleteToast', { name: plant.nickname }));
      },
    });
  };

  const handleRefresh = () => {
    triggerLightHaptic();
    void (async () => {
      await syncWithSupabase();
      const latestError = usePlantStore.getState().syncError;
      if (latestError) {
        showToast(latestError);
      }
    })();
  };

  const listHeader = (
    <View style={styles.headerStack}>
      <ScreenHeader
        eyebrow={t('garden.eyebrow')}
        title={t('garden.welcome', { name: userName })}
        icon={<Sprout size={16} color={palette.primary} />}
        rightSlot={
          <GardenViewToggle viewMode={viewMode} onChange={setViewMode} />
        }
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

      <GardenContextBanners
        filter={filter}
        filteredCount={filteredPlants.length}
        isPropagationBench={isPropagationBench}
        propagationReadyCount={propagationReadyCount}
        onWaterAllThirsty={handleWaterAllThirsty}
      />
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.bgPrimary }]}
      edges={['top']}>
      <BotanicalBackground variant="garden" />

      <FeedbackBanner
        floating
        message={feedbackMessage}
        action={feedbackAction}
        onDismiss={dismissToast}
      />

      <SyncStatusBanner
        floating
        visible={Boolean(user) && !feedbackMessage}
        isSyncing={isSyncing}
        pendingSyncCount={pendingSyncCount}
        localPhotoCount={localPhotoCount}
        syncError={syncError}
        onSyncNow={() => {
          void (async () => {
            await syncWithSupabase();
            const latestError = usePlantStore.getState().syncError;
            showToast(latestError ? latestError : t('garden.syncedToast'));
          })();
        }}
      />

      <FlatList
        key={groupByLocation ? 'grouped' : viewMode}
        data={feedData}
        numColumns={numColumns}
        keyExtractor={(item) =>
          item.kind === 'plant' ? item.plant.id : `loc-${item.location}`
        }
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        columnWrapperStyle={numColumns === 2 ? styles.flatGridRow : undefined}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isSyncing}
            onRefresh={handleRefresh}
            tintColor={palette.primary}
            colors={[palette.primary]}
          />
        }
        ListHeaderComponent={listHeader}
        ListHeaderComponentStyle={styles.maxWidthWrap}
        ListEmptyComponent={
          <View style={styles.maxWidthWrap}>
            {plants.length === 0 ? (
              <GardenEmptyState
                variant="empty-garden"
                onAction={() => router.push('/(tabs)/scan')}
              />
            ) : (
              <GardenEmptyState
                variant="no-matches"
                onAction={() => {
                  setFilter('all');
                  setSearchQuery('');
                }}
              />
            )}
          </View>
        }
        renderItem={({ item, index }) => {
          if (item.kind === 'location_group') {
            return (
              <GardenLocationGroup
                location={item.location}
                items={item.items}
                viewMode={viewMode}
                isPropagationBench={isPropagationBench}
                latestRootLengthByPlantId={latestRootLengthByPlantId}
                onOpenPlant={openPlantDetail}
                onQuickWater={handleQuickWater}
                onSnooze={handleSnoozePlant}
                onEdit={setEditingPlant}
                onDelete={handleDeletePlant}
              />
            );
          }

          if (numColumns === 2) {
            return (
              <View style={styles.gridItemCell}>
                <PlantGridCard
                  plant={item.plant}
                  onPress={() => openPlantDetail(item.plant.id)}
                  onWaterNow={() => handleQuickWater(item.plant)}
                  onLongPress={() => setEditingPlant(item.plant)}
                  showPropagationProgress={isPropagationBench}
                  latestRootLengthCm={
                    latestRootLengthByPlantId.get(item.plant.id) ?? null
                  }
                />
              </View>
            );
          }

          return (
            <View style={styles.maxWidthWrap}>
              <AnimatedEntrance index={index} animateLayout>
                <SwipeablePlantCard
                  plant={item.plant}
                  onPress={() => openPlantDetail(item.plant.id)}
                  onWaterNow={() => handleQuickWater(item.plant)}
                  onSnooze={() => handleSnoozePlant(item.plant)}
                  onEdit={setEditingPlant}
                  onDelete={handleDeletePlant}
                  showPropagationProgress={isPropagationBench}
                  latestRootLengthCm={
                    latestRootLengthByPlantId.get(item.plant.id) ?? null
                  }
                />
              </AnimatedEntrance>
            </View>
          );
        }}
      />

      <EditPlantModal
        visible={Boolean(editingPlant)}
        plant={editingPlant}
        onClose={() => setEditingPlant(null)}
        onSaved={(updatedName) =>
          showToast(
            `${t('plantDetail.updatedPlantToast', { name: updatedName })} 🌿`
          )
        }
        onRequestDelete={handleDeletePlant}
      />

      <OnboardingModal
        visible={isStoreHydrated && !hasCompletedOnboarding}
        onStartScan={() => {
          completeOnboarding();
          router.push('/(tabs)/scan');
        }}
        onExploreSample={() => {
          completeOnboarding();
        }}
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
    gap: Spacing.md,
  },
  maxWidthWrap: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  headerStack: {
    gap: Spacing.md,
  },
  flatGridRow: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.md,
  },
  gridItemCell: {
    flex: 1,
  },
});
