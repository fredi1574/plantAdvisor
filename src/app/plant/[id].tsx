import { router, useLocalSearchParams } from 'expo-router';
import {
  BookOpen,
  Pencil,
  Sprout,
  Stethoscope,
  Trash2,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EditLogModal } from '@/components/modals/edit-log-modal';
import { EditPlantModal } from '@/components/modals/edit-plant-modal';
import { CareLogSection } from '@/components/plant-detail/care-log-section';
import { GrowthTrendChart } from '@/components/plant-detail/growth-trend-chart';
import { PlantAdaptiveCareCard } from '@/components/plant-detail/plant-adaptive-care-card';
import { PlantHealthAssessmentCard } from '@/components/plant-detail/plant-health-assessment-card';
import {
  PlantHeroCard,
  PlantOverviewSpecs,
} from '@/components/plant-detail/plant-hero-card';
import { VisualProgressGallery } from '@/components/plant-detail/visual-progress-gallery';
import {
  AnimatedEntrance,
  MOTION_SPRINGS,
} from '@/components/ui/animated-wrappers';
import { BotanicalBackground } from '@/components/ui/botanical-background';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import {
  BorderWidth,
  getHealthBadgeTheme,
  MaxContentWidth,
  Radius,
  Spacing,
  Typography,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { useToast } from '@/hooks/use-toast';
import { confirmAction } from '@/services/dialogs';
import { triggerLightHaptic } from '@/services/haptics';
import { usePlantStore } from '@/store/usePlantStore';
import type { NotebookEntry } from '@/types/plant';

type DetailTab = 'overview' | 'journal' | 'health';

const DETAIL_TABS: { key: DetailTab; labelKey: string }[] = [
  { key: 'overview', labelKey: 'plantDetail.tabs.overview' },
  { key: 'journal', labelKey: 'plantDetail.tabs.journal' },
  { key: 'health', labelKey: 'plantDetail.tabs.health' },
];

export default function PlantDetailNotebookScreen() {
  const { t } = useTranslation();
  const palette = usePalette();
  const reducedMotion = useReducedMotion();
  const { id } = useLocalSearchParams<{ id: string }>();

  const plants = usePlantStore((s) => s.plants);
  const entries = usePlantStore((s) => s.entries);
  const healthAssessments = usePlantStore((s) => s.healthAssessments);
  const waterPlantNow = usePlantStore((s) => s.waterPlantNow);
  const snoozePlantWatering = usePlantStore((s) => s.snoozePlantWatering);
  const undoWatering = usePlantStore((s) => s.undoWatering);
  const deletePlant = usePlantStore((s) => s.deletePlant);
  const deleteCareEntry = usePlantStore((s) => s.deleteCareEntry);

  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [tabBarWidth, setTabBarWidth] = useState(0);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<NotebookEntry | null>(null);
  const {
    message: feedbackMessage,
    action: feedbackAction,
    showToast,
    dismissToast,
  } = useToast();

  const tabPad = Spacing.xs;
  const activeTabIndex = DETAIL_TABS.findIndex((t) => t.key === activeTab);
  const tabSlotWidth =
    tabBarWidth > 0 ? (tabBarWidth - tabPad * 2) / DETAIL_TABS.length : 0;
  const indicatorX = useSharedValue(0);

  useEffect(() => {
    if (tabSlotWidth <= 0) return;
    const targetX = tabPad + activeTabIndex * tabSlotWidth;
    if (reducedMotion) {
      indicatorX.value = targetX;
    } else {
      indicatorX.value = withSpring(targetX, MOTION_SPRINGS.pill);
    }
  }, [activeTabIndex, tabSlotWidth, tabPad, indicatorX, reducedMotion]);

  const activeTabPillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  const plant = useMemo(
    () => (id ? plants.find((p) => p.id === id) : plants[0]),
    [plants, id]
  );

  const plantEntries = useMemo(
    () =>
      entries
        .filter((e) => e.plantId === plant?.id)
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ),
    [entries, plant]
  );

  const plantAssessments = useMemo(
    () =>
      healthAssessments
        .filter((a) => a.plantId === plant?.id)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
    [healthAssessments, plant]
  );

  if (!plant) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: palette.bgPrimary }]}>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>
            {t('plantDetail.notFoundTitle')}
          </Text>
          <Pressable
            onPress={() => router.replace('/(tabs)')}
            style={[styles.backBtnPill, { backgroundColor: palette.primary }]}>
            <Text style={[styles.backBtnText, { color: palette.textInverse }]}>
              {t('plantDetail.notFoundAction')}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const handleDeleteCurrentPlant = () => {
    confirmAction({
      title: t('plantDetail.deleteTitle'),
      message: t('plantDetail.deleteMessage', {
        name: plant.nickname,
        species: plant.species.commonName,
      }),
      confirmLabel: t('plantDetail.deleteConfirm'),
      destructive: true,
      onConfirm: () => {
        deletePlant(plant.id);
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)');
        }
      },
    });
  };

  const handleDeleteLogEntry = (entry: NotebookEntry) => {
    confirmAction({
      title: t('plantDetail.deleteLogTitle'),
      message: t('plantDetail.deleteLogMessage', { title: entry.title }),
      confirmLabel: t('plantDetail.deleteLogConfirm'),
      destructive: true,
      onConfirm: () => {
        deleteCareEntry(entry.id);
        showToast(t('plantDetail.deleteLogToast', { title: entry.title }));
      },
    });
  };

  const healthStatus = plant.latestHealthAssessment?.healthStatus ?? 'thriving';
  const healthAlertDot =
    healthStatus !== 'thriving'
      ? getHealthBadgeTheme(palette)[healthStatus].dot
      : null;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.bgPrimary }]}
      edges={['bottom']}>
      <BotanicalBackground variant="detail" />

      <FeedbackBanner
        floating
        bottomOffset={Spacing.md}
        message={feedbackMessage}
        action={feedbackAction}
        onDismiss={dismissToast}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <PlantHeroCard
          plant={plant}
          entries={plantEntries}
          onBack={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)');
            }
          }}
          onHealthScan={() =>
            router.push({
              pathname: '/(tabs)/scan',
              params: { mode: 'diagnose', plantId: plant.id },
            })
          }
          onWaterNow={() => {
            const undoSnapshot = waterPlantNow(plant.id);
            showToast(t('plantDetail.wateredToast', { name: plant.nickname }), {
              action: undoSnapshot
                ? {
                    label: t('common.undo'),
                    onPress: () => {
                      undoWatering(undoSnapshot);
                      showToast(
                        t('plantDetail.undoWateredToast', {
                          name: plant.nickname,
                        })
                      );
                    },
                  }
                : undefined,
            });
          }}
          onSnooze={() => {
            const undoSnapshot = snoozePlantWatering(plant.id, 2);
            showToast(
              t('plantDetail.snoozedToast', {
                name: plant.nickname,
                days: 2,
              }),
              {
                action: undoSnapshot
                  ? {
                      label: t('common.undo'),
                      onPress: () => {
                        undoWatering(undoSnapshot);
                        showToast(
                          t('plantDetail.undoSnoozedToast', {
                            name: plant.nickname,
                          })
                        );
                      },
                    }
                  : undefined,
              }
            );
          }}
        />

        <View style={styles.contentWrap}>
          <View style={styles.maxContainer}>
            <View
              accessibilityRole="tablist"
              onLayout={(e) => setTabBarWidth(e.nativeEvent.layout.width)}
              style={[
                styles.segmentedBar,
                {
                  backgroundColor: palette.bgSubtle,
                  borderColor: palette.borderSubtle,
                },
              ]}>
              {tabSlotWidth > 0 && (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.activeSegmentPill,
                    {
                      width: tabSlotWidth,
                      backgroundColor: palette.primary,
                    },
                    activeTabPillStyle,
                  ]}
                />
              )}

              {DETAIL_TABS.map((tab) => {
                const isSelected = activeTab === tab.key;
                const color = isSelected
                  ? palette.textInverse
                  : palette.textSecondary;

                return (
                  <Pressable
                    key={tab.key}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => {
                      if (!isSelected) {
                        triggerLightHaptic();
                        setActiveTab(tab.key);
                      }
                    }}
                    style={({ pressed }) => [
                      styles.segmentBtn,
                      pressed && !isSelected && styles.segmentBtnPressed,
                    ]}>
                    {tab.key === 'overview' ? (
                      <Sprout size={14} color={color} />
                    ) : tab.key === 'journal' ? (
                      <BookOpen size={14} color={color} />
                    ) : (
                      <Stethoscope size={14} color={color} />
                    )}
                    <Text style={[styles.segmentBtnText, { color }]}>
                      {t(tab.labelKey)}
                    </Text>
                    {tab.key === 'health' && healthAlertDot && !isSelected && (
                      <View
                        style={[
                          styles.healthDotIndicator,
                          { backgroundColor: healthAlertDot },
                        ]}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>

            {activeTab === 'overview' && (
              <AnimatedEntrance key="tab-overview" style={styles.tabPanel}>
                <PlantOverviewSpecs plant={plant} />

                <VisualProgressGallery
                  entries={plantEntries}
                  assessments={plantAssessments}
                  plantPhotoUri={plant.photoUri}
                  acquiredAt={plant.acquiredAt}
                />

                <GrowthTrendChart
                  entries={plantEntries}
                  plantType={plant.species.plantType}
                />

                <View
                  style={[
                    styles.bottomActionsRow,
                    { borderTopColor: palette.borderSubtle },
                  ]}>
                  <Pressable
                    onPress={() => setIsEditModalOpen(true)}
                    style={({ pressed }) => [
                      styles.bottomActionBtn,
                      {
                        backgroundColor: palette.bgSurface,
                        borderColor: palette.borderSubtle,
                      },
                      pressed && { opacity: 0.8 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${plant.nickname}`}>
                    <Pencil size={15} color={palette.primary} />
                    <Text
                      style={[
                        styles.bottomActionText,
                        { color: palette.primary },
                      ]}>
                      {t('plantDetail.editDetails')}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleDeleteCurrentPlant}
                    style={({ pressed }) => [
                      styles.bottomActionBtn,
                      {
                        backgroundColor: palette.criticalBg,
                        borderColor: palette.criticalBorder,
                      },
                      pressed && { opacity: 0.8 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${plant.nickname}`}>
                    <Trash2 size={15} color={palette.criticalText} />
                    <Text
                      style={[
                        styles.bottomActionText,
                        { color: palette.criticalText },
                      ]}>
                      {t('plantDetail.deletePlant')}
                    </Text>
                  </Pressable>
                </View>
              </AnimatedEntrance>
            )}

            {activeTab === 'journal' && (
              <AnimatedEntrance key="tab-journal" style={styles.tabPanel}>
                <CareLogSection
                  plant={plant}
                  plantEntries={plantEntries}
                  onShowToast={showToast}
                  onEditEntry={setEditingEntry}
                  onDeleteEntry={handleDeleteLogEntry}
                />
              </AnimatedEntrance>
            )}

            {activeTab === 'health' && (
              <AnimatedEntrance key="tab-health" style={styles.tabPanel}>
                <PlantHealthAssessmentCard
                  plant={plant}
                  plantEntries={plantEntries}
                  plantAssessments={plantAssessments}
                  onShowToast={showToast}
                />
                <PlantAdaptiveCareCard plant={plant} onShowToast={showToast} />
              </AnimatedEntrance>
            )}
          </View>
        </View>
      </ScrollView>

      <EditPlantModal
        plant={plant}
        visible={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSaved={(updatedName) =>
          showToast(
            `${t('plantDetail.updatedPlantToast', { name: updatedName })} 🌿`
          )
        }
        onRequestDelete={handleDeleteCurrentPlant}
      />

      <EditLogModal
        entry={editingEntry}
        visible={Boolean(editingEntry)}
        onClose={() => setEditingEntry(null)}
        onSaved={(updatedTitle) =>
          showToast(
            `${t('plantDetail.updatedLogToast', { title: updatedTitle })} 🌿`
          )
        }
        onRequestDelete={handleDeleteLogEntry}
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
    paddingBottom: Spacing.xxl * 1.5,
  },
  contentWrap: {
    width: '100%',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    alignItems: 'center',
  },
  maxContainer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.lg,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  emptyTitle: {
    ...Typography.sectionTitle,
  },
  backBtnPill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: Radius.full,
  },
  backBtnText: {
    fontWeight: '700',
  },
  segmentedBar: {
    position: 'relative',
    flexDirection: 'row',
    padding: Spacing.xs,
    borderRadius: Radius.pill,
    borderWidth: BorderWidth.hairline,
  },
  activeSegmentPill: {
    position: 'absolute',
    left: 0,
    top: Spacing.xs,
    bottom: Spacing.xs,
    borderRadius: Radius.pill - 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: Radius.pill - 4,
  },
  segmentBtnPressed: {
    opacity: 0.72,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  healthDotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tabPanel: {
    gap: Spacing.lg,
  },
  bottomActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: BorderWidth.hairline,
  },
  bottomActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: BorderWidth.hairline,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
  },
  bottomActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
