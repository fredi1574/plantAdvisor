import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  Droplets,
  Layers,
  MapPin,
  Pencil,
  Stethoscope,
  Sun,
  Trash2,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PetSafetyBadge } from '@/components/garden/pet-safety-badge';
import { EditLogModal } from '@/components/modals/edit-log-modal';
import { EditPlantModal } from '@/components/modals/edit-plant-modal';
import { CareLogSection } from '@/components/plant-detail/care-log-section';
import { GrowthTrendChart } from '@/components/plant-detail/growth-trend-chart';
import { PlantAdaptiveCareCard } from '@/components/plant-detail/plant-adaptive-care-card';
import { PlantHealthAssessmentCard } from '@/components/plant-detail/plant-health-assessment-card';
import { VisualProgressGallery } from '@/components/plant-detail/visual-progress-gallery';
import { BotanicalBackground } from '@/components/ui/botanical-background';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { SurfaceCard } from '@/components/ui/surface-card';
import {
  BorderWidth,
  CardShadow,
  getHealthBadgeTheme,
  MaxContentWidth,
  Radius,
  Spacing,
  Typography,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { useToast } from '@/hooks/use-toast';
import { confirmAction } from '@/services/dialogs';
import {
  getDaysUntilNextWater,
  usePlantStore,
} from '@/store/usePlantStore';
import type { NotebookEntry } from '@/types/plant';

export default function PlantDetailNotebookScreen() {
  const palette = usePalette();
  const healthBadgeTheme = useMemo(
    () => getHealthBadgeTheme(palette),
    [palette]
  );
  const { id } = useLocalSearchParams<{ id: string }>();

  const plants = usePlantStore((s) => s.plants);
  const entries = usePlantStore((s) => s.entries);
  const healthAssessments = usePlantStore((s) => s.healthAssessments);
  const deletePlant = usePlantStore((s) => s.deletePlant);
  const deleteCareEntry = usePlantStore((s) => s.deleteCareEntry);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<NotebookEntry | null>(null);
  const { message: feedbackMessage, showToast } = useToast();

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

  const daysUntilWater = getDaysUntilNextWater(plant);
  const needsWater = daysUntilWater <= 0;
  const healthStatus = plant.latestHealthAssessment?.healthStatus ?? 'thriving';
  const healthTheme = healthBadgeTheme[healthStatus];
  const showDrainageWarning =
    !plant.hasDrainageHole && plant.species.plantType === 'succulent';

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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.maxContainer}>
          {/* Top Navigation Bar */}
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
              <Text style={[styles.navBackText, { color: palette.textPrimary }]}>
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
                style={[styles.scanShortcutText, { color: palette.textInverse }]}>
                Photo Health Scan
              </Text>
            </Pressable>
          </View>

          <FeedbackBanner message={feedbackMessage} />

          {/* 1. SPECIMEN HEADER CARD */}
          <SurfaceCard>
            <View style={styles.heroTopRow}>
              <Image
                source={{ uri: plant.photoUri }}
                style={[styles.heroPhoto, { backgroundColor: palette.bgSubtle }]}
                contentFit="cover"
              />

              <View style={styles.heroTitleCol}>
                <View style={styles.badgeLine}>
                  <View
                    style={[
                      styles.healthBadge,
                      {
                        backgroundColor: healthTheme.bg,
                        borderColor: healthTheme.border,
                      },
                    ]}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: healthTheme.dot },
                      ]}
                    />
                    <Text
                      style={[
                        styles.healthBadgeText,
                        { color: healthTheme.text },
                      ]}>
                      {healthTheme.label}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.familyChip,
                      { backgroundColor: palette.bgSubtle },
                    ]}>
                    <Text
                      style={[styles.familyChipText, { color: palette.primary }]}>
                      {plant.species.family}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[styles.heroNickname, { color: palette.textPrimary }]}>
                  {plant.nickname}
                </Text>
                <Text
                  style={[styles.heroSpecies, { color: palette.textSecondary }]}>
                  {plant.species.commonName} •{' '}
                  <Text style={styles.italicScientific}>
                    {plant.species.scientificName}
                  </Text>
                </Text>

                <View style={styles.locationRow}>
                  <MapPin size={13} color={palette.textSecondary} />
                  <Text
                    style={[
                      styles.locationLabel,
                      { color: palette.textSecondary },
                    ]}>
                    {plant.location} • {plant.isIndoor ? 'Indoor' : 'Outdoor'}
                  </Text>
                </View>

                <View style={styles.locationRow}>
                  <Calendar size={12} color={palette.textMuted} />
                  <Text
                    style={[styles.acquiredLabel, { color: palette.textMuted }]}>
                    Acquired{' '}
                    {new Date(plant.acquiredAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              </View>
            </View>

            {/* Environment, Pot Drainage Badge & Next Water Countdown Strip */}
            <View style={styles.specsGrid}>
              <View
                style={[
                  styles.specBadge,
                  {
                    backgroundColor: showDrainageWarning
                      ? palette.attentionBg
                      : palette.bgPrimary,
                    borderColor: showDrainageWarning
                      ? palette.attentionBorder
                      : palette.borderSubtle,
                  },
                ]}>
                <Text style={[styles.specBadgeLabel, { color: palette.textMuted }]}>
                  CONTAINER & DRAINAGE
                </Text>
                <Text
                  style={[styles.specBadgeValue, { color: palette.textPrimary }]}>
                  {plant.potMaterial.replace('_', ' ')} •{' '}
                  {plant.hasDrainageHole ? 'Drainage Hole ✓' : 'No Drainage Hole'}
                </Text>
              </View>

              <View
                style={[
                  styles.specBadge,
                  {
                    backgroundColor: palette.bgPrimary,
                    borderColor: palette.borderSubtle,
                  },
                ]}>
                <Text style={[styles.specBadgeLabel, { color: palette.textMuted }]}>
                  CURRENT EXPOSURE
                </Text>
                <Text
                  style={[styles.specBadgeValue, { color: palette.textPrimary }]}>
                  {plant.lightExposure.replace('_', ' ')} •{' '}
                  {plant.isIndoor ? 'Indoor' : 'Outdoor'}
                </Text>
              </View>

              <View
                style={[
                  styles.specBadge,
                  {
                    backgroundColor: needsWater
                      ? palette.waterAlertBg
                      : palette.bgPrimary,
                    borderColor: needsWater
                      ? palette.waterAlertBorder
                      : palette.borderSubtle,
                  },
                ]}>
                <Text style={[styles.specBadgeLabel, { color: palette.textMuted }]}>
                  NEXT WATER COUNTDOWN
                </Text>
                <View style={styles.waterCountdownRow}>
                  <Droplets
                    size={15}
                    color={
                      needsWater ? palette.waterAlertText : palette.waterBlue
                    }
                  />
                  <Text
                    style={[
                      styles.specBadgeValue,
                      {
                        color: needsWater
                          ? palette.waterAlertText
                          : palette.textPrimary,
                      },
                    ]}>
                    {daysUntilWater === 0
                      ? 'Due Today'
                      : daysUntilWater < 0
                        ? `Overdue by ${Math.abs(daysUntilWater)}d`
                        : `In ${daysUntilWater} days (every ${plant.customWateringIntervalDays}d)`}
                  </Text>
                </View>
              </View>
            </View>

            {/* Baseline Species Light & Soil bars */}
            <View style={styles.baselineStack}>
              <View
                style={[
                  styles.baselineStrip,
                  { backgroundColor: palette.primarySoft },
                ]}>
                <Sun size={14} color={palette.primary} />
                <Text
                  style={[styles.baselineStripText, { color: palette.primary }]}>
                  <Text style={styles.boldText}>Ideal Light: </Text>
                  {plant.species.baselineCare.idealLight}
                </Text>
              </View>
              <View
                style={[
                  styles.baselineStrip,
                  { backgroundColor: palette.primarySoft },
                ]}>
                <Layers size={14} color={palette.primary} />
                <Text
                  style={[styles.baselineStripText, { color: palette.primary }]}>
                  <Text style={styles.boldText}>Recommended Soil: </Text>
                  {plant.species.baselineCare.soilRecommendation}
                </Text>
              </View>
            </View>

            {plant.species.petSafety ? (
              <View style={styles.petSafetyWrap}>
                <PetSafetyBadge
                  petSafety={plant.species.petSafety}
                  showDetails
                />
              </View>
            ) : null}
          </SurfaceCard>

          <GrowthTrendChart
            entries={plantEntries}
            plantType={plant.species.plantType}
          />

          <VisualProgressGallery
            entries={plantEntries}
            assessments={plantAssessments}
            plantPhotoUri={plant.photoUri}
            acquiredAt={plant.acquiredAt}
          />

          <PlantAdaptiveCareCard plant={plant} onShowToast={showToast} />

          <PlantHealthAssessmentCard
            plant={plant}
            plantEntries={plantEntries}
            plantAssessments={plantAssessments}
            onShowToast={showToast}
          />

          <CareLogSection
            plant={plant}
            plantEntries={plantEntries}
            onShowToast={showToast}
            onEditEntry={(target) => setEditingEntry(target)}
            onDeleteEntry={handleDeleteLogEntry}
          />

          {/* Bottom Specimen Management Actions */}
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
  heroTopRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  heroPhoto: {
    width: 92,
    height: 92,
    borderRadius: Radius.md,
  },
  heroTitleCol: {
    flex: 1,
    gap: Spacing.xs,
    justifyContent: 'center',
  },
  badgeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  healthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: BorderWidth.hairline,
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
  },
  familyChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  familyChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  heroNickname: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  heroSpecies: {
    fontSize: 13,
    fontWeight: '500',
  },
  italicScientific: {
    fontStyle: 'italic',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.half,
  },
  locationLabel: {
    ...Typography.caption,
    fontWeight: '600',
  },
  acquiredLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  specBadge: {
    flex: 1,
    minWidth: 150,
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.md,
    padding: 10,
    gap: 3,
  },
  specBadgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  specBadgeValue: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  waterCountdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  baselineStack: {
    gap: 6,
  },
  baselineStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  baselineStripText: {
    flex: 1,
    ...Typography.caption,
  },
  boldText: {
    fontWeight: '700',
  },
  petSafetyWrap: {
    marginTop: Spacing.sm,
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
