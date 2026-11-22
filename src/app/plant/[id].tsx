import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Pencil, Stethoscope, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EditLogModal } from '@/components/modals/edit-log-modal';
import { EditPlantModal } from '@/components/modals/edit-plant-modal';
import { CareLogSection } from '@/components/plant-detail/care-log-section';
import { GrowthTrendChart } from '@/components/plant-detail/growth-trend-chart';
import { PlantAdaptiveCareCard } from '@/components/plant-detail/plant-adaptive-care-card';
import { PlantHealthAssessmentCard } from '@/components/plant-detail/plant-health-assessment-card';
import { PlantHeroCard } from '@/components/plant-detail/plant-hero-card';
import { VisualProgressGallery } from '@/components/plant-detail/visual-progress-gallery';
import { AnimatedEntrance } from '@/components/ui/animated-wrappers';
import { BotanicalBackground } from '@/components/ui/botanical-background';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import {
  BorderWidth,
  CardShadow,
  MaxContentWidth,
  Radius,
  Spacing,
  Typography,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { useToast } from '@/hooks/use-toast';
import { confirmAction } from '@/services/dialogs';
import { usePlantStore } from '@/store/usePlantStore';
import type { NotebookEntry } from '@/types/plant';

export default function PlantDetailNotebookScreen() {
  const palette = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();

  const plants = usePlantStore((s) => s.plants);
  const entries = usePlantStore((s) => s.entries);
  const healthAssessments = usePlantStore((s) => s.healthAssessments);
  const waterPlantNow = usePlantStore((s) => s.waterPlantNow);
  const undoWatering = usePlantStore((s) => s.undoWatering);
  const deletePlant = usePlantStore((s) => s.deletePlant);
  const deleteCareEntry = usePlantStore((s) => s.deleteCareEntry);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<NotebookEntry | null>(null);
  const {
    message: feedbackMessage,
    action: feedbackAction,
    showToast,
    dismissToast,
  } = useToast();

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
            Plant not found
          </Text>
          <Pressable
            onPress={() => router.replace('/(tabs)')}
            style={[styles.backBtnPill, { backgroundColor: palette.primary }]}>
            <Text style={[styles.backBtnText, { color: palette.textInverse }]}>
              Return to My Garden
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const handleDeleteCurrentPlant = () => {
    confirmAction({
      title: 'Delete Plant',
      message: `Are you sure you want to delete "${plant.nickname}" (${plant.species.commonName}) and its care history?`,
      confirmLabel: 'Delete',
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
      title: 'Delete Care Log',
      message: `Are you sure you want to delete the log "${entry.title}"?`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => {
        deleteCareEntry(entry.id);
        showToast(`Removed log "${entry.title}".`);
      },
    });
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.bgPrimary }]}
      edges={['top', 'bottom']}>
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
        <View style={styles.maxContainer}>
          <View style={styles.topNavRow}>
            <Pressable
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(tabs)');
                }
              }}
              style={({ pressed }) => [
                styles.navBackBtn,
                pressed && { opacity: 0.75 },
              ]}>
              <ArrowLeft size={18} color={palette.textPrimary} />
              <Text
                style={[styles.navBackText, { color: palette.textPrimary }]}>
                My Garden
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/scan',
                  params: { mode: 'diagnose', plantId: plant.id },
                })
              }
              style={({ pressed }) => [
                styles.scanShortcutBtn,
                { backgroundColor: palette.primary },
                pressed && { opacity: 0.85 },
              ]}>
              <Stethoscope size={15} color={palette.textInverse} />
              <Text
                style={[
                  styles.scanShortcutText,
                  { color: palette.textInverse },
                ]}>
                Photo Health Scan
              </Text>
            </Pressable>
          </View>

          <AnimatedEntrance index={0}>
            <PlantHeroCard
              plant={plant}
              onWaterNow={() => {
                const undoSnapshot = waterPlantNow(plant.id);
                showToast(`Watered "${plant.nickname}"!`, {
                  action: undoSnapshot
                    ? {
                        label: 'Undo',
                        onPress: () => {
                          undoWatering(undoSnapshot);
                          showToast(`Undid watering for "${plant.nickname}".`);
                        },
                      }
                    : undefined,
                });
              }}
            />
          </AnimatedEntrance>

          <AnimatedEntrance index={1}>
            <GrowthTrendChart
              entries={plantEntries}
              plantType={plant.species.plantType}
            />
          </AnimatedEntrance>

          <AnimatedEntrance index={2}>
            <VisualProgressGallery
              entries={plantEntries}
              assessments={plantAssessments}
              plantPhotoUri={plant.photoUri}
              acquiredAt={plant.acquiredAt}
            />
          </AnimatedEntrance>

          <AnimatedEntrance index={3}>
            <PlantAdaptiveCareCard plant={plant} onShowToast={showToast} />
          </AnimatedEntrance>

          <AnimatedEntrance index={4}>
            <PlantHealthAssessmentCard
              plant={plant}
              plantEntries={plantEntries}
              plantAssessments={plantAssessments}
              onShowToast={showToast}
            />
          </AnimatedEntrance>

          <AnimatedEntrance index={5}>
            <CareLogSection
              plant={plant}
              plantEntries={plantEntries}
              onShowToast={showToast}
              onEditEntry={setEditingEntry}
              onDeleteEntry={handleDeleteLogEntry}
            />
          </AnimatedEntrance>

          <View style={styles.bottomActionsRow}>
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
              <Pencil size={16} color={palette.primary} />
              <Text
                style={[styles.bottomActionText, { color: palette.primary }]}>
                Edit Plant Details
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
              <Trash2 size={16} color={palette.criticalText} />
              <Text
                style={[
                  styles.bottomActionText,
                  { color: palette.criticalText },
                ]}>
                Delete Plant
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <EditPlantModal
        plant={plant}
        visible={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSaved={(updatedName) =>
          showToast(`Updated "${updatedName}" details! 🌿`)
        }
        onRequestDelete={handleDeleteCurrentPlant}
      />

      <EditLogModal
        entry={editingEntry}
        visible={Boolean(editingEntry)}
        onClose={() => setEditingEntry(null)}
        onSaved={(updatedTitle) =>
          showToast(`Updated log "${updatedTitle}"! 🌿`)
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl * 1.5,
    alignItems: 'center',
  },
  maxContainer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.md,
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
  topNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  navBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingRight: 10,
  },
  navBackText: {
    fontSize: 15,
    fontWeight: '700',
  },
  scanShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  scanShortcutText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  bottomActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  bottomActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: BorderWidth.hairline,
    paddingVertical: 13,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    ...CardShadow,
  },
  bottomActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
