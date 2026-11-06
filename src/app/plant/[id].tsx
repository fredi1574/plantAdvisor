import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  CheckCircle2,
  CheckSquare,
  Droplets,
  FileText,
  FlaskConical,
  HelpCircle,
  MapPin,
  Pencil,
  Scissors,
  ShieldAlert,
  Sparkles,
  Sprout,
  Square,
  Stethoscope,
  Sun,
  Trash2
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EditLogModal } from '@/components/edit-log-modal';
import { EditPlantModal } from '@/components/edit-plant-modal';
import { SwipeableLogItem } from '@/components/swipeable-log-item';
import {
  CardShadow,
  HealthBadgeTheme,
  MaxContentWidth,
  Palette,
  Radius,
  Spacing,
  UrgencyBadgeTheme,
} from '@/constants/theme';
import { diagnosePlantHealth } from '@/services/aiPlantService';
import {
  getDaysUntilNextWater,
  usePlantStore,
} from '@/store/usePlantStore';
import type { CareEventType, NotebookEntry } from '@/types/plant';

const QUICK_ACTIONS: {
  type: CareEventType;
  label: string;
  defaultTitle: string;
  defaultNotes: string;
  color: string;
}[] = [
    {
      type: 'water',
      label: 'Log Water',
      defaultTitle: 'Thorough Watering',
      defaultNotes: 'Watered after checking substrate dryness.',
      color: Palette.waterBlue,
    },
    {
      type: 'propagation',
      label: 'Prop Milestone',
      defaultTitle: 'Propagation Growth Check',
      defaultNotes: 'Logged new root/shoot elongation milestone.',
      color: Palette.accentTerracotta,
    },
    {
      type: 'fertilize',
      label: 'Fertilize',
      defaultTitle: 'Diluted Nutrient Feed',
      defaultNotes: 'Applied balanced liquid fertilizer at 1/2 strength.',
      color: Palette.primary,
    },
    {
      type: 'prune',
      label: 'Prune',
      defaultTitle: 'Canopy & Leaf Pruning',
      defaultNotes: 'Removed spent lower foliage and pinched apical tip.',
      color: Palette.primaryMuted,
    },
    {
      type: 'repot',
      label: 'Repot',
      defaultTitle: 'Substrate & Pot Refresh',
      defaultNotes: 'Checked root health and refreshed gritty aerated substrate.',
      color: Palette.accentTerracotta,
    },
    {
      type: 'note',
      label: 'Add Note',
      defaultTitle: 'Botanical Observation Note',
      defaultNotes: 'Leaves looking turgid and well-oriented toward window light.',
      color: Palette.textSecondary,
    },
  ];

export default function PlantDetailNotebookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const plants = usePlantStore((s) => s.plants);
  const entries = usePlantStore((s) => s.entries);
  const logCareEvent = usePlantStore((s) => s.logCareEvent);
  const waterPlantNow = usePlantStore((s) => s.waterPlantNow);
  const toggleRecommendedAction = usePlantStore((s) => s.toggleRecommendedAction);
  const saveHealthAssessment = usePlantStore((s) => s.saveHealthAssessment);
  const deletePlant = usePlantStore((s) => s.deletePlant);
  const deleteCareEntry = usePlantStore((s) => s.deleteCareEntry);

  const [customNote, setCustomNote] = useState<string>('');
  const [selectedQuickType, setSelectedQuickType] =
    useState<CareEventType>('water');
  const [isRescanning, setIsRescanning] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingEntry, setEditingEntry] = useState<NotebookEntry | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setFeedbackMessage(message);
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 3500);
  };

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
  const assessment = plant.latestHealthAssessment;
  const healthStatus = assessment?.healthStatus ?? 'thriving';
  const healthTheme = HealthBadgeTheme[healthStatus];

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

  const handleQuickLog = (actionType: CareEventType) => {
    setSelectedQuickType(actionType);
    if (actionType === 'water' && !customNote.trim()) {
      waterPlantNow(plant.id);
      return;
    }

    const template =
      QUICK_ACTIONS.find((a) => a.type === actionType) ?? QUICK_ACTIONS[0];

    logCareEvent({
      plantId: plant.id,
      eventType: actionType,
      title: template.defaultTitle,
      notes: customNote.trim() || template.defaultNotes,
    });
    setCustomNote('');
  };

  const handleInstantAiRescan = async () => {
    setIsRescanning(true);
    try {
      const diagnosis = await diagnosePlantHealth(
        plant.photoUri,
        plant,
        plantEntries,
        customNote.trim() || undefined
      );
      saveHealthAssessment(plant.id, diagnosis, plant.photoUri);
    } finally {
      setIsRescanning(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
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
              <ArrowLeft size={18} color={Palette.textPrimary} />
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
              <Stethoscope size={15} color={Palette.textInverse} />
              <Text style={styles.scanShortcutText}>Photo Health Scan</Text>
            </Pressable>
          </View>

          {/* User Feedback Toast */}
          {feedbackMessage && (
            <View style={styles.feedbackBanner}>
              <CheckCircle2 size={16} color="#15803D" />
              <Text style={styles.feedbackBannerText}>{feedbackMessage}</Text>
            </View>
          )}

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
                  <MapPin size={13} color={Palette.textSecondary} />
                  <Text style={styles.locationLabel}>{plant.location}</Text>
                </View>
              </View>
            </View>

            {/* Environment, Pot Drainage Badge & Next Water Countdown Strip */}
            <View style={styles.specsGrid}>
              {/* Drainage Badge */}
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

              {/* Next Water Countdown */}
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
                      needsWater ? Palette.waterAlertText : Palette.waterBlue
                    }
                  />
                  <Text
                    style={[
                      styles.specBadgeValue,
                      needsWater && { color: Palette.waterAlertText },
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

            {/* Baseline Species Light & Soil bar */}
            <View style={styles.baselineStrip}>
              <Sun size={14} color={Palette.primary} />
              <Text style={styles.baselineStripText}>
                <Text style={{ fontWeight: '700' }}>Ideal Light: </Text>
                {plant.species.baselineCare.idealLight}
              </Text>
            </View>
          </View>

          {/* 2. LATEST AI HEALTH ASSESSMENT CARD (with Interactive Checkable Next Steps) */}
          {assessment && (
            <View style={styles.assessmentCard}>
              <View style={styles.assessmentHeaderRow}>
                <View style={styles.assessmentTitleGroup}>
                  <Sparkles size={18} color={Palette.primary} />
                  <View>
                    <Text style={styles.assessmentTitle}>
                      AI Health & Condition Assessment
                    </Text>
                    <Text style={styles.assessmentMeta}>
                      Analyzed photo + {plantEntries.length} care logs • Adjusted water cycle:{' '}
                      {assessment.adjustedWateringIntervalDays}d
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={handleInstantAiRescan}
                  disabled={isRescanning}
                  style={({ pressed }) => [
                    styles.rescanPillBtn,
                    pressed && { opacity: 0.75 },
                  ]}>
                  {isRescanning ? (
                    <ActivityIndicator size="small" color={Palette.primary} />
                  ) : (
                    <Text style={styles.rescanPillText}>Re-Analyze</Text>
                  )}
                </Pressable>
              </View>

              {/* Succulent Guardrail Banner */}
              {(assessment.succulentGuardrailApplied ||
                plant.species.baselineCare.succulentGuardrails
                  .isSucculentOrCactus) && (
                  <View style={styles.guardrailCallout}>
                    <ShieldAlert size={16} color={Palette.attentionText} />
                    <Text style={styles.guardrailCalloutText}>
                      {assessment.succulentGuardrailApplied ??
                        plant.species.baselineCare.succulentGuardrails.rotWarningNote}
                    </Text>
                  </View>
                )}

              {/* Diagnosis Summary */}
              <Text style={styles.diagnosisBody}>
                {assessment.diagnosisSummary}
              </Text>

              {/* Detected Symptoms */}
              {assessment.detectedSymptoms.length > 0 && (
                <View style={styles.symptomsBlock}>
                  <Text style={styles.subBlockLabel}>DETECTED INDICATORS</Text>
                  {assessment.detectedSymptoms.map((sym, idx) => (
                    <Text key={idx} style={styles.symptomBullet}>
                      • {sym}
                    </Text>
                  ))}
                </View>
              )}

              {/* Interactive Checkable "Next Steps" */}
              <View style={styles.actionsSection}>
                <View style={styles.actionsHeaderRow}>
                  <Text style={styles.subBlockLabel}>
                    ACTIONABLE NEXT STEPS (TAP TO CHECK OFF)
                  </Text>
                  <Text style={styles.actionsCounter}>
                    {
                      assessment.recommendedActions.filter((a) => a.completed)
                        .length
                    }
                    /{assessment.recommendedActions.length} done
                  </Text>
                </View>

                {assessment.recommendedActions.map((action) => {
                  const urg = UrgencyBadgeTheme[action.urgency];
                  return (
                    <Pressable
                      key={action.id}
                      onPress={() =>
                        toggleRecommendedAction(plant.id, action.id)
                      }
                      style={({ pressed }) => [
                        styles.checkableActionCard,
                        action.completed && styles.checkableActionDone,
                        pressed && { opacity: 0.85 },
                      ]}>
                      {action.completed ? (
                        <CheckSquare size={20} color={Palette.primary} />
                      ) : (
                        <Square size={20} color={Palette.textSecondary} />
                      )}

                      <View style={styles.checkableTextCol}>
                        <View style={styles.checkableTopLine}>
                          <View
                            style={[
                              styles.urgencyMiniBadge,
                              {
                                backgroundColor: urg.bg,
                                borderColor: urg.border,
                              },
                            ]}>
                            <Text
                              style={[
                                styles.urgencyMiniText,
                                { color: urg.text },
                              ]}>
                              {urg.label}
                            </Text>
                          </View>
                        </View>

                        <Text
                          style={[
                            styles.actionInstruction,
                            action.completed && styles.actionInstructionDone,
                          ]}>
                          {action.instruction}
                        </Text>

                        {Boolean(action.rationale) && (
                          <Text style={styles.actionRationale}>
                            Why: {action.rationale}
                          </Text>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {/* Diagnostic Follow-Up Questions */}
              {assessment.followUpQuestions.length > 0 && (
                <View style={styles.followUpBox}>
                  <View style={styles.followUpTitleRow}>
                    <HelpCircle size={14} color={Palette.primary} />
                    <Text style={styles.followUpTitle}>
                      Botanical Follow-Up Checks
                    </Text>
                  </View>
                  {assessment.followUpQuestions.map((q, idx) => (
                    <Text key={idx} style={styles.followUpQuestion}>
                      • {q}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* 3. QUICK-ACTION CARE EVENT LOGGER + CHRONOLOGICAL NOTEBOOK TIMELINE */}
          <View style={styles.timelineSectionCard}>
            <Text style={styles.sectionHeaderTitle}>
              Quick-Log Care or Propagation Milestone
            </Text>

            <TextInput
              value={customNote}
              onChangeText={setCustomNote}
              placeholder="Optional note (e.g., 'Root reached 10.5cm' or 'Bottom-soaked for 15m')..."
              placeholderTextColor={Palette.textMuted}
              style={styles.quickNoteInput}
            />

            <View style={styles.quickActionsGrid}>
              {QUICK_ACTIONS.map((qa) => {
                const isSelected = selectedQuickType === qa.type;
                return (
                  <Pressable
                    key={qa.type}
                    onPress={() => handleQuickLog(qa.type)}
                    style={({ pressed }) => [
                      styles.quickActionBtn,
                      isSelected && {
                        borderColor: qa.color,
                        backgroundColor: Palette.bgPrimary,
                      },
                      pressed && { opacity: 0.75 },
                    ]}>
                    {qa.type === 'water' && (
                      <Droplets size={15} color={qa.color} />
                    )}
                    {qa.type === 'propagation' && (
                      <Sprout size={15} color={qa.color} />
                    )}
                    {qa.type === 'fertilize' && (
                      <FlaskConical size={15} color={qa.color} />
                    )}
                    {qa.type === 'prune' && (
                      <Scissors size={15} color={qa.color} />
                    )}
                    {qa.type === 'repot' && (
                      <Sprout size={15} color={qa.color} />
                    )}
                    {qa.type === 'note' && (
                      <FileText size={15} color={qa.color} />
                    )}
                    <Text style={styles.quickActionLabel}>+ {qa.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.timelineDivider} />

            <View style={styles.timelineHeaderBlock}>
              <Text style={styles.sectionHeaderTitle}>
                Chronological Notebook Timeline ({plantEntries.length})
              </Text>
            </View>

            <View style={styles.timelineList}>
              {plantEntries.map((entry, idx) => (
                <SwipeableLogItem
                  key={entry.id}
                  entry={entry}
                  isLast={idx === plantEntries.length - 1}
                  onEdit={(target) => setEditingEntry(target)}
                  onDelete={handleDeleteLogEntry}
                />
              ))}
            </View>
          </View>

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
              <Pencil size={16} color={Palette.primary} />
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
              <Trash2 size={16} color={Palette.criticalText} />
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
    color: Palette.textPrimary,
  },
  backBtnPill: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.full,
  },
  backBtnText: {
    color: Palette.textInverse,
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
    color: Palette.textPrimary,
  },
  scanShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.primary,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  scanShortcutText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.textInverse,
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
  heroCard: {
    backgroundColor: Palette.bgSurface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
    padding: Spacing.lg,
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
    backgroundColor: Palette.bgSubtle,
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
    backgroundColor: Palette.bgSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  familyChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.primary,
  },
  heroNickname: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  heroSpecies: {
    fontSize: 13,
    color: Palette.textSecondary,
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
    color: Palette.textSecondary,
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  specBadge: {
    flex: 1,
    minWidth: 150,
    backgroundColor: Palette.bgPrimary,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
    borderRadius: Radius.md,
    padding: 10,
    gap: 3,
  },
  specBadgeWarning: {
    backgroundColor: Palette.attentionBg,
    borderColor: Palette.attentionBorder,
  },
  specBadgeWaterDue: {
    backgroundColor: Palette.waterAlertBg,
    borderColor: Palette.waterAlertBorder,
  },
  specBadgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: Palette.textMuted,
  },
  specBadgeValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.textPrimary,
    textTransform: 'capitalize',
  },
  waterCountdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  baselineStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Palette.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
  },
  baselineStripText: {
    flex: 1,
    fontSize: 12,
    color: Palette.primary,
  },
  assessmentCard: {
    backgroundColor: Palette.bgSurface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...CardShadow,
  },
  assessmentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  assessmentTitleGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assessmentTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  assessmentMeta: {
    fontSize: 12,
    color: Palette.textSecondary,
  },
  rescanPillBtn: {
    backgroundColor: Palette.primarySoft,
    borderWidth: 1,
    borderColor: '#C5DEC9',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  rescanPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.primary,
  },
  guardrailCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Palette.attentionBg,
    borderColor: Palette.attentionBorder,
    borderWidth: 1,
    padding: 11,
    borderRadius: Radius.md,
  },
  guardrailCalloutText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    color: Palette.attentionText,
  },
  diagnosisBody: {
    fontSize: 14,
    lineHeight: 21,
    color: Palette.textPrimary,
  },
  symptomsBlock: {
    backgroundColor: Palette.bgPrimary,
    borderRadius: Radius.md,
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
  },
  subBlockLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: Palette.textSecondary,
  },
  symptomBullet: {
    fontSize: 13,
    lineHeight: 19,
    color: Palette.textPrimary,
  },
  actionsSection: {
    gap: 8,
  },
  actionsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionsCounter: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.primary,
  },
  checkableActionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Palette.bgPrimary,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
    borderRadius: Radius.md,
    padding: 12,
  },
  checkableActionDone: {
    backgroundColor: Palette.primarySoft,
    borderColor: '#C5DEC9',
  },
  checkableTextCol: {
    flex: 1,
    gap: 4,
  },
  checkableTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  urgencyMiniBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  urgencyMiniText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  actionInstruction: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  actionInstructionDone: {
    textDecorationLine: 'line-through',
    color: Palette.textSecondary,
  },
  actionRationale: {
    fontSize: 12,
    color: Palette.textSecondary,
  },
  followUpBox: {
    backgroundColor: Palette.bgSubtle,
    borderRadius: Radius.md,
    padding: 12,
    gap: 4,
  },
  followUpTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  followUpTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.primary,
  },
  followUpQuestion: {
    fontSize: 12,
    lineHeight: 18,
    color: Palette.textSecondary,
  },
  timelineSectionCard: {
    backgroundColor: Palette.bgSurface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...CardShadow,
  },
  sectionHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  quickNoteInput: {
    backgroundColor: Palette.bgPrimary,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: Palette.textPrimary,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.bgSubtle,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  timelineDivider: {
    height: 1,
    backgroundColor: Palette.borderSubtle,
    marginVertical: 4,
  },
  timelineHeaderBlock: {
    gap: 4,
  },
  swipeHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  swipeHintText: {
    fontSize: 12,
    fontWeight: '500',
    color: Palette.textSecondary,
  },
  timelineList: {
    gap: 0,
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
    backgroundColor: Palette.bgSurface,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: Radius.lg,
    ...CardShadow,
  },
  bottomEditBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.primary,
  },
  bottomDeleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.criticalBg,
    borderWidth: 1,
    borderColor: Palette.criticalBorder,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: Radius.lg,
    ...CardShadow,
  },
  bottomDeleteBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.criticalText,
  },
});
