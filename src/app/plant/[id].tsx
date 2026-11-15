import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Camera,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Droplets,
  FileText,
  FlaskConical,
  HelpCircle,
  History,
  Image as ImageIcon,
  Layers,
  MapPin,
  Pencil,
  Scissors,
  ShieldAlert,
  Sparkles,
  Sprout,
  Square,
  Stethoscope,
  Sun,
  Trash2,
  X
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

import { BotanicalBackground } from '@/components/botanical-background';
import { EditLogModal } from '@/components/edit-log-modal';
import { EditPlantModal } from '@/components/edit-plant-modal';
import { FeedbackBanner } from '@/components/feedback-banner';
import { SwipeableLogItem } from '@/components/swipeable-log-item';
import {
  CardShadow,
  getHealthBadgeTheme,
  getUrgencyBadgeTheme,
  MaxContentWidth,
  Radius,
  Spacing,
  type ThemePalette,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import { diagnosePlantHealth } from '@/services/aiPlantService';
import {
  triggerLightHaptic,
  triggerSuccessHaptic,
} from '@/services/haptics';
import {
  getDaysUntilNextWater,
  usePlantStore,
} from '@/store/usePlantStore';
import type { CareEventType, NotebookEntry } from '@/types/plant';

const QUICK_FOLLOW_UP_CHIPS = [
  'Check underside for webbing or specks',
  'Soil feels soggy / sour smell',
  'Placed near drafty AC or heater',
  'Recently repotted or moved',
] as const;

const SOIL_MOISTURE_OPTIONS: Array<{
  value: 'bone_dry' | 'slightly_damp' | 'moist' | 'waterlogged';
  label: string;
}> = [
  { value: 'bone_dry', label: 'Bone Dry' },
  { value: 'slightly_damp', label: 'Slightly Damp' },
  { value: 'moist', label: 'Moist' },
  { value: 'waterlogged', label: 'Waterlogged' },
];

const getQuickActions = (
  palette: ThemePalette
): {
  type: CareEventType;
  label: string;
  defaultTitle: string;
  defaultNotes: string;
  color: string;
}[] => [
    {
      type: 'water',
      label: 'Log Water',
      defaultTitle: 'Thorough Watering',
      defaultNotes: 'Watered after checking substrate dryness.',
      color: palette.waterBlue,
    },
    {
      type: 'propagation',
      label: 'Prop Milestone',
      defaultTitle: 'Propagation Growth Check',
      defaultNotes: 'Logged new root/shoot elongation milestone.',
      color: palette.accentTerracotta,
    },
    {
      type: 'fertilize',
      label: 'Fertilize',
      defaultTitle: 'Diluted Nutrient Feed',
      defaultNotes: 'Applied balanced liquid fertilizer at 1/2 strength.',
      color: palette.primary,
    },
    {
      type: 'prune',
      label: 'Prune',
      defaultTitle: 'Canopy & Leaf Pruning',
      defaultNotes: 'Removed spent lower foliage and pinched apical tip.',
      color: palette.primaryMuted,
    },
    {
      type: 'repot',
      label: 'Repot',
      defaultTitle: 'Substrate & Pot Refresh',
      defaultNotes: 'Checked root health and refreshed gritty aerated substrate.',
      color: palette.accentTerracotta,
    },
    {
      type: 'note',
      label: 'Add Note',
      defaultTitle: 'Botanical Observation Note',
      defaultNotes: 'Leaves looking turgid and well-oriented toward window light.',
      color: palette.textSecondary,
    },
  ];

export default function PlantDetailNotebookScreen() {
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const healthBadgeTheme = useMemo(() => getHealthBadgeTheme(palette), [palette]);
  const urgencyBadgeTheme = useMemo(() => getUrgencyBadgeTheme(palette), [palette]);
  const quickActions = useMemo(() => getQuickActions(palette), [palette]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const plants = usePlantStore((s) => s.plants);
  const entries = usePlantStore((s) => s.entries);
  const healthAssessments = usePlantStore((s) => s.healthAssessments);
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
  const [rescanError, setRescanError] = useState<string | null>(null);
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<number, string>>({});
  const [isRefiningDiagnosis, setIsRefiningDiagnosis] = useState<boolean>(false);
  const [showScanHistory, setShowScanHistory] = useState<boolean>(false);
  const [showDetailedLog, setShowDetailedLog] = useState<boolean>(false);
  const [logPhotoUri, setLogPhotoUri] = useState<string | undefined>(undefined);
  const [logSoilMoisture, setLogSoilMoisture] = useState<
    NonNullable<NotebookEntry['metrics']>['soilMoisture'] | undefined
  >(undefined);
  const [logWaterMl, setLogWaterMl] = useState<string>('');
  const [logRootCm, setLogRootCm] = useState<string>('');
  const [logStemCm, setLogStemCm] = useState<string>('');
  const [logLeafCount, setLogLeafCount] = useState<string>('');
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
  const assessment = plant.latestHealthAssessment;
  const healthStatus = assessment?.healthStatus ?? 'thriving';
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

  const handlePickLogPhoto = async (source: 'camera' | 'library') => {
    try {
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          showToast('Camera permission is needed to attach a progress photo.');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.75,
        });
        if (!result.canceled && result.assets[0]?.uri) {
          setLogPhotoUri(result.assets[0].uri);
        }
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          showToast('Photo library permission is needed to pick a photo.');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.75,
        });
        if (!result.canceled && result.assets[0]?.uri) {
          setLogPhotoUri(result.assets[0].uri);
        }
      }
    } catch {
      showToast('Unable to select photo right now.');
    }
  };

  const handleQuickLog = (actionType: CareEventType) => {
    setSelectedQuickType(actionType);
    triggerLightHaptic();

    const parsedWater = Number(logWaterMl);
    const parsedRoot = Number(logRootCm);
    const parsedStem = Number(logStemCm);
    const parsedLeaves = Number(logLeafCount);
    const hasMetrics =
      Boolean(logSoilMoisture) ||
      (!Number.isNaN(parsedWater) && parsedWater > 0) ||
      (!Number.isNaN(parsedRoot) && parsedRoot > 0) ||
      (!Number.isNaN(parsedStem) && parsedStem > 0) ||
      (!Number.isNaN(parsedLeaves) && parsedLeaves > 0);

    if (
      actionType === 'water' &&
      !customNote.trim() &&
      !logPhotoUri &&
      !hasMetrics
    ) {
      waterPlantNow(plant.id);
      return;
    }

    const template =
      quickActions.find((a) => a.type === actionType) ?? quickActions[0];

    const metrics: NotebookEntry['metrics'] | undefined = hasMetrics
      ? {
          ...(logSoilMoisture ? { soilMoisture: logSoilMoisture } : {}),
          ...(!Number.isNaN(parsedWater) && parsedWater > 0
            ? { waterAmountMl: Math.round(parsedWater) }
            : {}),
          ...(!Number.isNaN(parsedRoot) && parsedRoot > 0
            ? { rootLengthCm: parsedRoot }
            : {}),
          ...(!Number.isNaN(parsedStem) && parsedStem > 0
            ? { stemHeightCm: parsedStem }
            : {}),
          ...(!Number.isNaN(parsedLeaves) && parsedLeaves > 0
            ? { leafCount: Math.round(parsedLeaves) }
            : {}),
        }
      : undefined;

    logCareEvent({
      plantId: plant.id,
      eventType: actionType,
      title: template.defaultTitle,
      notes: customNote.trim() || template.defaultNotes,
      photoUri: logPhotoUri,
      metrics,
    });
    setCustomNote('');
    setLogPhotoUri(undefined);
    setLogSoilMoisture(undefined);
    setLogWaterMl('');
    setLogRootCm('');
    setLogStemCm('');
    setLogLeafCount('');
    showToast(`Logged ${template.label} for "${plant.nickname}".`);
  };

  const handleRefineWithFollowUps = async () => {
    if (!assessment || assessment.followUpQuestions.length === 0) return;
    const answeredPairs = assessment.followUpQuestions
      .map((q, idx) => {
        const ans = followUpAnswers[idx]?.trim();
        return ans ? `Q: ${q}\nA: ${ans}` : null;
      })
      .filter((pair): pair is string => Boolean(pair));

    if (answeredPairs.length === 0) {
      showToast('Tap or type at least one follow-up answer first.');
      return;
    }

    setIsRefiningDiagnosis(true);
    setRescanError(null);
    try {
      const refined = await diagnosePlantHealth(
        plant.photoUri,
        plant,
        plantEntries,
        `Follow-up answers from gardener:\n${answeredPairs.join('\n')}`
      );
      saveHealthAssessment(plant.id, refined, plant.photoUri);
      setFollowUpAnswers({});
      triggerSuccessHaptic();
      showToast('Diagnosis refined with your observations!');
    } catch (err) {
      setRescanError(
        err instanceof Error ? err.message : 'Unable to refine diagnosis.'
      );
    } finally {
      setIsRefiningDiagnosis(false);
    }
  };

  const handleInstantAiRescan = async () => {
    setRescanError(null);
    setIsRescanning(true);
    try {
      const diagnosis = await diagnosePlantHealth(
        plant.photoUri,
        plant,
        plantEntries,
        customNote.trim() || undefined
      );
      saveHealthAssessment(plant.id, diagnosis, plant.photoUri);
      showToast('AI Health Assessment refreshed! 🌿');
    } catch (err) {
      setRescanError(
        err instanceof Error
          ? err.message
          : 'Could not complete AI health scan right now.'
      );
    } finally {
      setIsRescanning(false);
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

              {/* Current Light Exposure */}
              <View style={styles.specBadge}>
                <Text style={styles.specBadgeLabel}>CURRENT EXPOSURE</Text>
                <Text style={styles.specBadgeValue}>
                  {plant.lightExposure.replace('_', ' ')} •{' '}
                  {plant.isIndoor ? 'Indoor' : 'Outdoor'}
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
          </View>

          {rescanError && (
            <View style={styles.errorBanner}>
              <AlertCircle size={16} color={palette.criticalText} />
              <Text style={styles.errorBannerText}>{rescanError}</Text>
            </View>
          )}

          {/* 2. LATEST AI HEALTH ASSESSMENT CARD (with Interactive Checkable Next Steps) */}
          {assessment && (
            <View style={styles.assessmentCard}>
              <View style={styles.assessmentHeaderRow}>
                <View style={styles.assessmentTitleGroup}>
                  <Sparkles size={18} color={palette.primary} />
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
                    <ActivityIndicator size="small" color={palette.primary} />
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
                    <ShieldAlert size={16} color={palette.attentionText} />
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
                  const urg = urgencyBadgeTheme[action.urgency];
                  return (
                    <Pressable
                      key={action.id}
                      onPress={() => {
                        triggerLightHaptic();
                        toggleRecommendedAction(plant.id, action.id);
                      }}
                      style={({ pressed }) => [
                        styles.checkableActionCard,
                        action.completed && styles.checkableActionDone,
                        pressed && { opacity: 0.85 },
                      ]}>
                      {action.completed ? (
                        <CheckSquare size={20} color={palette.primary} />
                      ) : (
                        <Square size={20} color={palette.textSecondary} />
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

              {/* Interactive Diagnostic Follow-Up Questions */}
              {assessment.followUpQuestions.length > 0 && (
                <View style={styles.followUpBox}>
                  <View style={styles.followUpTitleRow}>
                    <HelpCircle size={14} color={palette.primary} />
                    <Text style={styles.followUpTitle}>
                      Botanical Follow-Up Checks
                    </Text>
                  </View>
                  {assessment.followUpQuestions.map((q, idx) => {
                    const answer = followUpAnswers[idx] ?? '';
                    return (
                      <View key={idx} style={{ gap: 6, marginTop: idx > 0 ? 6 : 0 }}>
                        <Text style={styles.followUpQuestion}>• {q}</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                          {QUICK_FOLLOW_UP_CHIPS.map((chip) => {
                            const selected = answer === chip;
                            return (
                              <Pressable
                                key={chip}
                                onPress={() => {
                                  triggerLightHaptic();
                                  setFollowUpAnswers((prev) => ({
                                    ...prev,
                                    [idx]: selected ? '' : chip,
                                  }));
                                }}
                                style={{
                                  paddingHorizontal: 10,
                                  paddingVertical: 5,
                                  borderRadius: 999,
                                  borderWidth: 1,
                                  backgroundColor: selected
                                    ? palette.primary
                                    : palette.bgSurface,
                                  borderColor: selected
                                    ? palette.primary
                                    : palette.borderSubtle,
                                }}>
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontWeight: '700',
                                    color: selected
                                      ? palette.textInverse
                                      : palette.textSecondary,
                                  }}>
                                  {chip}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                        <TextInput
                          value={answer}
                          onChangeText={(txt) =>
                            setFollowUpAnswers((prev) => ({ ...prev, [idx]: txt }))
                          }
                          placeholder="Or type a short observation..."
                          placeholderTextColor={palette.textMuted}
                          style={{
                            backgroundColor: palette.bgSurface,
                            borderWidth: 1,
                            borderColor: palette.borderSubtle,
                            borderRadius: 10,
                            paddingHorizontal: 10,
                            paddingVertical: 7,
                            fontSize: 12,
                            color: palette.textPrimary,
                          }}
                        />
                      </View>
                    );
                  })}

                  <Pressable
                    onPress={handleRefineWithFollowUps}
                    disabled={isRefiningDiagnosis}
                    style={({ pressed }) => [
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        marginTop: 6,
                        backgroundColor: palette.primary,
                        paddingVertical: 10,
                        borderRadius: 12,
                      },
                      pressed && { opacity: 0.85 },
                      isRefiningDiagnosis && { opacity: 0.65 },
                    ]}>
                    {isRefiningDiagnosis ? (
                      <ActivityIndicator size="small" color={palette.textInverse} />
                    ) : (
                      <Sparkles size={14} color={palette.textInverse} />
                    )}
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: palette.textInverse,
                      }}>
                      {isRefiningDiagnosis
                        ? 'Refining Diagnosis...'
                        : 'Refine Diagnosis with Answers'}
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* Scan History Drawer / Accordion */}
              {plantAssessments.length > 0 && (
                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: palette.borderSubtle,
                    paddingTop: 10,
                    gap: 8,
                  }}>
                  <Pressable
                    onPress={() => {
                      triggerLightHaptic();
                      setShowScanHistory((prev) => !prev);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <History size={14} color={palette.textSecondary} />
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: palette.textSecondary,
                        }}>
                        Scan History ({plantAssessments.length})
                      </Text>
                    </View>
                    {showScanHistory ? (
                      <ChevronUp size={16} color={palette.textSecondary} />
                    ) : (
                      <ChevronDown size={16} color={palette.textSecondary} />
                    )}
                  </Pressable>

                  {showScanHistory &&
                    plantAssessments.map((hist) => {
                      const histBadge = healthBadgeTheme[hist.healthStatus];
                      return (
                        <View
                          key={hist.id}
                          style={{
                            backgroundColor: palette.bgPrimary,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: palette.borderSubtle,
                            padding: 10,
                            gap: 4,
                          }}>
                          <View
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}>
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: '800',
                                color: histBadge.text,
                              }}>
                              {histBadge.label} · every {hist.adjustedWateringIntervalDays}d
                            </Text>
                            <Text
                              style={{
                                fontSize: 11,
                                color: palette.textMuted,
                              }}>
                              {new Date(hist.createdAt).toLocaleDateString()}
                            </Text>
                          </View>
                          <Text
                            style={{
                              fontSize: 12,
                              color: palette.textSecondary,
                              lineHeight: 17,
                            }}>
                            {hist.diagnosisSummary}
                          </Text>
                        </View>
                      );
                    })}
                </View>
              )}
            </View>
          )}

          {/* 3. QUICK-ACTION CARE EVENT LOGGER + CHRONOLOGICAL NOTEBOOK TIMELINE */}
          <View style={styles.timelineSectionCard}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
              <Text style={styles.sectionHeaderTitle}>
                Quick-Log Care or Propagation Milestone
              </Text>
              <Pressable
                onPress={() => {
                  triggerLightHaptic();
                  setShowDetailedLog((prev) => !prev);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 9,
                  paddingVertical: 4,
                  borderRadius: 999,
                  backgroundColor: showDetailedLog
                    ? palette.primarySoft
                    : palette.bgPrimary,
                  borderWidth: 1,
                  borderColor: showDetailedLog
                    ? palette.primary
                    : palette.borderSubtle,
                }}>
                <Camera
                  size={12}
                  color={
                    showDetailedLog ? palette.primary : palette.textSecondary
                  }
                />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: showDetailedLog
                      ? palette.primary
                      : palette.textSecondary,
                  }}>
                  {showDetailedLog ? 'Hide Details' : 'Photo & Metrics'}
                </Text>
              </Pressable>
            </View>

            <TextInput
              value={customNote}
              onChangeText={setCustomNote}
              placeholder="Optional note (e.g., 'Root reached 10.5cm' or 'Bottom-soaked for 15m')..."
              placeholderTextColor={palette.textMuted}
              style={styles.quickNoteInput}
            />

            {showDetailedLog && (
              <View
                style={{
                  backgroundColor: palette.bgPrimary,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: palette.borderSubtle,
                  padding: 12,
                  gap: 10,
                }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Pressable
                    onPress={() => void handlePickLogPhoto('camera')}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor: palette.bgSurface,
                      borderWidth: 1,
                      borderColor: palette.borderSubtle,
                    }}>
                    <Camera size={14} color={palette.primary} />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: palette.textPrimary,
                      }}>
                      Camera
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void handlePickLogPhoto('library')}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor: palette.bgSurface,
                      borderWidth: 1,
                      borderColor: palette.borderSubtle,
                    }}>
                    <ImageIcon size={14} color={palette.primary} />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: palette.textPrimary,
                      }}>
                      Library
                    </Text>
                  </Pressable>
                </View>

                {Boolean(logPhotoUri) && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Image
                      source={{ uri: logPhotoUri }}
                      style={{ width: 56, height: 56, borderRadius: 10 }}
                      contentFit="cover"
                    />
                    <Pressable
                      onPress={() => setLogPhotoUri(undefined)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 999,
                        backgroundColor: palette.bgSurface,
                        borderWidth: 1,
                        borderColor: palette.borderSubtle,
                      }}>
                      <X size={12} color={palette.textSecondary} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: palette.textSecondary }}>
                        Remove Photo
                      </Text>
                    </Pressable>
                  </View>
                )}

                <View style={{ gap: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: palette.textSecondary }}>
                    Soil Moisture Prior
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {SOIL_MOISTURE_OPTIONS.map((opt) => {
                      const active = logSoilMoisture === opt.value;
                      return (
                        <Pressable
                          key={opt.value}
                          onPress={() =>
                            setLogSoilMoisture(active ? undefined : opt.value)
                          }
                          style={{
                            paddingHorizontal: 9,
                            paddingVertical: 5,
                            borderRadius: 999,
                            borderWidth: 1,
                            backgroundColor: active
                              ? palette.primarySoft
                              : palette.bgSurface,
                            borderColor: active
                              ? palette.primary
                              : palette.borderSubtle,
                          }}>
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '700',
                              color: active
                                ? palette.primary
                                : palette.textSecondary,
                            }}>
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    value={logWaterMl}
                    onChangeText={setLogWaterMl}
                    placeholder="Water (ml)"
                    placeholderTextColor={palette.textMuted}
                    keyboardType="numeric"
                    style={{
                      flex: 1,
                      backgroundColor: palette.bgSurface,
                      borderWidth: 1,
                      borderColor: palette.borderSubtle,
                      borderRadius: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 7,
                      fontSize: 12,
                      color: palette.textPrimary,
                    }}
                  />
                  <TextInput
                    value={logRootCm}
                    onChangeText={setLogRootCm}
                    placeholder="Root (cm)"
                    placeholderTextColor={palette.textMuted}
                    keyboardType="decimal-pad"
                    style={{
                      flex: 1,
                      backgroundColor: palette.bgSurface,
                      borderWidth: 1,
                      borderColor: palette.borderSubtle,
                      borderRadius: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 7,
                      fontSize: 12,
                      color: palette.textPrimary,
                    }}
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    value={logStemCm}
                    onChangeText={setLogStemCm}
                    placeholder="Stem (cm)"
                    placeholderTextColor={palette.textMuted}
                    keyboardType="decimal-pad"
                    style={{
                      flex: 1,
                      backgroundColor: palette.bgSurface,
                      borderWidth: 1,
                      borderColor: palette.borderSubtle,
                      borderRadius: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 7,
                      fontSize: 12,
                      color: palette.textPrimary,
                    }}
                  />
                  <TextInput
                    value={logLeafCount}
                    onChangeText={setLogLeafCount}
                    placeholder="Leaf count"
                    placeholderTextColor={palette.textMuted}
                    keyboardType="numeric"
                    style={{
                      flex: 1,
                      backgroundColor: palette.bgSurface,
                      borderWidth: 1,
                      borderColor: palette.borderSubtle,
                      borderRadius: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 7,
                      fontSize: 12,
                      color: palette.textPrimary,
                    }}
                  />
                </View>
              </View>
            )}

            <View style={styles.quickActionsGrid}>
              {quickActions.map((qa) => {
                const isSelected = selectedQuickType === qa.type;
                return (
                  <Pressable
                    key={qa.type}
                    onPress={() => handleQuickLog(qa.type)}
                    style={({ pressed }) => [
                      styles.quickActionBtn,
                      isSelected && {
                        borderColor: qa.color,
                        backgroundColor: palette.bgPrimary,
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
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: palette.thrivingBg,
    borderColor: palette.thrivingBorder,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  feedbackBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.thrivingText,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: palette.criticalBg,
    borderColor: palette.criticalBorder,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: palette.criticalText,
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
  assessmentCard: {
    backgroundColor: palette.bgSurface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: palette.borderSubtle,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
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
    color: palette.textPrimary,
  },
  assessmentMeta: {
    fontSize: 12,
    color: palette.textSecondary,
  },
  rescanPillBtn: {
    backgroundColor: palette.primarySoft,
    borderWidth: 1,
    borderColor: palette.primaryBorder,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  rescanPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.primary,
  },
  guardrailCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: palette.attentionBg,
    borderColor: palette.attentionBorder,
    borderWidth: 1,
    padding: 11,
    borderRadius: Radius.md,
  },
  guardrailCalloutText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    color: palette.attentionText,
  },
  diagnosisBody: {
    fontSize: 14,
    lineHeight: 21,
    color: palette.textPrimary,
  },
  symptomsBlock: {
    backgroundColor: palette.bgPrimary,
    borderRadius: Radius.md,
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: palette.borderSubtle,
  },
  subBlockLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: palette.textSecondary,
  },
  symptomBullet: {
    fontSize: 13,
    lineHeight: 19,
    color: palette.textPrimary,
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
    color: palette.primary,
  },
  checkableActionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: palette.bgPrimary,
    borderWidth: 1,
    borderColor: palette.borderSubtle,
    borderRadius: Radius.md,
    padding: 12,
  },
  checkableActionDone: {
    backgroundColor: palette.primarySoft,
    borderColor: palette.primaryBorder,
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
    color: palette.textPrimary,
  },
  actionInstructionDone: {
    textDecorationLine: 'line-through',
    color: palette.textSecondary,
  },
  actionRationale: {
    fontSize: 12,
    color: palette.textSecondary,
  },
  followUpBox: {
    backgroundColor: palette.bgSubtle,
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
    color: palette.primary,
  },
  followUpQuestion: {
    fontSize: 12,
    lineHeight: 18,
    color: palette.textSecondary,
  },
  timelineSectionCard: {
    backgroundColor: palette.bgSurface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: palette.borderSubtle,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.md,
    ...CardShadow,
  },
  sectionHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: palette.textPrimary,
  },
  quickNoteInput: {
    backgroundColor: palette.bgPrimary,
    borderWidth: 1,
    borderColor: palette.borderSubtle,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: palette.textPrimary,
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
    backgroundColor: palette.bgSubtle,
    borderWidth: 1,
    borderColor: palette.borderSubtle,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.textPrimary,
  },
  timelineDivider: {
    height: 1,
    backgroundColor: palette.borderSubtle,
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
    color: palette.textSecondary,
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
