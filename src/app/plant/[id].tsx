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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  CardShadow,
  getHealthBadgeTheme,
  MaxContentWidth,
  Radius,
  Spacing,
  type ThemePalette,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import {
  getDaysUntilNextWater,
  usePlantStore,
} from '@/store/usePlantStore';
import type { NotebookEntry } from '@/types/plant';

export default function PlantDetailNotebookScreen() {
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const healthBadgeTheme = useMemo(() => getHealthBadgeTheme(palette), [palette]);
  const { id } = useLocalSearchParams<{ id: string }>();

  const plants = usePlantStore((s) => s.plants);
  const entries = usePlantStore((s) => s.entries);
  const healthAssessments = usePlantStore((s) => s.healthAssessments);
  const deletePlant = usePlantStore((s) => s.deletePlant);
  const deleteCareEntry = usePlantStore((s) => s.deleteCareEntry);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<NotebookEntry | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setFeedbackMessage(message);
    toastTimerRef.current = setTimeout(() => {
      setFeedbackMessage(null);
      toastTimerRef.current = null;
    }, 3500);
  }, []);

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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Plant not found</Text>
          <Pressable
            onPress={() => router.replace('/(tabs)')}
            style={styles.backBtnPill}>
            <Text style={styles.backBtnText}>Return to My Garden</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const daysUntilWater = getDaysUntilNextWater(plant);
  const needsWater = daysUntilWater <= 0;
  const healthStatus = plant.latestHealthAssessment?.healthStatus ?? 'thriving';
  const healthTheme = healthBadgeTheme[healthStatus];

  const handleDeleteCurrentPlant = () => {
    const performDelete = () => {
      deletePlant(plant.id);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
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

  const handleDeleteLogEntry = (entry: NotebookEntry) => {
    const performDelete = () => {
      deleteCareEntry(entry.id);
      showToast(`Removed log "${entry.title}".`);
    };

    const confirmText = `Are you sure you want to delete the log "${entry.title}"?`;

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(confirmText)) {
        performDelete();
      }
    } else {
      Alert.alert('Delete Care Log', confirmText, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: performDelete },
      ]);
    }
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
              <Text style={styles.navBackText}>My Garden</Text>
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
                pressed && { opacity: 0.85 },
              ]}>
              <Stethoscope size={15} color={palette.textInverse} />
              <Text style={styles.scanShortcutText}>Photo Health Scan</Text>
            </Pressable>
          </View>

          {/* User Feedback Toast */}
          <FeedbackBanner message={feedbackMessage} />

          {/* 1. SPECIMEN HEADER CARD */}
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <Image
                source={{ uri: plant.photoUri }}
                style={styles.heroPhoto}
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

                  <View style={styles.familyChip}>
                    <Text style={styles.familyChipText}>
                      {plant.species.family}
                    </Text>
                  </View>
                </View>

                <Text style={styles.heroNickname}>{plant.nickname}</Text>
                <Text style={styles.heroSpecies}>
                  {plant.species.commonName} •{' '}
                  <Text style={styles.italicScientific}>
                    {plant.species.scientificName}
                  </Text>
                </Text>

                <View style={styles.locationRow}>
                  <MapPin size={13} color={palette.textSecondary} />
                  <Text style={styles.locationLabel}>
                    {plant.location} • {plant.isIndoor ? 'Indoor' : 'Outdoor'}
                  </Text>
                </View>

                <View style={styles.locationRow}>
                  <Calendar size={12} color={palette.textMuted} />
                  <Text style={styles.acquiredLabel}>
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
                  !plant.hasDrainageHole &&
                    plant.species.plantType === 'succulent' &&
                    styles.specBadgeWarning,
                ]}>
                <Text style={styles.specBadgeLabel}>CONTAINER & DRAINAGE</Text>
                <Text style={styles.specBadgeValue}>
                  {plant.potMaterial.replace('_', ' ')} •{' '}
                  {plant.hasDrainageHole ? 'Drainage Hole ✓' : 'No Drainage Hole'}
                </Text>
              </View>

              <View style={styles.specBadge}>
                <Text style={styles.specBadgeLabel}>CURRENT EXPOSURE</Text>
                <Text style={styles.specBadgeValue}>
                  {plant.lightExposure.replace('_', ' ')} •{' '}
                  {plant.isIndoor ? 'Indoor' : 'Outdoor'}
                </Text>
              </View>

              <View
                style={[
                  styles.specBadge,
                  needsWater && styles.specBadgeWaterDue,
                ]}>
                <Text style={styles.specBadgeLabel}>NEXT WATER COUNTDOWN</Text>
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
                      needsWater && { color: palette.waterAlertText },
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
              <View style={styles.baselineStrip}>
                <Sun size={14} color={palette.primary} />
                <Text style={styles.baselineStripText}>
                  <Text style={{ fontWeight: '700' }}>Ideal Light: </Text>
                  {plant.species.baselineCare.idealLight}
                </Text>
              </View>
              <View style={styles.baselineStrip}>
                <Layers size={14} color={palette.primary} />
                <Text style={styles.baselineStripText}>
                  <Text style={{ fontWeight: '700' }}>Recommended Soil: </Text>
                  {plant.species.baselineCare.soilRecommendation}
                </Text>
              </View>
            </View>

            {plant.species.petSafety ? (
              <View style={{ marginTop: Spacing.sm }}>
                <PetSafetyBadge
                  petSafety={plant.species.petSafety}
                  showDetails
                />
              </View>
            ) : null}
          </View>

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

          {/* ADAPTIVE CARE INTELLIGENCE (Season, Pot Material & Outdoor Weather) */}
          <PlantAdaptiveCareCard plant={plant} onShowToast={showToast} />

          {/* 2. LATEST AI HEALTH ASSESSMENT CARD (with Interactive Checkable Next Steps) */}
          <PlantHealthAssessmentCard
            plant={plant}
            plantEntries={plantEntries}
            plantAssessments={plantAssessments}
            onShowToast={showToast}
          />

          {/* 3. QUICK-ACTION CARE EVENT LOGGER + CHRONOLOGICAL NOTEBOOK TIMELINE */}
          <CareLogSection
            plant={plant}
            plantEntries={plantEntries}
            onShowToast={showToast}
            onEditEntry={(target) => setEditingEntry(target)}
            onDeleteEntry={handleDeleteLogEntry}
          />

          {/* 4. BOTTOM SPECIMEN MANAGEMENT ACTIONS (Edit & Delete Plant) */}
          <View style={styles.bottomActionsRow}>
            <Pressable
              onPress={() => setIsEditModalOpen(true)}
              style={({ pressed }) => [
                styles.bottomEditBtn,
                pressed && { opacity: 0.8 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${plant.nickname}`}>
              <Pencil size={16} color={palette.primary} />
              <Text style={styles.bottomEditBtnText}>Edit Plant Details</Text>
            </Pressable>

            <Pressable
              onPress={handleDeleteCurrentPlant}
              style={({ pressed }) => [
                styles.bottomDeleteBtn,
                pressed && { opacity: 0.8 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${plant.nickname}`}>
              <Trash2 size={16} color={palette.criticalText} />
              <Text style={styles.bottomDeleteBtnText}>Delete Plant</Text>
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

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: palette.bgPrimary,
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
      gap: 12,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: palette.textPrimary,
    },
    backBtnPill: {
      backgroundColor: palette.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: Radius.full,
    },
    backBtnText: {
      color: palette.textInverse,
      fontWeight: '700',
    },
    topNavRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
      paddingVertical: 4,
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
      color: palette.textPrimary,
    },
    scanShortcutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: palette.primary,
      paddingHorizontal: 13,
      paddingVertical: 8,
      borderRadius: Radius.full,
    },
    scanShortcutText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.textInverse,
    },
    heroCard: {
      backgroundColor: palette.bgSurface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: palette.borderSubtle,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.sm,
      gap: Spacing.md,
      ...CardShadow,
    },
    heroTopRow: {
      flexDirection: 'row',
      gap: Spacing.md,
    },
    heroPhoto: {
      width: 92,
      height: 92,
      borderRadius: Radius.md,
      backgroundColor: palette.bgSubtle,
    },
    heroTitleCol: {
      flex: 1,
      gap: 4,
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
    },
    familyChip: {
      backgroundColor: palette.bgSubtle,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: Radius.sm,
    },
    familyChipText: {
      fontSize: 11,
      fontWeight: '700',
      color: palette.primary,
    },
    heroNickname: {
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '700',
      color: palette.textPrimary,
    },
    heroSpecies: {
      fontSize: 13,
      color: palette.textSecondary,
      fontWeight: '500',
    },
    italicScientific: {
      fontStyle: 'italic',
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    locationLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: palette.textSecondary,
    },
    acquiredLabel: {
      fontSize: 11,
      fontWeight: '500',
      color: palette.textMuted,
    },
    specsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    specBadge: {
      flex: 1,
      minWidth: 150,
      backgroundColor: palette.bgPrimary,
      borderWidth: 1,
      borderColor: palette.borderSubtle,
      borderRadius: Radius.md,
      padding: 10,
      gap: 3,
    },
    specBadgeWarning: {
      backgroundColor: palette.attentionBg,
      borderColor: palette.attentionBorder,
    },
    specBadgeWaterDue: {
      backgroundColor: palette.waterAlertBg,
      borderColor: palette.waterAlertBorder,
    },
    specBadgeLabel: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.5,
      color: palette.textMuted,
    },
    specBadgeValue: {
      fontSize: 13,
      fontWeight: '700',
      color: palette.textPrimary,
      textTransform: 'capitalize',
    },
    waterCountdownRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    baselineStack: {
      gap: Spacing.xs + 2,
    },
    baselineStrip: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      backgroundColor: palette.primarySoft,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: Radius.md,
    },
    baselineStripText: {
      flex: 1,
      fontSize: 12,
      color: palette.primary,
    },
    bottomActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginTop: 4,
    },
    bottomEditBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: palette.bgSurface,
      borderWidth: 1,
      borderColor: palette.borderSubtle,
      paddingVertical: 13,
      paddingHorizontal: 16,
      borderRadius: Radius.lg,
      ...CardShadow,
    },
    bottomEditBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: palette.primary,
    },
    bottomDeleteBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: palette.criticalBg,
      borderWidth: 1,
      borderColor: palette.criticalBorder,
      paddingVertical: 13,
      paddingHorizontal: 16,
      borderRadius: Radius.lg,
      ...CardShadow,
    },
    bottomDeleteBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: palette.criticalText,
    },
  });
