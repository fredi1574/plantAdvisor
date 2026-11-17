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
  View,
} from 'react-native';

import { AiLimitModal } from '@/components/modals/ai-limit-modal';
import { BotanicalInput } from '@/components/ui/botanical-input';
import { Chip } from '@/components/ui/chip';
import { SurfaceCard } from '@/components/ui/surface-card';
import {
  BorderWidth,
  getHealthBadgeTheme,
  getUrgencyBadgeTheme,
  Radius,
  Spacing,
  Typography,
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
  const healthBadgeTheme = useMemo(
    () => getHealthBadgeTheme(palette),
    [palette]
  );
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
        <View
          style={[
            styles.errorBanner,
            {
              backgroundColor: palette.criticalBg,
              borderColor: palette.criticalBorder,
            },
          ]}>
          <AlertCircle size={16} color={palette.criticalText} />
          <Text style={[styles.errorBannerText, { color: palette.criticalText }]}>
            {state.error}
          </Text>
        </View>
      )}

      {assessment && (
        <SurfaceCard>
          <View style={styles.headerRow}>
            <View style={styles.titleGroup}>
              <Sparkles size={18} color={palette.primary} />
              <View style={styles.titleTextWrap}>
                <Text style={[styles.title, { color: palette.textPrimary }]}>
                  AI Health & Condition Assessment
                </Text>
                <Text style={[styles.meta, { color: palette.textSecondary }]}>
                  Analyzed photo + {plantEntries.length} care logs • Adjusted
                  water cycle: {assessment.adjustedWateringIntervalDays}d
                </Text>
              </View>
            </View>

            <Chip
              label="Re-Analyze"
              variant="primarySoft"
              size="md"
              loading={isRescanning}
              onPress={handleInstantAiRescan}
              style={styles.rescanChip}
            />
          </View>

          {(assessment.succulentGuardrailApplied ||
            plant.species.baselineCare.succulentGuardrails
              .isSucculentOrCactus) && (
            <View
              style={[
                styles.guardrailCallout,
                {
                  backgroundColor: palette.attentionBg,
                  borderColor: palette.attentionBorder,
                },
              ]}>
              <ShieldAlert size={16} color={palette.attentionText} />
              <Text
                style={[
                  styles.guardrailText,
                  { color: palette.attentionText },
                ]}>
                {assessment.succulentGuardrailApplied ??
                  plant.species.baselineCare.succulentGuardrails.rotWarningNote}
              </Text>
            </View>
          )}

          <Text style={[styles.diagnosisBody, { color: palette.textPrimary }]}>
            {assessment.diagnosisSummary}
          </Text>

          {assessment.detectedSymptoms.length > 0 && (
            <SurfaceCard variant="nested">
              <Text style={[styles.eyebrow, { color: palette.textSecondary }]}>
                DETECTED INDICATORS
              </Text>
              {assessment.detectedSymptoms.map((sym, idx) => (
                <Text
                  key={idx}
                  style={[styles.symptomBullet, { color: palette.textPrimary }]}>
                  • {sym}
                </Text>
              ))}
            </SurfaceCard>
          )}

          <View style={styles.actionsSection}>
            <View style={styles.actionsHeaderRow}>
              <Text style={[styles.eyebrow, { color: palette.textSecondary }]}>
                ACTIONABLE NEXT STEPS (TAP TO CHECK OFF)
              </Text>
              <Text style={[styles.actionsCounter, { color: palette.primary }]}>
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
                    styles.actionCard,
                    {
                      backgroundColor: action.completed
                        ? palette.primarySoft
                        : palette.bgPrimary,
                      borderColor: action.completed
                        ? palette.primaryBorder
                        : palette.borderSubtle,
                    },
                    pressed && { opacity: 0.85 },
                  ]}>
                  {action.completed ? (
                    <CheckSquare size={20} color={palette.primary} />
                  ) : (
                    <Square size={20} color={palette.textSecondary} />
                  )}

                  <View style={styles.actionTextCol}>
                    <View style={styles.actionTopLine}>
                      <View
                        style={[
                          styles.urgencyBadge,
                          {
                            backgroundColor: urg.bg,
                            borderColor: urg.border,
                          },
                        ]}>
                        <Text
                          style={[styles.urgencyText, { color: urg.text }]}>
                          {urg.label}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={[
                        styles.actionInstruction,
                        {
                          color: action.completed
                            ? palette.textSecondary
                            : palette.textPrimary,
                        },
                        action.completed && styles.actionInstructionDone,
                      ]}>
                      {action.instruction}
                    </Text>

                    {Boolean(action.rationale) && (
                      <Text
                        style={[
                          styles.actionRationale,
                          { color: palette.textSecondary },
                        ]}>
                        Why: {action.rationale}
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {assessment.followUpQuestions.length > 0 && (
            <View
              style={[
                styles.followUpBox,
                { backgroundColor: palette.bgSubtle },
              ]}>
              <View style={styles.followUpTitleRow}>
                <HelpCircle size={14} color={palette.primary} />
                <Text style={[styles.followUpTitle, { color: palette.primary }]}>
                  Botanical Follow-Up Checks
                </Text>
              </View>

              {assessment.followUpQuestions.map((q, idx) => {
                const answer = state.followUpAnswers[idx] ?? '';
                return (
                  <View
                    key={idx}
                    style={[styles.followUpItem, idx > 0 && { marginTop: 6 }]}>
                    <Text
                      style={[
                        styles.followUpQuestion,
                        { color: palette.textSecondary },
                      ]}>
                      • {q}
                    </Text>
                    <View style={styles.followUpChipsRow}>
                      {QUICK_FOLLOW_UP_CHIPS.map((chip) => {
                        const selected = answer === chip;
                        return (
                          <Chip
                            key={chip}
                            label={chip}
                            selected={selected}
                            selectedStyle="solid"
                            onPress={() => {
                              triggerLightHaptic();
                              dispatch({
                                type: 'SET_FOLLOW_UP',
                                index: idx,
                                value: selected ? '' : chip,
                              });
                            }}
                          />
                        );
                      })}
                    </View>
                    <BotanicalInput
                      value={answer}
                      onChangeText={(value) =>
                        dispatch({ type: 'SET_FOLLOW_UP', index: idx, value })
                      }
                      placeholder="Or type a short observation..."
                    />
                  </View>
                );
              })}

              <Pressable
                onPress={handleRefineWithFollowUps}
                disabled={isRefiningDiagnosis}
                style={({ pressed }) => [
                  styles.refineBtn,
                  { backgroundColor: palette.primary },
                  pressed && { opacity: 0.85 },
                  isRefiningDiagnosis && { opacity: 0.65 },
                ]}>
                {isRefiningDiagnosis ? (
                  <ActivityIndicator size="small" color={palette.textInverse} />
                ) : (
                  <Sparkles size={14} color={palette.textInverse} />
                )}
                <Text
                  style={[styles.refineBtnText, { color: palette.textInverse }]}>
                  {isRefiningDiagnosis
                    ? 'Refining Diagnosis...'
                    : 'Refine Diagnosis with Answers'}
                </Text>
              </Pressable>
            </View>
          )}

          {plantAssessments.length > 0 && (
            <View
              style={[
                styles.historyContainer,
                { borderTopColor: palette.borderSubtle },
              ]}>
              <Pressable
                onPress={() => {
                  triggerLightHaptic();
                  dispatch({ type: 'TOGGLE_HISTORY' });
                }}
                style={styles.historyToggleRow}>
                <View style={styles.historyToggleTitleRow}>
                  <History size={14} color={palette.textSecondary} />
                  <Text
                    style={[
                      styles.historyToggleText,
                      { color: palette.textSecondary },
                    ]}>
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
                    <SurfaceCard
                      key={hist.id}
                      variant="nested"
                      style={styles.historyCard}>
                      <View style={styles.historyCardHeader}>
                        <Text
                          style={[
                            styles.historyCardBadgeText,
                            { color: histBadge.text },
                          ]}>
                          {histBadge.label} · every{' '}
                          {hist.adjustedWateringIntervalDays}d
                        </Text>
                        <Text
                          style={[
                            styles.historyCardDate,
                            { color: palette.textMuted },
                          ]}>
                          {new Date(hist.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.historyCardSummary,
                          { color: palette.textSecondary },
                        ]}>
                        {hist.diagnosisSummary}
                      </Text>
                    </SurfaceCard>
                  );
                })}
            </View>
          )}
        </SurfaceCard>
      )}

      <AiLimitModal
        visible={Boolean(state.limitModalQuota)}
        quota={state.limitModalQuota}
        onClose={() => dispatch({ type: 'DISMISS_LIMIT_MODAL' })}
      />
    </>
  );
}

const styles = StyleSheet.create({
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: BorderWidth.hairline,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  titleGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  titleTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  meta: {
    ...Typography.caption,
  },
  rescanChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  guardrailCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    borderWidth: BorderWidth.hairline,
    padding: 11,
    borderRadius: Radius.md,
  },
  guardrailText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  diagnosisBody: {
    ...Typography.body,
    lineHeight: 21,
  },
  eyebrow: {
    ...Typography.eyebrow,
    letterSpacing: 0.6,
  },
  symptomBullet: {
    fontSize: 13,
    lineHeight: 19,
  },
  actionsSection: {
    gap: Spacing.sm,
  },
  actionsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionsCounter: {
    ...Typography.caption,
    fontWeight: '700',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: BorderWidth.hairline,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  actionTextCol: {
    flex: 1,
    gap: Spacing.xs,
  },
  actionTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  urgencyBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: BorderWidth.hairline,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  actionInstruction: {
    ...Typography.body,
    fontWeight: '600',
  },
  actionInstructionDone: {
    textDecorationLine: 'line-through',
  },
  actionRationale: {
    ...Typography.caption,
  },
  followUpBox: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  followUpTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  followUpTitle: {
    ...Typography.caption,
    fontWeight: '700',
  },
  followUpItem: {
    gap: 6,
  },
  followUpQuestion: {
    fontSize: 12,
    lineHeight: 18,
  },
  followUpChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  refineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 6,
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  refineBtnText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  historyContainer: {
    borderTopWidth: BorderWidth.hairline,
    paddingTop: 10,
    gap: Spacing.sm,
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
    ...Typography.caption,
    fontWeight: '700',
  },
  historyCard: {
    padding: 10,
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
  },
  historyCardSummary: {
    fontSize: 12,
    lineHeight: 17,
  },
});
