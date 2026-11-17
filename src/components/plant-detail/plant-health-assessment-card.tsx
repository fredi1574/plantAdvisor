import {
  AlertCircle,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  History,
  ShieldAlert,
  Sparkles,
  Square,
} from 'lucide-react-native';
import { useMemo, useReducer } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AiLimitModal } from '@/components/modals/ai-limit-modal';
import {
  CardShadow,
  getHealthBadgeTheme,
  getUrgencyBadgeTheme,
  Radius,
  Spacing,
  type ThemePalette,
} from '@/constants/theme';
import { usePalette } from '@/hooks/use-theme';
import {
  AiQuotaExceededError,
  diagnosePlantHealth,
} from '@/services/aiPlantService';
import {
  triggerLightHaptic,
  triggerSuccessHaptic,
} from '@/services/haptics';
import { usePlantStore } from '@/store/usePlantStore';
import type {
  AiQuotaStatus,
  HealthAssessment,
  NotebookEntry,
  UserPlant,
} from '@/types/plant';

const QUICK_FOLLOW_UP_CHIPS = [
  'Check underside for webbing or specks',
  'Soil feels soggy / sour smell',
  'Placed near drafty AC or heater',
  'Recently repotted or moved',
] as const;

interface PlantHealthAssessmentCardProps {
  plant: UserPlant;
  plantEntries: NotebookEntry[];
  plantAssessments: HealthAssessment[];
  onShowToast: (message: string) => void;
}

interface DiagnosisState {
  activeAction: 'idle' | 'rescanning' | 'refining';
  error: string | null;
  followUpAnswers: Record<number, string>;
  showScanHistory: boolean;
  limitModalQuota: AiQuotaStatus | null;
}

type DiagnosisAction =
  | { type: 'START_RESCAN' }
  | { type: 'START_REFINE' }
  | { type: 'FINISH_SUCCESS'; clearFollowUps?: boolean }
  | { type: 'FINISH_ERROR'; error: string }
  | { type: 'QUOTA_EXCEEDED'; quota: AiQuotaStatus }
  | { type: 'DISMISS_LIMIT_MODAL' }
  | { type: 'SET_FOLLOW_UP'; index: number; value: string }
  | { type: 'TOGGLE_HISTORY' };

const INITIAL_DIAGNOSIS_STATE: DiagnosisState = {
  activeAction: 'idle',
  error: null,
  followUpAnswers: {},
  showScanHistory: false,
  limitModalQuota: null,
};

function diagnosisReducer(
  state: DiagnosisState,
  action: DiagnosisAction
): DiagnosisState {
  switch (action.type) {
    case 'START_RESCAN':
      return { ...state, activeAction: 'rescanning', error: null };
    case 'START_REFINE':
      return { ...state, activeAction: 'refining', error: null };
    case 'FINISH_SUCCESS':
      return {
        ...state,
        activeAction: 'idle',
        error: null,
        followUpAnswers: action.clearFollowUps ? {} : state.followUpAnswers,
      };
    case 'FINISH_ERROR':
      return { ...state, activeAction: 'idle', error: action.error };
    case 'QUOTA_EXCEEDED':
      return {
        ...state,
        activeAction: 'idle',
        limitModalQuota: action.quota,
      };
    case 'DISMISS_LIMIT_MODAL':
      return { ...state, limitModalQuota: null };
    case 'SET_FOLLOW_UP':
      return {
        ...state,
        followUpAnswers: {
          ...state.followUpAnswers,
          [action.index]: action.value,
        },
      };
    case 'TOGGLE_HISTORY':
      return { ...state, showScanHistory: !state.showScanHistory };
  }
}

/**
 * Displays the latest AI health assessment, checkable next steps,
 * interactive follow-up refinement questions, and scan history drawer.
 */
export function PlantHealthAssessmentCard({
  plant,
  plantEntries,
  plantAssessments,
  onShowToast,
}: PlantHealthAssessmentCardProps) {
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const healthBadgeTheme = useMemo(() => getHealthBadgeTheme(palette), [palette]);
  const urgencyBadgeTheme = useMemo(
    () => getUrgencyBadgeTheme(palette),
    [palette]
  );

  const toggleRecommendedAction = usePlantStore(
    (s) => s.toggleRecommendedAction
  );
  const saveHealthAssessment = usePlantStore((s) => s.saveHealthAssessment);

  const [state, dispatch] = useReducer(
    diagnosisReducer,
    INITIAL_DIAGNOSIS_STATE
  );

  const assessment = plant.latestHealthAssessment;
  const isRescanning = state.activeAction === 'rescanning';
  const isRefiningDiagnosis = state.activeAction === 'refining';

  const handleInstantAiRescan = async () => {
    dispatch({ type: 'START_RESCAN' });
    try {
      const diagnosis = await diagnosePlantHealth(
        plant.photoUri,
        plant,
        plantEntries
      );
      saveHealthAssessment(plant.id, diagnosis, plant.photoUri);
      dispatch({ type: 'FINISH_SUCCESS' });
      onShowToast('AI Health Assessment refreshed! 🌿');
    } catch (err) {
      if (err instanceof AiQuotaExceededError) {
        dispatch({ type: 'QUOTA_EXCEEDED', quota: err.quota });
      } else {
        dispatch({
          type: 'FINISH_ERROR',
          error:
            err instanceof Error
              ? err.message
              : 'Could not complete AI health scan right now.',
        });
      }
    }
  };

  const handleRefineWithFollowUps = async () => {
    if (!assessment || assessment.followUpQuestions.length === 0) return;
    const answeredPairs = assessment.followUpQuestions
      .map((q, idx) => {
        const ans = state.followUpAnswers[idx]?.trim();
        return ans ? `Q: ${q}\nA: ${ans}` : null;
      })
      .filter((pair): pair is string => Boolean(pair));

    if (answeredPairs.length === 0) {
      onShowToast('Tap or type at least one follow-up answer first.');
      return;
    }

    dispatch({ type: 'START_REFINE' });
    try {
      const refined = await diagnosePlantHealth(
        plant.photoUri,
        plant,
        plantEntries,
        `Follow-up answers from gardener:\n${answeredPairs.join('\n')}`
      );
      saveHealthAssessment(plant.id, refined, plant.photoUri);
      dispatch({ type: 'FINISH_SUCCESS', clearFollowUps: true });
      triggerSuccessHaptic();
      onShowToast('Diagnosis refined with your observations!');
    } catch (err) {
      if (err instanceof AiQuotaExceededError) {
        dispatch({ type: 'QUOTA_EXCEEDED', quota: err.quota });
      } else {
        dispatch({
          type: 'FINISH_ERROR',
          error:
            err instanceof Error
              ? err.message
              : 'Unable to refine diagnosis.',
        });
      }
    }
  };

  return (
    <>
      {state.error && (
        <View style={styles.errorBanner}>
          <AlertCircle size={16} color={palette.criticalText} />
          <Text style={styles.errorBannerText}>{state.error}</Text>
        </View>
      )}

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
                  Analyzed photo + {plantEntries.length} care logs • Adjusted
                  water cycle: {assessment.adjustedWateringIntervalDays}d
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
                {assessment.recommendedActions.filter((a) => a.completed).length}
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
                          style={[styles.urgencyMiniText, { color: urg.text }]}>
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
                const answer = state.followUpAnswers[idx] ?? '';
                return (
                  <View key={idx} style={{ gap: 6, marginTop: idx > 0 ? 6 : 0 }}>
                    <Text style={styles.followUpQuestion}>• {q}</Text>
                    <View style={styles.followUpChipsRow}>
                      {QUICK_FOLLOW_UP_CHIPS.map((chip) => {
                        const selected = answer === chip;
                        return (
                          <Pressable
                            key={chip}
                            onPress={() => {
                              triggerLightHaptic();
                              dispatch({
                                type: 'SET_FOLLOW_UP',
                                index: idx,
                                value: selected ? '' : chip,
                              });
                            }}
                            style={[
                              styles.followUpChip,
                              selected && styles.followUpChipSelected,
                            ]}>
                            <Text
                              style={[
                                styles.followUpChipText,
                                selected && styles.followUpChipTextSelected,
                              ]}>
                              {chip}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <TextInput
                      value={answer}
                      onChangeText={(value) =>
                        dispatch({ type: 'SET_FOLLOW_UP', index: idx, value })
                      }
                      placeholder="Or type a short observation..."
                      placeholderTextColor={palette.textMuted}
                      style={styles.followUpInput}
                    />
                  </View>
                );
              })}

              <Pressable
                onPress={handleRefineWithFollowUps}
                disabled={isRefiningDiagnosis}
                style={({ pressed }) => [
                  styles.refineBtn,
                  pressed && { opacity: 0.85 },
                  isRefiningDiagnosis && { opacity: 0.65 },
                ]}>
                {isRefiningDiagnosis ? (
                  <ActivityIndicator size="small" color={palette.textInverse} />
                ) : (
                  <Sparkles size={14} color={palette.textInverse} />
                )}
                <Text style={styles.refineBtnText}>
                  {isRefiningDiagnosis
                    ? 'Refining Diagnosis...'
                    : 'Refine Diagnosis with Answers'}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Scan History Drawer / Accordion */}
          {plantAssessments.length > 0 && (
            <View style={styles.historyContainer}>
              <Pressable
                onPress={() => {
                  triggerLightHaptic();
                  dispatch({ type: 'TOGGLE_HISTORY' });
                }}
                style={styles.historyToggleRow}>
                <View style={styles.historyToggleTitleRow}>
                  <History size={14} color={palette.textSecondary} />
                  <Text style={styles.historyToggleText}>
                    Scan History ({plantAssessments.length})
                  </Text>
                </View>
                {state.showScanHistory ? (
                  <ChevronUp size={16} color={palette.textSecondary} />
                ) : (
                  <ChevronDown size={16} color={palette.textSecondary} />
                )}
              </Pressable>

              {state.showScanHistory &&
                plantAssessments.map((hist) => {
                  const histBadge = healthBadgeTheme[hist.healthStatus];
                  return (
                    <View key={hist.id} style={styles.historyCard}>
                      <View style={styles.historyCardHeader}>
                        <Text
                          style={[
                            styles.historyCardBadgeText,
                            { color: histBadge.text },
                          ]}>
                          {histBadge.label} · every{' '}
                          {hist.adjustedWateringIntervalDays}d
                        </Text>
                        <Text style={styles.historyCardDate}>
                          {new Date(hist.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <Text style={styles.historyCardSummary}>
                        {hist.diagnosisSummary}
                      </Text>
                    </View>
                  );
                })}
            </View>
          )}
        </View>
      )}

      <AiLimitModal
        visible={Boolean(state.limitModalQuota)}
        quota={state.limitModalQuota}
        onClose={() => dispatch({ type: 'DISMISS_LIMIT_MODAL' })}
      />
    </>
  );
}

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
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
    followUpChipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    followUpChip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
      backgroundColor: palette.bgSurface,
      borderColor: palette.borderSubtle,
    },
    followUpChipSelected: {
      backgroundColor: palette.primary,
      borderColor: palette.primary,
    },
    followUpChipText: {
      fontSize: 11,
      fontWeight: '700',
      color: palette.textSecondary,
    },
    followUpChipTextSelected: {
      color: palette.textInverse,
    },
    followUpInput: {
      backgroundColor: palette.bgSurface,
      borderWidth: 1,
      borderColor: palette.borderSubtle,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 7,
      fontSize: 12,
      color: palette.textPrimary,
    },
    refineBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 6,
      backgroundColor: palette.primary,
      paddingVertical: 10,
      borderRadius: 12,
    },
    refineBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.textInverse,
    },
    historyContainer: {
      borderTopWidth: 1,
      borderTopColor: palette.borderSubtle,
      paddingTop: 10,
      gap: 8,
    },
    historyToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    historyToggleTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    historyToggleText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.textSecondary,
    },
    historyCard: {
      backgroundColor: palette.bgPrimary,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.borderSubtle,
      padding: 10,
      gap: 4,
    },
    historyCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    historyCardBadgeText: {
      fontSize: 11,
      fontWeight: '800',
    },
    historyCardDate: {
      fontSize: 11,
      color: palette.textMuted,
    },
    historyCardSummary: {
      fontSize: 12,
      color: palette.textSecondary,
      lineHeight: 17,
    },
  });
