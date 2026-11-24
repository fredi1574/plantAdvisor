import { CheckSquare, Sparkles, Square } from 'lucide-react-native';
import { useReducer } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  LinearTransition,
  useReducedMotion,
} from 'react-native-reanimated';

import { AiLimitModal } from '@/components/modals/ai-limit-modal';
import { DiagnosisFollowUpBox } from '@/components/plant-detail/diagnosis-follow-up-box';
import { ScanHistoryDrawer } from '@/components/plant-detail/scan-history-drawer';
import { SpringPressable } from '@/components/ui/animated-wrappers';
import { AiScanShimmerCard } from '@/components/ui/botanical-shimmer';
import { Chip } from '@/components/ui/chip';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import {
  SucculentGuardrailBanner,
  UrgencyBadge,
} from '@/components/ui/status-badges';
import { SurfaceCard } from '@/components/ui/surface-card';
import { BorderWidth, Radius, Spacing, Typography } from '@/constants/theme';
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
  const { t } = useTranslation();
  const palette = usePalette();
  const reducedMotion = useReducedMotion();
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
      onShowToast(t('plantDetail.healthCard.refreshedToast'));
    } catch (err) {
      if (err instanceof AiQuotaExceededError) {
        dispatch({ type: 'QUOTA_EXCEEDED', quota: err.quota });
      } else {
        dispatch({
          type: 'FINISH_ERROR',
          error:
            err instanceof Error
              ? err.message
              : t('plantDetail.healthCard.scanError'),
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
      onShowToast(t('plantDetail.healthCard.followUpEmptyToast'));
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
      onShowToast(t('plantDetail.healthCard.refinedToast'));
    } catch (err) {
      if (err instanceof AiQuotaExceededError) {
        dispatch({ type: 'QUOTA_EXCEEDED', quota: err.quota });
      } else {
        dispatch({
          type: 'FINISH_ERROR',
          error:
            err instanceof Error
              ? err.message
              : t('plantDetail.healthCard.refineError'),
        });
      }
    }
  };

  const guardrailNote =
    assessment?.succulentGuardrailApplied ??
    (plant.species.baselineCare.succulentGuardrails.isSucculentOrCactus
      ? plant.species.baselineCare.succulentGuardrails.rotWarningNote
      : null);

  return (
    <>
      <FeedbackBanner message={state.error} variant="error" />

      {assessment && (
        <SurfaceCard>
          <View style={styles.headerRow}>
            <View style={styles.titleGroup}>
              <Sparkles size={18} color={palette.primary} />
              <View style={styles.titleTextWrap}>
                <Text style={[styles.title, { color: palette.textPrimary }]}>
                  {t('plantDetail.healthCard.title')}
                </Text>
                <Text style={[styles.meta, { color: palette.textSecondary }]}>
                  {t('plantDetail.healthCard.meta', {
                    count: plantEntries.length,
                    days: assessment.adjustedWateringIntervalDays,
                  })}
                </Text>
              </View>
            </View>

            <Chip
              label={t('plantDetail.healthCard.reanalyze')}
              variant="primarySoft"
              size="md"
              loading={isRescanning}
              onPress={() => void handleInstantAiRescan()}
              style={styles.rescanChip}
            />
          </View>

          {(isRescanning || isRefiningDiagnosis) && (
            <AiScanShimmerCard mode="diagnose" />
          )}

          {guardrailNote ? (
            <SucculentGuardrailBanner message={guardrailNote} />
          ) : null}

          <Text style={[styles.diagnosisBody, { color: palette.textPrimary }]}>
            {assessment.diagnosisSummary}
          </Text>

          {assessment.detectedSymptoms.length > 0 && (
            <SurfaceCard variant="nested">
              <Text style={[styles.eyebrow, { color: palette.textSecondary }]}>
                {t('plantDetail.healthCard.detectedIndicators')}
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
                {t('plantDetail.healthCard.nextStepsEyebrow')}
              </Text>
              <Text style={[styles.actionsCounter, { color: palette.primary }]}>
                {t('plantDetail.healthCard.doneCounter', {
                  done: assessment.recommendedActions.filter((a) => a.completed)
                    .length,
                  total: assessment.recommendedActions.length,
                })}
              </Text>
            </View>

            {assessment.recommendedActions.map((action) => (
              <Animated.View
                key={action.id}
                layout={
                  reducedMotion
                    ? undefined
                    : LinearTransition.springify().damping(22).stiffness(200)
                }>
                <SpringPressable
                  onPress={() => {
                    triggerLightHaptic();
                    toggleRecommendedAction(plant.id, action.id);
                  }}
                  pressedScale={0.98}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: action.completed }}
                  accessibilityLabel={action.instruction}
                  style={[
                    styles.actionCard,
                    {
                      backgroundColor: action.completed
                        ? palette.primarySoft
                        : palette.bgPrimary,
                      borderColor: action.completed
                        ? palette.primaryBorder
                        : palette.borderSubtle,
                    },
                  ]}>
                  {action.completed ? (
                    <CheckSquare size={20} color={palette.primary} />
                  ) : (
                    <Square size={20} color={palette.textSecondary} />
                  )}

                  <View style={styles.actionTextCol}>
                    <View style={styles.actionTopLine}>
                      <UrgencyBadge urgency={action.urgency} />
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
                        {t('plantDetail.healthCard.whyPrefix', {
                          rationale: action.rationale,
                        })}
                      </Text>
                    )}
                  </View>
                </SpringPressable>
              </Animated.View>
            ))}
          </View>

          <DiagnosisFollowUpBox
            questions={assessment.followUpQuestions}
            answers={state.followUpAnswers}
            isRefining={isRefiningDiagnosis}
            onChangeAnswer={(index, value) =>
              dispatch({ type: 'SET_FOLLOW_UP', index, value })
            }
            onRefine={() => void handleRefineWithFollowUps()}
          />

          <ScanHistoryDrawer
            assessments={plantAssessments}
            expanded={state.showScanHistory}
            onToggle={() => dispatch({ type: 'TOGGLE_HISTORY' })}
          />
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
});
